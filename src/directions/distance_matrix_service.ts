// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoRoutesClient,
  RouteMatrixOrigin,
  RouteMatrixDestination,
  CalculateRouteMatrixCommand,
  CalculateRouteMatrixRequest,
} from "@aws-sdk/client-geo-routes";

import { MigrationPlacesService } from "../places";

import { DistanceMatrixElementStatus, DistanceMatrixStatus } from "./defines";
import {
  formatDistanceBasedOnUnitSystem,
  formatSecondsAsGoogleDurationText,
  parseOrFindLocations,
  populateAvoidOptions,
  populateTravelModeOption,
  getReverseGeocodedAddresses,
  getUnitSystem,
  ParseOrFindLocationResponse,
} from "./helpers";

import { createBoundsFromPositions } from "../common";
import { LngLat } from "maplibre-gl";

// formatted_address needed for originAddresses and destinationAddresses
const DISTANCE_MATRIX_FIND_LOCATION_FIELDS = ["geometry", "formatted_address"];

export class MigrationDistanceMatrixService {
  _client: GeoRoutesClient;

  // This will be populated by the top level module
  _placesService: MigrationPlacesService;

  getDistanceMatrix(request: google.maps.DistanceMatrixRequest, callback?) {
    return new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      parseOrFindLocations(request.origins, this._placesService, DISTANCE_MATRIX_FIND_LOCATION_FIELDS)
        .then((originsResponse: ParseOrFindLocationResponse[]) => {
          parseOrFindLocations(request.destinations, this._placesService, DISTANCE_MATRIX_FIND_LOCATION_FIELDS)
            .then((destinationsResponse) => {
              // Map origins and destinations
              const origins: RouteMatrixOrigin[] = originsResponse.map((origin) => ({
                Position: origin.position,
              }));

              const destinations: RouteMatrixDestination[] = destinationsResponse.map((destination) => ({
                Position: destination.position,
              }));

              // Combine all positions (parseOrFindLocations returns origin.Position and destination.Position
              // in Lng Lat format so we do not need to convert here)
              const allPositions: LngLat[] = [
                ...origins.map((origin) => new LngLat(origin.Position[0], origin.Position[1])),
                ...destinations.map((destination) => new LngLat(destination.Position[0], destination.Position[1])),
              ];

              const input: CalculateRouteMatrixRequest = {
                Origins: origins, // required
                Destinations: destinations, // required
                RoutingBoundary: {
                  // required
                  Geometry: {
                    BoundingBox: createBoundsFromPositions(allPositions),
                  },
                  Unbounded: false,
                },
              };

              // Apply travel mode and avoidance options
              populateTravelModeOption(request, input);
              populateAvoidOptions(request, input);

              // Add departure time if specified
              if (request.drivingOptions?.departureTime) {
                input.DepartureTime = request.drivingOptions.departureTime.toISOString();
              }

              const command = new CalculateRouteMatrixCommand(input);
              this._client
                .send(command)
                .then((response) => {
                  this._convertAmazonResponseToGoogleResponse(
                    response,
                    originsResponse,
                    destinationsResponse,
                    request,
                  ).then((googleResponse) => {
                    // if a callback was given, invoke it before resolving the promise
                    if (callback) {
                      callback(googleResponse, DistanceMatrixStatus.OK);
                    }
                    resolve(googleResponse);
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
    request: google.maps.DistanceMatrixRequest,
  ): Promise<google.maps.DistanceMatrixResponse> {
    return new Promise((resolve) => {
      const unitSystem = getUnitSystem(request, originsResponse[0].position);

      const distanceMatrixResponseRows = calculateRouteMatrixResponse.RouteMatrix.map((row) => ({
        elements: row.map((cell) => ({
          distance: {
            /*
             * Google's Distance.text is based on unit system,
             * whereas Amazon Location's Distance is always in meters,
             * therefore needs to be translated to metric or imperial.
             *
             * Google's Distance.value is always in meters, so is Amazon Locations.
             * therefore no translation is needed.
             */
            text: formatDistanceBasedOnUnitSystem(cell.Distance, unitSystem),
            value: cell.Distance,
          },
          duration: {
            text: formatSecondsAsGoogleDurationText(cell.DurationSeconds),
            value: cell.DurationSeconds,
          },
          status: DistanceMatrixElementStatus.OK,
        })),
      }));

      // Get addresses for origins, then destinations
      Promise.all<string[]>([
        new Promise<string[]>((resolveOrigins) => {
          getReverseGeocodedAddresses(
            this._placesService._client,
            originsResponse.map((origin) => origin.position),
            (originAddresses: string[]) => resolveOrigins(originAddresses),
          );
        }),
        new Promise<string[]>((resolveDestinations) => {
          getReverseGeocodedAddresses(
            this._placesService._client,
            destinationsResponse.map((destination) => destination.position),
            (destinationAddresses: string[]) => resolveDestinations(destinationAddresses),
          );
        }),
      ]).then(([originAddresses, destinationAddresses]) => {
        resolve({
          originAddresses,
          destinationAddresses,
          rows: distanceMatrixResponseRows,
        });
      });
    });
  }
}
