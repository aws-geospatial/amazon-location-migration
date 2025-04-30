// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CalculateRouteCarModeOptions,
  CalculateRouteCommand,
  CalculateRouteRequest,
  LocationClient,
} from "@aws-sdk/client-location";

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
  // that creates our location client
  _client: LocationClient;

  // This will be populated by the top level module
  // that is passed our route calculator name
  _routeCalculatorName: string;

  // This will be populated by the top level module
  // that already has a MigrationPlacesService that has
  // been configured with our place index name
  _placesService: MigrationPlacesService;

  route(options: google.maps.DirectionsRequest, callback?) {
    return new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      parseOrFindLocation(options.origin, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
        .then((originResponse: ParseOrFindLocationResponse) => {
          const departurePosition = originResponse.position;

          parseOrFindLocation(options.destination, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
            .then((destinationResponse: ParseOrFindLocationResponse) => {
              const destinationPosition = destinationResponse.position;

              const input: CalculateRouteRequest = {
                CalculatorName: this._routeCalculatorName, // required
                DeparturePosition: departurePosition, // required
                DestinationPosition: destinationPosition, // required
                IncludeLegGeometry: true,
              };

              if ("travelMode" in options) {
                switch (options.travelMode) {
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
                ("avoidFerries" in options || "avoidTolls" in options) &&
                "travelMode" in options &&
                options.travelMode == TravelMode.DRIVING
              ) {
                const carModeOptions: CalculateRouteCarModeOptions = {};
                if ("avoidFerries" in options) {
                  carModeOptions.AvoidFerries = options.avoidFerries;
                }
                if ("avoidTolls" in options) {
                  carModeOptions.AvoidTolls = options.avoidTolls;
                }
                input.CarModeOptions = carModeOptions;
              }

              if ("drivingOptions" in options && options.travelMode == TravelMode.DRIVING) {
                input.DepartureTime = options.drivingOptions.departureTime;
              }

              if ("waypoints" in options) {
                // Array of DirectionsWaypoint
                parseOrFindLocations(
                  options.waypoints.map((waypoint) => waypoint.location),
                  this._placesService,
                  ROUTE_FIND_LOCATION_FIELDS,
                )
                  .then((waypointResponses) => {
                    input.WaypointPositions = waypointResponses.map((locationResponse) => locationResponse.position);

                    const command = new CalculateRouteCommand(input);

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
                const command = new CalculateRouteCommand(input);

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

  _convertAmazonResponseToGoogleResponse(response, options, originResponse, destinationResponse, waypointResponses?) {
    const bounds = response.Summary.RouteBBox;

    const googleLegs = [];
    // using "(leg) =>" instead of "function(leg)" to allow us to access 'this'
    response.Legs.forEach((leg) => {
      const steps: google.maps.DirectionsStep[] = [];
      leg.Steps.forEach((step) => {
        const startLocation = new MigrationLatLng(step.StartPosition[1], step.StartPosition[0]);
        const endLocation = new MigrationLatLng(step.EndPosition[1], step.EndPosition[0]);
        steps.push({
          distance: {
            // we do not support Google's behavior of using the unit system of the country of origin and so we will use
            // Amazon Location's default unit system of kilometers if the unit system option is not specified
            text: convertKilometersToGoogleDistanceText(step.Distance, options),
            value: step.Distance * KILOMETERS_TO_METERS_CONSTANT, // in meters, multiply km by 1000
          },
          duration: {
            text: formatSecondsAsGoogleDurationText(step.DurationSeconds),
            value: step.DurationSeconds,
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

      googleLegs.push({
        distance: {
          // we do not support Google's behavior of using the unit system of the country of origin and so we will use
          // Amazon Location's default unit system of kilometers if the unit system option is not specified
          text: convertKilometersToGoogleDistanceText(leg.Distance, options),
          value: leg.Distance * KILOMETERS_TO_METERS_CONSTANT, // in meters, multiply km by 1000
        },
        duration: {
          text: formatSecondsAsGoogleDurationText(leg.DurationSeconds),
          value: leg.DurationSeconds,
        },
        geometry: leg.Geometry,
        steps: steps,
        start_location: new MigrationLatLng(leg.StartPosition[1], leg.StartPosition[0]), // start_location of leg, not entire route
        end_location: new MigrationLatLng(leg.EndPosition[1], leg.EndPosition[0]), // end_location of leg, not entire route
        start_address: originResponse.formatted_address,
        end_address: destinationResponse.formatted_address,
      });
    });

    const googleRoute: google.maps.DirectionsRoute = {
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
      // TODO: These are not currently supported, but are required in the response
      copyrights: "",
      overview_path: [],
      overview_polyline: "",
      summary: "",
      warnings: [],
      waypoint_order: [],
    };

    const googleResponse: google.maps.DirectionsResult = {
      request: options,
      routes: [googleRoute],
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
