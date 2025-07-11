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
  Route,
} from "@aws-sdk/client-geo-routes";

import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "../common";
import { TravelMode } from "./defines";
import { MigrationPlacesService } from "../places";
import {
  formatDistanceBasedOnUnitSystem,
  formatSecondsAsGoogleDurationText,
  parseOrFindLocation,
  parseOrFindLocations,
  ParseOrFindLocationResponse,
  populateAvoidOptions,
  getUnitSystem,
} from "./helpers";

// place_id and types needed for geocoded_waypoints response property, formatted_address needed for leg start_address and end_address
const ROUTE_FIND_LOCATION_FIELDS = ["geometry", "place_id", "types", "formatted_address"];
const AWS_COPYRIGHT = "© AWS, HERE";
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

              populateAvoidOptions(options, input);

              if (options.drivingOptions?.departureTime) {
                input.DepartureTime = options.drivingOptions.departureTime.toISOString();
              }

              // Google provides a max of 3 total route alternatives, so if enabled, we need to set
              // CalculateRoutesRequest.MaxAlternatives to 2 because these are counted on top of the
              // default route that is calculated
              if (options.provideRouteAlternatives) {
                input.MaxAlternatives = 2;
              }

              // Call Amazon Location RouteCalculation API with waypoints
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

                    this._executeRouteCalculation(
                      resolve,
                      reject,
                      input,
                      options,
                      originResponse,
                      destinationResponse,
                      callback,
                      waypointResponses,
                    );
                  })
                  .catch((error) => {
                    console.error(error);

                    reject({
                      status: DirectionsStatus.UNKNOWN_ERROR,
                    });
                  });
              } else {
                // Call Amazon Location RouteCalculation API without waypoints
                this._executeRouteCalculation(
                  resolve,
                  reject,
                  input,
                  options,
                  originResponse,
                  destinationResponse,
                  callback,
                );
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

  /**
   * Helper function to execute route calculation and handle responses
   *
   * This function encapsulates the common logic for calculating routes:
   *
   * 1. Creates and sends a CalculateRoutesCommand
   * 2. Converts Amazon Location response to Google Maps format
   * 3. Handles callbacks and promise resolution
   *
   * @param resolve - The resolve function from the outer Promise in "route"
   * @param reject - The reject function from the outer Promise in "route"
   * @param input - The input parameters for the CalculateRoutesCommand
   * @param options - The original "route" request options
   * @param originResponse - The resolved origin location
   * @param destinationResponse - The resolved destination location
   * @param callback - Optional callback function to be called with the result
   * @param waypointResponses - Optional array of resolved waypoint locations
   */
  private _executeRouteCalculation(
    resolve: (value: google.maps.DirectionsResult) => void,
    reject: (reason?: any) => void,
    input: CalculateRoutesRequest,
    options: google.maps.DirectionsRequest,
    originResponse: ParseOrFindLocationResponse,
    destinationResponse: ParseOrFindLocationResponse,
    callback?,
    waypointResponses?: ParseOrFindLocationResponse[],
  ): void {
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
  }

  _convertAmazonResponseToGoogleResponse(
    response: CalculateRoutesResponse,
    options: google.maps.DirectionsRequest,
    originResponse,
    destinationResponse,
    waypointResponses?,
  ) {
    const unitSystem = getUnitSystem(options, originResponse.position);

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
              /*
               * Google's Distance.text is based on unit system,
               * whereas Amazon Location's Distance is always in meters,
               * therefore needs to be translated to metric or imperial.
               *
               * Google's Distance.value is always in meters, so is Amazon Locations.
               * therefore no translation is needed.
               */
              text: formatDistanceBasedOnUnitSystem(step.Distance, unitSystem),
              value: step.Distance,
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
            /*
             * Google's Distance.text is based on unit system,
             * whereas Amazon Location's Distance is always in meters,
             * therefore needs to be translated to metric or imperial.
             *
             * Google's Distance.value is always in meters, so is Amazon Locations.
             * therefore no translation is needed.
             */
            text: formatDistanceBasedOnUnitSystem(legOverview.Distance, unitSystem),
            value: legOverview.Distance,
          },
          duration: {
            text: formatSecondsAsGoogleDurationText(legOverview.Duration),
            value: legOverview.Duration,
          },
          geometry: leg.Geometry,
          steps: googleSteps,
          start_location: new MigrationLatLng(
            legDetails.Departure.Place.Position[1],
            legDetails.Departure.Place.Position[0],
          ), // start_location of leg, not entire route
          end_location: new MigrationLatLng(legDetails.Arrival.Place.Position[1], legDetails.Arrival.Place.Position[0]), // end_location of leg, not entire route
          start_address: originResponse.formatted_address,
          end_address: destinationResponse.formatted_address,
        });
      });

      const googleRoute: google.maps.DirectionsRoute = {
        bounds: bounds,
        legs: googleLegs,
        copyrights: AWS_COPYRIGHT,
        summary: this._getSummary(route),
        // TODO: These are not currently supported, but are required in the response
        overview_path: [],
        overview_polyline: "",
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

  /**
   * Gets a summary string of the route based on major road names.
   *
   * Behavior:
   *
   * - Returns empty string if no road labels exist or no valid road names are found
   * - Returns a single road name if only one valid road name exists
   * - Returns a single road name if first and last valid road names are identical
   * - Returns "Road A and Road B" format when first and last valid road names are different
   *
   * Examples:
   *
   * - [null, "Second", "Third"] -> "Second and Third"
   * - ["First", null, "Third"] -> "First and Third"
   * - [null, "Same", "Same"] -> "Same"
   * - ["Only"] -> "Only"
   * - [null, undefined, "Valid"] -> "Valid"
   * - [null, undefined] -> ""
   *
   * @param route The route containing MajorRoadLabels
   * @returns Formatted summary string of the route
   */
  private _getSummary(route: Route): string {
    if (!route.MajorRoadLabels) {
      return "";
    }

    // Get valid road names, filtering out undefined/null values
    const validRoads = route.MajorRoadLabels.map((label) => label?.RoadName?.Value).filter((roadName) => roadName);

    if (!validRoads.length) {
      return "";
    }

    if (validRoads.length === 1) {
      return validRoads[0];
    }

    const firstValidRoad = validRoads[0];
    const lastValidRoad = validRoads[validRoads.length - 1];

    if (firstValidRoad === lastValidRoad) {
      return firstValidRoad;
    }

    // Return combination of first and last valid roads
    return `${firstValidRoad} and ${lastValidRoad}`;
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
