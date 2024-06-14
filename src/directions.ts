// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CalculateRouteCommand, CalculateRouteRequest, LocationClient } from "@aws-sdk/client-location";

import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "./googleCommon";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationPlacesService } from "./places";

class MigrationDirectionsService {
  // This will be populated by the top level module
  // that creates our location client
  _client: LocationClient;

  // This will be populated by the top level module
  // that is passed our route calculator name
  _routeCalculatorName: string;

  // This will be populated by the top level module
  // that already has a MigrationPlacesService that has
  // been configured with our place index name
  _placesService: MigrationPlacesService;

  route(options) {
    return new Promise((resolve, reject) => {
      // TODO: Rewrite this method using promises (also will need to make a versionof findPlaceFromQuery
      // returns a promise instead of using a callback) so we can handle the other use-case where
      // instead of origin.query the source/destination positions are passed as coordinates
      const originRequest = {
        query: options.origin.query,
        fields: ["geometry"],
      };
      this._placesService.findPlaceFromQuery(originRequest, (results, status) => {
        const originLocation = results[0].geometry.location;
        const departurePosition = [originLocation.lng(), originLocation.lat()];

        // Now get the destination
        const destinationRequest = {
          query: options.destination.query,
          fields: ["geometry"],
        };
        this._placesService.findPlaceFromQuery(destinationRequest, (results, status) => {
          const destinationLocation = results[0].geometry.location;
          const destinationPosition = [destinationLocation.lng(), destinationLocation.lat()];

          const input: CalculateRouteRequest = {
            CalculatorName: this._routeCalculatorName, // required
            DeparturePosition: departurePosition, // required
            DestinationPosition: destinationPosition, // required
            TravelMode: "Car", // FIXME: Convert this from the input options
            IncludeLegGeometry: true,
          };

          const command = new CalculateRouteCommand(input);

          this._client
            .send(command)
            .then((response) => {
              const bounds = response.Summary.RouteBBox;

              const googleLegs = [];
              response.Legs.forEach(function (leg) {
                const steps = [];
                leg.Steps.forEach(function (step) {
                  steps.push({
                    duration: {
                      text: step.DurationSeconds + " seconds", // TODO: Add conversion logic to make this seconds/minutes/hours
                      value: step.DurationSeconds,
                    },
                    start_location: new MigrationLatLng(step.StartPosition[1], step.StartPosition[0]),
                    end_location: new MigrationLatLng(step.EndPosition[1], step.EndPosition[0]),
                  });
                });

                googleLegs.push({
                  geometry: leg.Geometry,
                  steps: steps,
                  start_location: originLocation,
                  end_location: destinationLocation,
                });
              });

              const googleRoute = {
                bounds: new MigrationLatLngBounds(
                  {
                    lng: bounds[0],
                    lat: bounds[1],
                  },
                  {
                    lng: bounds[2],
                    lat: bounds[3],
                  },
                ),
                legs: googleLegs,
              };

              const googleResponse = {
                geocoded_waypoints: [], // TODO: Fill these out if the source/destination were passed as queries
                request: options,
                routes: [googleRoute],
                status: DirectionsStatus.OK,
              };

              resolve(googleResponse);
            })
            .catch((error) => {
              console.error(error);

              reject({
                status: DirectionsStatus.UNKNOWN_ERROR,
              });
            });
        });
      });
    });
  }
}

class MigrationDirectionsRenderer {
  #directions;
  #markers: MigrationMarker[];
  #map: MigrationMap;
  #markerOptions;
  #polylineOptions;
  #preserveViewport = false;
  #suppressMarkers = false;
  #suppressPolylines = false;
  #directionsChangedHandler;

  constructor(options?) {
    this.#markers = [];

    this.setOptions(options);
  }

  addListener(eventName, handler) {
    if (eventName == "directions_changed") {
      this.#directionsChangedHandler = handler;
    }
  }

  getDirections() {
    return this.#directions;
  }

  getMap() {
    return this.#map;
  }

  setMap(map) {
    this.#map = map;
  }

