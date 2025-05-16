// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoRoutesClient,
  CalculateRoutesCommand,
  CalculateRoutesRequest,
  CalculateRoutesResponse,
  GeometryFormat,
  RouteLegAdditionalFeature,
  RoutePedestrianTravelStep,
  RouteTravelMode,
  RouteVehicleTravelStep,
} from "@aws-sdk/client-geo-routes";

import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "../common";
import { TravelMode } from "./defines";
import { MigrationPlacesService } from "../places";
import {
  convertKilometersToGoogleDistanceText,
  formatSecondsAsGoogleDurationText,
  parseOrFindLocation,
  parseOrFindLocations,
  ParseOrFindLocationResponse,
} from "./helpers";

const KILOMETERS_TO_METERS_CONSTANT = 1000;
// place_id and types needed for geocoded_waypoints response property, formatted_address needed for leg start_address and end_address
const ROUTE_FIND_LOCATION_FIELDS = ["geometry", "place_id", "types", "formatted_address"];

export class MigrationDirectionsService {
  // This will be populated by the top level module
  // that creates our GeoRoutes client
  _client: GeoRoutesClient;

  // This will be populated by the top level module
  // that already has a MigrationPlacesService that has
  // been configured
  _placesService: MigrationPlacesService;

  route(options: google.maps.DirectionsRequest, callback?) {
    return new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      parseOrFindLocation(options.origin, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
        .then((originResponse: ParseOrFindLocationResponse) => {
          const departurePosition = originResponse.position;

          parseOrFindLocation(options.destination, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
            .then((destinationResponse: ParseOrFindLocationResponse) => {
              const destinationPosition = destinationResponse.position;

              const input: CalculateRoutesRequest = {
                Origin: departurePosition, // required
                Destination: destinationPosition, // required
                LegGeometryFormat: GeometryFormat.SIMPLE,
                LegAdditionalFeatures: [
                  RouteLegAdditionalFeature.SUMMARY,
                  RouteLegAdditionalFeature.TRAVEL_STEP_INSTRUCTIONS,
                  RouteLegAdditionalFeature.TYPICAL_DURATION,
                ],
              };

              if ("travelMode" in options) {
                switch (options.travelMode) {
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

              if ("avoidFerries" in options) {
                input.Avoid = {
                  Ferries: options.avoidFerries,
                };
              }

              if ("avoidTolls" in options) {
                // Create Avoid sub-object if it doesn't exist already
                input.Avoid ??= {};

                input.Avoid.TollRoads = options.avoidTolls;
                input.Avoid.TollTransponders = options.avoidTolls;
              }

              if (options.drivingOptions?.departureTime) {
                input.DepartureTime = options.drivingOptions.departureTime.toISOString();
              }

              if ("waypoints" in options) {
                // Array of DirectionsWaypoint
                parseOrFindLocations(
                  options.waypoints.map((waypoint) => waypoint.location),
                  this._placesService,
                  ROUTE_FIND_LOCATION_FIELDS,
                )
                  .then((waypointResponses) => {
                    input.Waypoints = waypointResponses.map((locationResponse, index) => {
                      const googleWaypoint = options.waypoints[index];
                      const stopover = googleWaypoint.stopover ?? true; // Google treats each waypoint as a stop by default
                      return {
                        Position: locationResponse.position,
                        PassThrough: !stopover,
                      };
                    });

                    const command = new CalculateRoutesCommand(input);

                    this._client
                      .send(command)
                      .then((response) => {
                        const googleResponse = this._convertAmazonResponseToGoogleResponse(
                          response,
                          options,
                          originResponse,
                          destinationResponse,
                          waypointResponses,
                        );

                        // if a callback was given, invoke it before resolving the promise
                        if (callback) {
                          callback(googleResponse, DirectionsStatus.OK);
                        }

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
              } else {
                const command = new CalculateRoutesCommand(input);

                this._client
                  .send(command)
                  .then((response) => {
                    const googleResponse = this._convertAmazonResponseToGoogleResponse(
                      response,
                      options,
                      originResponse,
                      destinationResponse,
                    );

                    // if a callback was given, invoke it before resolving the promise
                    if (callback) {
                      callback(googleResponse, DirectionsStatus.OK);
                    }

                    resolve(googleResponse);
                  })
                  .catch((error) => {
                    console.error(error);

                    reject({
                      status: DirectionsStatus.UNKNOWN_ERROR,
                    });
                  });
              }
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

  _convertAmazonResponseToGoogleResponse(
    response: CalculateRoutesResponse,
    options,
    originResponse,
    destinationResponse,
    waypointResponses?,
  ) {
    const googleRoutes: google.maps.DirectionsRoute[] = [];
    response.Routes.forEach((route) => {
      let bounds = new MigrationLatLngBounds();
      const googleLegs = [];
      route.Legs.forEach((leg) => {
        const legGeometry = leg.Geometry.LineString;
        const googleSteps: google.maps.DirectionsStep[] = [];
        const legDetails = leg.VehicleLegDetails || leg.PedestrianLegDetails; // We currently only support vehicle or walking routes
        const steps = legDetails.TravelSteps;
        const numSteps = steps.length;
        steps.forEach((step: RouteVehicleTravelStep | RoutePedestrianTravelStep, stepIndex) => {
          // Retrieve the start and end locations for each step from the leg geometry:
          //    For every step before the final step, the end position is the next step's starting position
          //    For the the final step, the end position is the last position in the leg geometry
          const geometryOffset = step.GeometryOffset;
          const startPosition = legGeometry[geometryOffset];
          const startLocation = new MigrationLatLng(startPosition[1], startPosition[0]);
          const nextStepIndex = stepIndex + 1;
          const endPosition =
            nextStepIndex < numSteps ? legGeometry[steps[nextStepIndex].GeometryOffset] : legGeometry.at(-1);
          const endLocation = new MigrationLatLng(endPosition[1], endPosition[0]);

          googleSteps.push({
            distance: {
              // we do not support Google's behavior of using the unit system of the country of origin and so we will use
              // Amazon Location's default unit system of kilometers if the unit system option is not specified
              text: convertKilometersToGoogleDistanceText(step.Distance, options),
              value: step.Distance * KILOMETERS_TO_METERS_CONSTANT, // in meters, multiply km by 1000
            },
            duration: {
              text: formatSecondsAsGoogleDurationText(step.Duration),
              value: step.Duration,
            },
            start_location: startLocation,
            start_point: startLocation,
            end_location: endLocation,
            end_point: endLocation,
            travel_mode: options.travelMode, // TODO: For now assume the same travelMode for the request, but steps could have different individual modes
            // TODO: These are not currently supported, but are required in the response
            encoded_lat_lngs: "",
            instructions: "",
            maneuver: "",
            path: [],
            lat_lngs: [],
          });
        });

        // Extend the bounds for all legs in this route to cover all of the geometry coordinates
        bounds = legGeometry.reduce((bounds, coord) => {
          return bounds.extend({ lat: coord[1], lng: coord[0] });
        }, bounds);

        const legOverview = legDetails.Summary.Overview;
        googleLegs.push({
          distance: {
            // we do not support Google's behavior of using the unit system of the country of origin and so we will use
            // Amazon Location's default unit system of kilometers if the unit system option is not specified
            text: convertKilometersToGoogleDistanceText(legOverview.Distance, options),
            value: legOverview.Distance * KILOMETERS_TO_METERS_CONSTANT, // in meters, multiply km by 1000
          },
          duration: {
            text: formatSecondsAsGoogleDurationText(legOverview.Duration),
            value: legOverview.Duration,
          },
          geometry: leg.Geometry,
          steps: googleSteps,
          start_location: new MigrationLatLng(
            leg.VehicleLegDetails.Departure.Place.Position[1],
            leg.VehicleLegDetails.Departure.Place.Position[0],
          ), // start_location of leg, not entire route
          end_location: new MigrationLatLng(
            leg.VehicleLegDetails.Arrival.Place.Position[1],
            leg.VehicleLegDetails.Arrival.Place.Position[0],
          ), // end_location of leg, not entire route
          start_address: originResponse.formatted_address,
          end_address: destinationResponse.formatted_address,
        });
      });

      const googleRoute: google.maps.DirectionsRoute = {
        bounds: bounds,
        legs: googleLegs,
        // TODO: These are not currently supported, but are required in the response
        copyrights: "",
        overview_path: [],
        overview_polyline: "",
        summary: "",
        warnings: [],
        waypoint_order: [],
      };

      googleRoutes.push(googleRoute);
    });

    const googleResponse: google.maps.DirectionsResult = {
      request: options,
      routes: googleRoutes,
    };

    // add geocoded waypoints if the data is available
    const geocodedWaypoints =
      waypointResponses != null
        ? this._constructGeocodedWaypointsFromResponses(originResponse, destinationResponse, waypointResponses)
        : this._constructGeocodedWaypointsFromResponses(originResponse, destinationResponse);
    if (geocodedWaypoints != null) {
      googleResponse["geocoded_waypoints"] = geocodedWaypoints;
    }

    return googleResponse;
  }

  _constructGeocodedWaypointsFromResponses(
    originResponse,
    destinationResponse,
    waypointResponses?,
  ): google.maps.DirectionsGeocodedWaypoint[] {
    const geocodedWaypoints = [];

    // add origin geocoded waypoint
    const originGeocodedWaypoint = this._constructGeocodedWaypoint(originResponse);
    if (originGeocodedWaypoint != null) {
      geocodedWaypoints.push(originGeocodedWaypoint);
    }

    // add geocoded waypoints
    if (waypointResponses != null) {
      waypointResponses.forEach((waypointResponse) => {
        const geocodedWaypoint = this._constructGeocodedWaypoint(waypointResponse);
        if (geocodedWaypoint != null) {
          geocodedWaypoints.push(geocodedWaypoint);
        }
      });
    }

    // add destination geocoded waypoint
    const destinationGeocodedWaypoint = this._constructGeocodedWaypoint(destinationResponse);
    if (destinationGeocodedWaypoint != null) {
      geocodedWaypoints.push(destinationGeocodedWaypoint);
    }

    // if there are no geocodedWaypoints then return null
    return geocodedWaypoints.length == 0 ? null : geocodedWaypoints;
  }

  _constructGeocodedWaypoint(locationResponse) {
    const geocodedWaypoint = {};
    if (locationResponse.place_id != null) {
      geocodedWaypoint["place_id"] = locationResponse.place_id;
    }
    if (locationResponse.types != null) {
      geocodedWaypoint["types"] = locationResponse.types;
    }
    geocodedWaypoint["geocoder_status"] = DirectionsStatus.OK;
    return "place_id" in geocodedWaypoint || "types" in geocodedWaypoint ? geocodedWaypoint : null;
  }
}
