// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoRoutesClient,
  RouteMatrixOrigin,
  RouteMatrixDestination,
  CalculateRouteMatrixCommand,
  CalculateRouteMatrixRequest,
  RouteTravelMode,
} from "@aws-sdk/client-geo-routes";

import { MigrationPlacesService } from "../places";

import { DistanceMatrixElementStatus, DistanceMatrixStatus, TravelMode } from "./defines";
import {
  convertKilometersToGoogleDistanceText,
  formatSecondsAsGoogleDurationText,
  GoogleToAmazonAvoidanceMapping,
  parseOrFindLocations,
} from "./helpers";
import { createProgressiveBounds } from "../common";

// formatted_address needed for originAddresses and destinationAddresses
const DISTANCE_MATRIX_FIND_LOCATION_FIELDS = ["geometry", "formatted_address"];
const KILOMETERS_TO_METERS_CONSTANT = 1000;

export class MigrationDistanceMatrixService {
  // This will be populated by the top level module
  // that creates our location client
  _client: GeoRoutesClient;

  // This will be populated by the top level module
  // that is passed our route calculator name
  _routeCalculatorName: string;

  // This will be populated by the top level module
  // that already has a MigrationPlacesService that has
  // been configured
  _placesService: MigrationPlacesService;

  getDistanceMatrix(request: google.maps.DistanceMatrixRequest, callback?) {
    return new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      parseOrFindLocations(request.origins, this._placesService, DISTANCE_MATRIX_FIND_LOCATION_FIELDS)
        .then((originsResponse) => {
          parseOrFindLocations(request.destinations, this._placesService, DISTANCE_MATRIX_FIND_LOCATION_FIELDS)
            .then((destinationsResponse) => {

              // Map origins and destinations
              const origins: RouteMatrixOrigin[] = originsResponse.map(origin => ({
                Position: origin.position
              }));

              const destinations: RouteMatrixDestination[] = destinationsResponse.map(destination => ({
                Position: destination.position
              }));

              const input: CalculateRouteMatrixRequest = {
                Origins: origins, // required
                Destinations: destinations,  // required
                RoutingBoundary: { // required
                  Geometry: {
                    BoundingBox: createProgressiveBounds(origins, destinations)
                  },
                  Unbounded: false
                }
              };

              if ("travelMode" in request) {
                switch (request.travelMode) {
                  case TravelMode.DRIVING: {
                    input.TravelMode = RouteTravelMode.CAR;
                    break;
                  }
                  case TravelMode.WALKING: {
                    input.TravelMode = RouteTravelMode.PEDESTRIAN;
                    break;
                  }
                }
              }

              // Add avoidance options if specified
              for (const [requestKey, avoidKeys] of Object.entries(GoogleToAmazonAvoidanceMapping)) {
                if (requestKey in request) {
                  input.Avoid ??= {};
                  for (const avoidKey of avoidKeys) {
                    input.Avoid[avoidKey] = request[requestKey];
                  }
                }
              }

              // Add departure time if specified
              if (request.drivingOptions?.departureTime) {
                input.DepartureTime = request.drivingOptions.departureTime.toISOString();
              }

              const command = new CalculateRouteMatrixCommand(input);
              this._client
                .send(command)
                .then((response) => {
                  const googleResponse = this._convertAmazonResponseToGoogleResponse(
                    response,
                    originsResponse,
                    destinationsResponse,
                    request,
                  );

                  // if a callback was given, invoke it before resolving the promise
                  if (callback) {
                    callback(googleResponse, DistanceMatrixStatus.OK);
                  }

                  resolve(googleResponse);
                })
                .catch((error) => {
                  console.error(error);

                  reject({
                    status: DistanceMatrixStatus.INVALID_REQUEST,
                  });
                });
            })
            .catch((error) => {
              console.error(error);

              reject({
                status: DistanceMatrixStatus.UNKNOWN_ERROR,
              });
            });
        })
        .catch((error) => {
          console.error(error);

          reject({
            status: DistanceMatrixStatus.UNKNOWN_ERROR,
          });
        });
    });
  }

  _convertAmazonResponseToGoogleResponse(
    calculateRouteMatrixResponse,
    originsResponse,
    destinationsResponse,
    request,
  ): google.maps.DistanceMatrixResponse {
    const distanceMatrixResponseRows = [];
    calculateRouteMatrixResponse.RouteMatrix.forEach((row) => {
      const distanceMatrixResponseRow = {
        elements: [],
      };
      row.forEach((cell) => {
        // add element with response data to row
        distanceMatrixResponseRow.elements.push({
          distance: {
            text: convertKilometersToGoogleDistanceText(cell.Distance, request),
            value: cell.Distance * KILOMETERS_TO_METERS_CONSTANT,
          },
          duration: {
            text: formatSecondsAsGoogleDurationText(cell.DurationSeconds),
            value: cell.DurationSeconds,
          },
          status: DistanceMatrixElementStatus.OK,
        });
      });
      distanceMatrixResponseRows.push(distanceMatrixResponseRow);
    });

    // TODO: add destinationAddresses and originAddresses to response using destinationsResponse and originsResponse
    // once PlacesService can reverse geocode (need to retrieve address name for coordinates to add to address arrays)
    const distanceMatrixResponse = {
      originAddresses: [],
      destinationAddresses: [],
      rows: distanceMatrixResponseRows,
    };

    return distanceMatrixResponse;
  }
}