  setDirections(directions) {
    // TODO: Currently only support one route for directions
    if (directions.routes.length !== 1) {
      return;
    }

    this.#directions = directions;

    const maplibreMap = this.#map._getMap();

    // First, remove any pre-existing drawn route and its markers
    if (this.#markers.length) {
      maplibreMap.removeLayer("route");
      maplibreMap.removeSource("route");

      this.#markers.forEach(function (marker) {
        marker.remove();
      });
      this.#markers = [];
    }

    const route = directions.routes[0];

    // Adjust the map to fit to the bounds for this route if preserveViewport option is not set to true
    if (this.#preserveViewport === false) {
      const boundsPaddingInPixels = 100;
      this.#map.fitBounds(route.bounds, boundsPaddingInPixels);
    }

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[0];

      // leg.geometry is a new field we've added, because Google doesn't provide the polyline
      // for the leg as a whole, only for the individual steps, but our API (currently) only provides
      // a polyline for the entire leg.
      const geometry = leg.geometry;

      // TODO: Detect geometry type instead of just doing LineString
      if (this.#suppressPolylines === false) {
        maplibreMap.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: geometry.LineString,
            },
          },
        });
        // 8 weight, 0.5 opacity, "#73B9FF" color for default, 3 weight, 1 opacity, "Black" color used when one property is set
        const paintOptions = {};
        if (this.#polylineOptions) {
          paintOptions["line-color"] = this.#polylineOptions.strokeColor ? this.#polylineOptions.strokeColor : "Black";
          paintOptions["line-width"] = this.#polylineOptions.strokeWeight ? this.#polylineOptions.strokeWeight : 3;
          paintOptions["line-opacity"] = this.#polylineOptions.strokeOpacity ? this.#polylineOptions.strokeOpacity : 1;
        } else {
          // default line
          paintOptions["line-color"] = "#73B9FF";
          paintOptions["line-width"] = 8;
          paintOptions["line-opacity"] = 0.5;
        }

        maplibreMap.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: this.#polylineOptions && this.#polylineOptions.visible == false ? "none" : "visible",
          },
          paint: paintOptions,
        });
      }

      // Add markers for the start/end locations
      if (this.#suppressMarkers === false) {
        const startLocation = leg.start_location;
        const endLocation = leg.end_location;

        const startMarkerOptions =
          this.#markerOptions === undefined ? { label: "A" } : structuredClone(this.#markerOptions);
        startMarkerOptions.position = startLocation;
        startMarkerOptions.map = this.#map;
        const startMarker = new MigrationMarker(startMarkerOptions);
        this.#markers.push(startMarker);

        const endMarkerOptions =
          this.#markerOptions === undefined ? { label: "B" } : structuredClone(this.#markerOptions);
        endMarkerOptions.position = endLocation;
        endMarkerOptions.map = this.#map;
        const endMarker = new MigrationMarker(endMarkerOptions);
        this.#markers.push(endMarker);
      }

      if (typeof this.#directionsChangedHandler === "function") {
        this.#directionsChangedHandler();
      }

      // TODO: Add default info windows once location information is passed into route result
    }
  }

  setOptions(options?) {
    if (options !== undefined && "map" in options) {
      this.setMap(options.map);
    }

    if (options !== undefined && "markerOptions" in options) {
      this.#markerOptions = options.markerOptions;
    }

    if (options !== undefined && "preserveViewport" in options) {
      this.#preserveViewport = options.preserveViewport;
    }

    if (options !== undefined && "directions" in options) {
      this.setDirections(options.directions);
    }

    if (options !== undefined && "suppressMarkers" in options) {
      this.#suppressMarkers = options.suppressMarkers;
    }

    if (options !== undefined && "suppressPolylines" in options) {
      this.#suppressPolylines = options.suppressPolylines;
    }

    if (options !== undefined && "polylineOptions" in options) {
      this.#polylineOptions = options.polylineOptions;
    }
  }

  _getMarkers() {
    return this.#markers;
  }

  _getMarkerOptions() {
    return this.#markerOptions;
  }

  _getPreserveViewport() {
    return this.#preserveViewport;
  }

  _getSuppressMarkers() {
    return this.#suppressMarkers;
  }

  _getSuppressPolylines() {
    return this.#suppressPolylines;
  }
}

export { MigrationDirectionsService, MigrationDirectionsRenderer };
