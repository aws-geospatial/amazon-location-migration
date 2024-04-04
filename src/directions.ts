// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CalculateRouteCommand, CalculateRouteRequest, LocationClient } from "@aws-sdk/client-location";

import { DirectionsStatus, GoogleLatLng, GoogleLatLngBounds } from "./googleCommon";
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
                    start_location: GoogleLatLng(step.StartPosition[1], step.StartPosition[0]),
                    end_location: GoogleLatLng(step.EndPosition[1], step.EndPosition[0]),
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
                bounds: GoogleLatLngBounds(
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
  _markers: MigrationMarker[];
  _map: MigrationMap;

  constructor() {
    this._markers = [];
  }

  setMap(map) {
    this._map = map;
  }

  setDirections(directions) {
    // TODO: Currently only support one route for directions
    if (directions.routes.length !== 1) {
      return;
    }

    const maplibreMap = this._map._getMap();

    // First, remove any pre-existing drawn route and its markers
    if (this._markers.length) {
      maplibreMap.removeLayer("route");
      maplibreMap.removeSource("route");

      this._markers.forEach(function (marker) {
        marker.remove();
      });
      this._markers = [];
    }

    const route = directions.routes[0];

    // Adjust the map to fit to the bounds for this route
    this._map.fitBounds(route.bounds);

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[0];

      // leg.geometry is a new field we've added, because Google doesn't provide the polyline
      // for the leg as a whole, only for the individual steps, but our API (currently) only provides
      // a polyline for the entire leg.
      const geometry = leg.geometry;

      // TODO: Detect geometry type instead of just doing LineString
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
      maplibreMap.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#73B9FF",
          "line-width": 8,
          "line-opacity": 0.5,
        },
      });

      // Add markers for the start/end locations
      const startLocation = leg.start_location;
      const endLocation = leg.end_location;
      const startMarker = new MigrationMarker({
        position: startLocation,
        map: this._map,
      });
      this._markers.push(startMarker);

      const endMarker = new MigrationMarker({
        position: endLocation,
        map: this._map,
      });
      this._markers.push(endMarker);
    }
  }
}

export { MigrationDirectionsService, MigrationDirectionsRenderer };
