// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CalculateRouteCommand, CalculateRouteRequest, LocationClient } from "@aws-sdk/client-location";

import {
  AddListenerResponse,
  DirectionsStatus,
  LatLngLiteral,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
  TravelMode,
} from "./googleCommon";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationPlacesService } from "./places";

interface ParseOrFindLocationResponse {
  locationLatLng: MigrationLatLng;
  position: [number, number];
}

interface Distance {
  text: string;
  value: number;
}

interface Duration {
  text: string;
  value: number;
}

interface DrivingOptions {
  departureTime: Date;
}

interface DirectionsGeocodedWaypoint {
  partial_match?: boolean;
  place_id?: string;
  types?: string[];
}

interface Place {
  location?: MigrationLatLng | null | LatLngLiteral;
  placeId?: string;
  query?: string;
}

interface DirectionsStep {
  distance?: Distance;
  duration?: Duration;
  encoded_lat_lngs?: string;
  end_location: MigrationLatLng;
  instructions?: string;
  maneuver?: string;
  path?: MigrationLatLng[];
  start_location: MigrationLatLng;
  steps?: DirectionsStep[];
  travel_mode: TravelMode;
}

interface DirectionsLeg {
  distance?: Distance;
  duration?: Duration;
  end_address: string;
  end_location: MigrationLatLng;
  start_address: string;
  start_location: MigrationLatLng;
  steps: DirectionsStep[];
}

interface DirectionsRoute {
  bounds: MigrationLatLngBounds;
  legs: DirectionsLeg[];
}

enum UnitSystem {
  IMPERIAL = 0.0,
  METRIC = 1.0,
}

interface DirectionsWaypoint {
  location?: string | MigrationLatLng | LatLngLiteral | Place;
  stopover?: boolean;
}

interface DirectionsRequest {
  avoidFerries?: boolean;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  destination: string | MigrationLatLng | Place | LatLngLiteral;
  drivingOptions?: DrivingOptions;
  language?: string | null;
  optimizeWaypoints?: boolean;
  origin: string | MigrationLatLng | Place | LatLngLiteral;
  provideRouteAlternatives?: boolean;
  region?: string | null;
  travelMode: TravelMode;
  unitSystem?: UnitSystem;
  waypoints?: DirectionsWaypoint[];
}

