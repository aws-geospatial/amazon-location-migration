// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CalculateRouteCarModeOptions,
  CalculateRouteMatrixCommand,
  CalculateRouteMatrixRequest,
  LocationClient,
} from "@aws-sdk/client-location";

import { MigrationPlacesService } from "../places";

import { DistanceMatrixElementStatus, DistanceMatrixStatus, TravelMode } from "./defines";
import {
  convertKilometersToGoogleDistanceText,
  formatSecondsAsGoogleDurationText,
  parseOrFindLocations,
} from "./helpers";

// formatted_address needed for originAddresses and destinationAddresses
const DISTANCE_MATRIX_FIND_LOCATION_FIELDS = ["geometry", "formatted_address"];
const KILOMETERS_TO_METERS_CONSTANT = 1000;

export class MigrationDistanceMatrixService {
  // This will be populated by the top level module
  // that creates our location client
  _client: LocationClient;

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
              const input: CalculateRouteMatrixRequest = {
                CalculatorName: this._routeCalculatorName, // required
                DeparturePositions: originsResponse.map((originResponse) => originResponse.position), // required
                DestinationPositions: destinationsResponse.map((destinationResponse) => destinationResponse.position), // required
              };

              if ("travelMode" in request) {
                switch (request.travelMode) {
                  case TravelMode.DRIVING: {
                    input.TravelMode = "Car";
                    break;
                  }
                  case TravelMode.WALKING: {
                    input.TravelMode = "Walking";
                    break;
                  }
                }
              }

              // only pass in avoidFerries and avoidTolls options if travel mode is Driving, Amazon Location Client will error out
              // if CarModeOptions is passed in and travel mode is not Driving
              if (
                ("avoidFerries" in request || "avoidTolls" in request) &&
                "travelMode" in request &&
                request.travelMode == TravelMode.DRIVING
              ) {
                const carModeOptions: CalculateRouteCarModeOptions = {};
                if ("avoidFerries" in request) {
                  carModeOptions.AvoidFerries = request.avoidFerries;
                }
                if ("avoidTolls" in request) {
                  carModeOptions.AvoidTolls = request.avoidTolls;
                }
                input.CarModeOptions = carModeOptions;
              }

              if ("drivingOptions" in request && request.travelMode == TravelMode.DRIVING) {
                input.DepartureTime = request.drivingOptions.departureTime;
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