interface DirectionsResult {
  geocoded_waypoints?: DirectionsGeocodedWaypoint[];
  request: DirectionsRequest;
  routes: DirectionsRoute[];
  status: DirectionsStatus;
}

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

  route(options: DirectionsRequest) {
    return new Promise<DirectionsResult>((resolve, reject) => {
      this._parseOrFindLocation(options.origin)
        .then((originResponse: ParseOrFindLocationResponse) => {
          const departureLocation = originResponse.locationLatLng;
          const departurePosition = originResponse.position;

          this._parseOrFindLocation(options.destination)
            .then((destinationResponse: ParseOrFindLocationResponse) => {
              const destinationLocation = destinationResponse.locationLatLng;
              const destinationPosition = destinationResponse.position;

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
                    const steps: DirectionsStep[] = [];
                    leg.Steps.forEach(function (step) {
                      steps.push({
                        duration: {
                          text: step.DurationSeconds + " seconds", // TODO: Add conversion logic to make this seconds/minutes/hours
                          value: step.DurationSeconds,
                        },
                        start_location: new MigrationLatLng(step.StartPosition[1], step.StartPosition[0]),
                        end_location: new MigrationLatLng(step.EndPosition[1], step.EndPosition[0]),
                        travel_mode: options.travelMode, // TODO: For now assume the same travelMode for the request, but steps could have different individual modes
                      });
                    });

                    googleLegs.push({
                      geometry: leg.Geometry,
                      steps: steps,
                      start_location: departureLocation,
                      end_location: destinationLocation,
                    });
                  });

                  const googleRoute: DirectionsRoute = {
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

                  const googleResponse: DirectionsResult = {
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
            })
            .catch((error) => {
              console.error(error);

              reject({
                status: DirectionsStatus.UNKNOWN_ERROR,
              });
            });
        })
        .catch((error) => {
          console.error(error);

          reject({
            status: DirectionsStatus.UNKNOWN_ERROR,
          });
        });
    });
  }

  _parseOrFindLocation(locationInput) {
    // The locationInput can be either a string to be geocoded, a Place, LatLng or LatLngLiteral
    // For query or placeId, we will need to perform a request to figure out the location.
    // Otherwise, for LatLng|LatLngLiteral we can just parse it.
    return new Promise((resolve, reject) => {
      // For a query, we use findPlaceFromQuery to retrieve the location
      if (typeof locationInput === "string" || typeof locationInput?.query === "string") {
        const query = locationInput?.query || locationInput;

        const findPlaceFromQueryRequest = {
          query: query,
          fields: ["geometry"],
        };

        this._placesService.findPlaceFromQuery(findPlaceFromQueryRequest, (results, status) => {
          if (status === PlacesServiceStatus.OK && results.length) {
            const locationLatLng = results[0].geometry.location;
            const position = [locationLatLng.lng(), locationLatLng.lat()];

            resolve({
              locationLatLng: locationLatLng,
              position: position,
            });
          } else {
            reject({});
          }
        });
      } else if (typeof locationInput?.placeId === "string") {
        // For a Place object with placeId, we use getDetails to retrieve the location
        const getDetailsRequest = {
          placeId: locationInput.placeId,
        };

        this._placesService.getDetails(getDetailsRequest, function (result, status) {
          if (status === PlacesServiceStatus.OK) {
            const locationLatLng = result.geometry.location;
            const position = [locationLatLng.lng(), locationLatLng.lat()];

            resolve({
              locationLatLng: locationLatLng,
              position: position,
            });
          } else {
            reject({});
          }
        });
      } else {
        // Otherwise, it's a LatLng|LatLngLiteral (explicitly or as Place.location)
        const latLngOrLiteral = locationInput?.location || locationInput;
        const latLng = new MigrationLatLng(latLngOrLiteral);

        resolve({
          locationLatLng: latLng,
          position: [latLng.lng(), latLng.lat()],
        });
      }
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
  #onDirectionsChangedListeners = [];
  #onceDirectionsChangedListeners = [];

  constructor(options?) {
    this.#markers = [];

    this.setOptions(options);
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "directions_changed") {
      // Capitalize the first letter of the listernerType string since MapLibre's method names are
      // 'On' and 'Once', not 'on' and 'once'
      if (typeof listenerType == "string" && listenerType.length > 0) {
        const capitalizedListenerType = listenerType.charAt(0).toUpperCase() + listenerType.slice(1);
        const listener = {
          instance: this,
          eventName: eventName,
          handler: handler,
          listenerType: capitalizedListenerType,
        };
        this[`_get${capitalizedListenerType}DirectionsChangedListeners`]().push(listener);
        return listener;
      }
    }
  }

  getDirections() {
    return this.#directions;
  }

  getMap() {
    return this.#map;
  }

  setMap(map) {
    // If we're being removed from the map, clear the directions first
    if (!map) {
      this._clearDirections();
    }

    this.#map = map;
  }

  setDirections(directions) {
    // TODO: Currently only support one route for directions
    if (directions.routes.length !== 1) {
      return;
    }

    this.#directions = directions;

    if (this.#onDirectionsChangedListeners.length != 0) {
      this.#onDirectionsChangedListeners.forEach((listener) => {
        listener.handler();
      });
    }
    if (this.#onceDirectionsChangedListeners.length != 0) {
      while (this.#onceDirectionsChangedListeners.length > 0) {
        // get handler then call it as a function
        this.#onceDirectionsChangedListeners.pop().handler();
      }
    }

    // First, remove any pre-existing drawn route and its markers
    this._clearDirections();

    const route = directions.routes[0];

    // Adjust the map to fit to the bounds for this route if preserveViewport option is not set to true
    if (this.#preserveViewport === false) {
      const boundsPaddingInPixels = 100;
      this.#map.fitBounds(route.bounds, boundsPaddingInPixels);
    }

    const maplibreMap = this.#map._getMap();
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

  _clearDirections() {
    if (this.#markers.length) {
      const maplibreMap = this.#map._getMap();
      maplibreMap.removeLayer("route");
      maplibreMap.removeSource("route");

      this.#markers.forEach(function (marker) {
        marker.remove();
      });
      this.#markers = [];
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

  _getOnDirectionsChangedListeners() {
    return this.#onDirectionsChangedListeners;
  }

  _getOnceDirectionsChangedListeners() {
    return this.#onceDirectionsChangedListeners;
  }

  _setOnDirectionsChangedListeners(listeners) {
    this.#onDirectionsChangedListeners = listeners;
  }

  _setOnceDirectionsChangedListeners(listeners) {
    this.#onceDirectionsChangedListeners = listeners;
  }
}

export { MigrationDirectionsService, MigrationDirectionsRenderer };
