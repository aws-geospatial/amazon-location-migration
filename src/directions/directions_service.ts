// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoRoutesClient,
  CalculateRoutesCommand,
  CalculateRoutesRequest,
  CalculateRoutesResponse,
  GeometryFormat,
  MeasurementSystem,
  OptimizeWaypointsCommand,
  OptimizeWaypointsRequest,
  RouteLegAdditionalFeature,
  RoutePedestrianTravelStep,
  RouteTransitLegDetails,
  RouteTransitMode,
  RouteVehicleTravelStep,
  Route,
} from "@aws-sdk/client-geo-routes";

import { encodeFromLngLatArray } from "@aws/polyline";

import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds, VehicleType } from "../common";
import { UnitSystem, TravelMode } from "./defines";
import { MigrationPlacesService } from "../places";
import {
  formatDistanceBasedOnUnitSystem,
  formatSecondsAsGoogleDurationText,
  parseOrFindLocation,
  parseOrFindLocations,
  ParseOrFindLocationResponse,
  populateAvoidOptions,
  populateTravelModeOption,
  populateTransitOptions,
  getManeuver,
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

  route(
    options: google.maps.DirectionsRequest,
    callback?: (a: google.maps.DirectionsResult | null, b: google.maps.DirectionsStatus) => void,
  ) {
    return new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      parseOrFindLocation(options.origin, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
        .then((originResponse: ParseOrFindLocationResponse) => {
          const departurePosition = originResponse.position;

          parseOrFindLocation(options.destination, this._placesService, ROUTE_FIND_LOCATION_FIELDS)
            .then((destinationResponse: ParseOrFindLocationResponse) => {
              const destinationPosition = destinationResponse.position;

              const isTransit = options.travelMode === TravelMode.TRANSIT;
              const input: CalculateRoutesRequest = {
                Origin: departurePosition, // required
                Destination: destinationPosition, // required
                LegGeometryFormat: GeometryFormat.SIMPLE,
                LegAdditionalFeatures: [
                  RouteLegAdditionalFeature.SUMMARY,
                  // TRAVEL_STEP_INSTRUCTIONS and TYPICAL_DURATION are not supported for transit routes
                  ...(isTransit
                    ? [RouteLegAdditionalFeature.INTERMEDIATE_STOPS]
                    : [RouteLegAdditionalFeature.TRAVEL_STEP_INSTRUCTIONS, RouteLegAdditionalFeature.TYPICAL_DURATION]),
                ],
              };

              // Apply travel mode and avoidance options
              populateTravelModeOption(options, input);
              populateTransitOptions(options, input);
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

              // Apply unit system options if specified and detect unit system based on origin location if not specified
              let unitSystem;
              if ("unitSystem" in options) {
                if (options.unitSystem == google.maps.UnitSystem.IMPERIAL) {
                  unitSystem = UnitSystem.IMPERIAL;
                  input.InstructionsMeasurementSystem = MeasurementSystem.IMPERIAL;
                } else {
                  unitSystem = UnitSystem.METRIC;
                  input.InstructionsMeasurementSystem = MeasurementSystem.METRIC;
                }
              } else {
                unitSystem = getUnitSystem(options, originResponse.position);
                input.InstructionsMeasurementSystem =
                  unitSystem == UnitSystem.IMPERIAL ? MeasurementSystem.IMPERIAL : MeasurementSystem.METRIC;
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
                    // Check if any waypoints have stopover set to false, if any are set to false, then do not optimize waypoints per Google's behavior.
                    const hasPassThroughWaypoints = options.waypoints.some((waypoint) => waypoint.stopover === false);

                    // Call Amazon Location RouteCalculation API with optimized waypoints if options contain "optimizeWaypoints" option and "optimizeWaypoints" is true,
                    // but only if none of the waypoints are pass-through (stopover = false). To do this, we will first need to call Amazon Location OptimizeWaypoints API
                    // to optimize the passed in waypoints.
                    if (
                      "optimizeWaypoints" in options &&
                      options.optimizeWaypoints &&
                      !hasPassThroughWaypoints &&
                      options.waypoints.length > 0
                    ) {
                      // Create OptimizeWaypoints input.
                      const optimizeWaypointsInput: OptimizeWaypointsRequest = {
                        Origin: departurePosition, // required
                        Destination: destinationPosition,
                      };

                      // Apply travel mode and avoidance options
                      populateTravelModeOption(options, optimizeWaypointsInput);
                      populateAvoidOptions(options, optimizeWaypointsInput);

                      if (options.drivingOptions?.departureTime) {
                        input.DepartureTime = options.drivingOptions.departureTime.toISOString();
                      }

                      // Add waypoints to OptimizeWaypoints input. Add an Id for each waypoint as this Id will be used in the waypoint_order property in the Google response.
                      optimizeWaypointsInput.Waypoints = waypointResponses.map((waypoint, index) => {
                        return {
                          Position: waypoint.position, // required
                          Id: index.toString(), // convert the numeric index to a string as Id is defined to be a string
                        };
                      });

                      // Create OptimizeWaypointsCommand with input that was configured above
                      const optimizeWaypointsCommand = new OptimizeWaypointsCommand(optimizeWaypointsInput);

                      // Call Amazon Location OptimizeWaypoint API and convert the response to be consumed by Amazon Location CalculateRoutes API
                      // whose response will be used to construct Google route API response.
                      this._client
                        .send(optimizeWaypointsCommand)
                        .then((optimizedWaypointResponse) => {
                          // Set ordered waypoints input to be consumed by CalculateRoutes API.
                          // We need to filter out Origin and Destination waypoints before mapping.
                          input.Waypoints = optimizedWaypointResponse.OptimizedWaypoints.filter(
                            (locationResponse) =>
                              locationResponse.Id !== "Origin" && locationResponse.Id !== "Destination",
                          ).map((locationResponse) => {
                            return {
                              Position: locationResponse.Position,
                              PassThrough: false, // Google does not support optimizing waypoints if any waypoints are noted as passthrough
                            };
                          });

                          // Create a waypoint order array based on the optimizedWaypointResponse.Id values.
                          // Filter out Origin and Destination waypoints and only include numeric IDs.
                          const waypointOrder = optimizedWaypointResponse.OptimizedWaypoints.filter(
                            (waypoint) => waypoint.Id !== "Origin" && waypoint.Id !== "Destination",
                          ).map((waypoint) => parseInt(waypoint.Id)); // Parse the int as Id is defined to be a string.

                          // Reorder waypointResponses based on the optimized order. We will use reorderedWaypointResponses in our CalculateRoutes API call.
                          const reorderedWaypointResponses = waypointOrder.map(
                            (originalIndex) => waypointResponses[originalIndex],
                          );

                          // Call CalculateRoutes API with optimized waypoints
                          this._executeRouteCalculation(
                            resolve,
                            reject,
                            input,
                            options,
                            originResponse,
                            destinationResponse,
                            unitSystem,
                            callback,
                            reorderedWaypointResponses,
                            waypointOrder,
                          );
                        })
                        .catch((error) => {
                          console.error(error);

                          reject({
                            status: DirectionsStatus.UNKNOWN_ERROR,
                          });
                        });
                    } else {
                      input.Waypoints = waypointResponses.map((locationResponse, index) => {
                        const googleWaypoint = options.waypoints[index];
                        const stopover = googleWaypoint.stopover ?? true; // Google treats each waypoint as a stop by default
                        return {
                          Position: locationResponse.position,
                          PassThrough: !stopover,
                        };
                      });

                      // Call CalculateRoutes API with optimized waypoints
                      this._executeRouteCalculation(
                        resolve,
                        reject,
                        input,
                        options,
                        originResponse,
                        destinationResponse,
                        unitSystem,
                        callback,
                        waypointResponses,
                      );
                    }
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
                  unitSystem,
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
   * @param unitSystem - The unit system to use for this "route"
   * @param callback - Optional callback function to be called with the result
   * @param waypointResponses - Optional array of resolved waypoint locations
   * @param waypointOrder - Optional array containing the order of waypoints after optimization
   */
  private _executeRouteCalculation(
    resolve: (value: google.maps.DirectionsResult) => void,
    reject: (reason?: { status: google.maps.DirectionsStatus }) => void,
    input: CalculateRoutesRequest,
    options: google.maps.DirectionsRequest,
    originResponse: ParseOrFindLocationResponse,
    destinationResponse: ParseOrFindLocationResponse,
    unitSystem: UnitSystem,
    callback?,
    waypointResponses?: ParseOrFindLocationResponse[],
    waypointOrder?: number[],
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
          unitSystem,
          waypointResponses,
          waypointOrder,
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
    unitSystem,
    waypointResponses?,
    waypointOrder?: number[],
  ) {
    const googleRoutes: google.maps.DirectionsRoute[] = [];
    const isTransitRoute = options.travelMode === TravelMode.TRANSIT;

    response.Routes.forEach((route) => {
      const bounds = new MigrationLatLngBounds();
      const routeCoordinates: number[][] = [];
      const googleLegs: google.maps.DirectionsLeg[] = [];

      if (isTransitRoute) {
        googleLegs.push(
          this._buildTransitLeg(route.Legs, bounds, routeCoordinates, unitSystem, originResponse, destinationResponse),
        );
      } else {
        route.Legs.forEach((leg) => {
          googleLegs.push(
            this._buildStandardLeg(
              leg,
              bounds,
              routeCoordinates,
              unitSystem,
              options,
              originResponse,
              destinationResponse,
            ),
          );
        });
      }

      const googleRoute: google.maps.DirectionsRoute = {
        bounds: bounds,
        legs: googleLegs,
        copyrights: AWS_COPYRIGHT,
        summary: this._getSummary(route),
        waypoint_order: waypointOrder || [],
        overview_path: this._getPath(routeCoordinates),
        overview_polyline: this._getPolyline(routeCoordinates),
        // TODO: These are not currently supported, but are required in the response
        warnings: [],
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

  private _makeTime(isoString: string): google.maps.Time {
    const date = new Date(isoString);
    return {
      value: date,
      text: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      time_zone: "",
    };
  }

  private _buildVehicleStep(
    step: RouteVehicleTravelStep | RoutePedestrianTravelStep,
    legGeometry: number[][],
    nextGeometryOffset: number,
    travelMode: google.maps.TravelMode,
    unitSystem: UnitSystem,
  ): google.maps.DirectionsStep {
    const geometryOffset = step.GeometryOffset;
    const startPos = legGeometry[geometryOffset];
    const endPos = legGeometry[nextGeometryOffset];
    const startLocation = new MigrationLatLng(startPos[1], startPos[0]);
    const endLocation = new MigrationLatLng(endPos[1], endPos[0]);
    const stepCoordinates = legGeometry.slice(geometryOffset, nextGeometryOffset + 1);
    const stepPath = this._getPath(stepCoordinates);
    const stepPolyline = this._getPolyline(stepCoordinates);

    return {
      distance: { text: formatDistanceBasedOnUnitSystem(step.Distance, unitSystem), value: step.Distance },
      duration: { text: formatSecondsAsGoogleDurationText(step.Duration), value: step.Duration },
      start_location: startLocation,
      start_point: startLocation,
      end_location: endLocation,
      end_point: endLocation,
      path: stepPath,
      lat_lngs: stepPath,
      encoded_lat_lngs: stepPolyline,
      polyline: { points: stepPolyline },
      instructions: step.Instruction,
      travel_mode: travelMode,
      maneuver: getManeuver(step),
    };
  }

  private _buildTransitStep(
    transitLegDetails: RouteTransitLegDetails,
    legGeometry: number[][],
    unitSystem: UnitSystem,
  ): google.maps.DirectionsStep {
    const overview = transitLegDetails.Summary.Overview;
    const transport = transitLegDetails.Transport;
    const depName = transitLegDetails.Departure?.Place?.Name || "";
    const arrName = transitLegDetails.Arrival?.Place?.Name || "";
    const headsign = transport?.Headsign ? ` towards ${transport.Headsign}` : "";
    const instruction = `${transport?.Mode || "Transit"} ${transport?.RouteName || ""}${headsign}${
      depName ? ` from ${depName}` : ""
    }${arrName ? ` to ${arrName}` : ""}`;

    const startPos = legGeometry[0];
    const endPos = legGeometry[legGeometry.length - 1];
    const startLocation = new MigrationLatLng(startPos[1], startPos[0]);
    const endLocation = new MigrationLatLng(endPos[1], endPos[0]);
    const stepPath = this._getPath(legGeometry);
    const stepPolyline = this._getPolyline(legGeometry);
    const transitDetails = this._buildTransitDetails(transitLegDetails);

    return {
      distance: { text: formatDistanceBasedOnUnitSystem(overview.Distance, unitSystem), value: overview.Distance },
      duration: { text: formatSecondsAsGoogleDurationText(overview.Duration), value: overview.Duration },
      start_location: startLocation,
      start_point: startLocation,
      end_location: endLocation,
      end_point: endLocation,
      path: stepPath,
      lat_lngs: stepPath,
      encoded_lat_lngs: stepPolyline,
      polyline: { points: stepPolyline },
      instructions: instruction,
      travel_mode: "TRANSIT" as google.maps.TravelMode,
      maneuver: "",
      transit_details: transitDetails,
      transit: transitDetails,
    };
  }

  private _buildTransitLeg(
    legs: ReturnType<typeof Object.values>[0],
    bounds: MigrationLatLngBounds,
    routeCoordinates: number[][],
    unitSystem: UnitSystem,
    originResponse: ParseOrFindLocationResponse,
    destinationResponse: ParseOrFindLocationResponse,
  ): google.maps.DirectionsLeg {
    const googleSteps: google.maps.DirectionsStep[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const firstLegDetails = firstLeg.VehicleLegDetails || firstLeg.PedestrianLegDetails || firstLeg.TransitLegDetails;
    const lastLegDetails = lastLeg.VehicleLegDetails || lastLeg.PedestrianLegDetails || lastLeg.TransitLegDetails;

    legs.forEach((leg) => {
      const legGeometry = leg.Geometry.LineString;
      const transitLegDetails = leg.TransitLegDetails;
      const legDetails = leg.VehicleLegDetails || leg.PedestrianLegDetails || transitLegDetails;
      const legOverview = legDetails.Summary.Overview;

      totalDistance += legOverview.Distance;
      totalDuration += legOverview.Duration;

      legGeometry.forEach((coord) => bounds.extend(new MigrationLatLng({ lat: coord[1], lng: coord[0] })));
      routeCoordinates.push(...legGeometry);

      if (transitLegDetails) {
        googleSteps.push(this._buildTransitStep(transitLegDetails, legGeometry, unitSystem));
      } else {
        const walkSteps = legDetails.TravelSteps as (RouteVehicleTravelStep | RoutePedestrianTravelStep)[];
        walkSteps.forEach((step, stepIndex) => {
          const nextGeometryOffset =
            stepIndex + 1 < walkSteps.length ? walkSteps[stepIndex + 1].GeometryOffset : legGeometry.length - 1;
          googleSteps.push(
            this._buildVehicleStep(
              step,
              legGeometry,
              nextGeometryOffset,
              "WALKING" as google.maps.TravelMode,
              unitSystem,
            ),
          );
        });
      }
    });

    const googleLeg: google.maps.DirectionsLeg = {
      distance: { text: formatDistanceBasedOnUnitSystem(totalDistance, unitSystem), value: totalDistance },
      duration: { text: formatSecondsAsGoogleDurationText(totalDuration), value: totalDuration },
      steps: googleSteps,
      start_location: new MigrationLatLng(
        firstLegDetails.Departure.Place.Position[1],
        firstLegDetails.Departure.Place.Position[0],
      ),
      end_location: new MigrationLatLng(
        lastLegDetails.Arrival.Place.Position[1],
        lastLegDetails.Arrival.Place.Position[0],
      ),
      start_address: originResponse.formatted_address,
      end_address: destinationResponse.formatted_address,
      traffic_speed_entry: [],
      via_waypoints: [],
    };

    if (firstLegDetails.Departure?.Time) {
      googleLeg.departure_time = this._makeTime(firstLegDetails.Departure.Time);
    }
    if (lastLegDetails.Arrival?.Time) {
      googleLeg.arrival_time = this._makeTime(lastLegDetails.Arrival.Time);
    }

    return googleLeg;
  }

  private _buildStandardLeg(
    leg,
    bounds: MigrationLatLngBounds,
    routeCoordinates: number[][],
    unitSystem: UnitSystem,
    options: google.maps.DirectionsRequest,
    originResponse: ParseOrFindLocationResponse,
    destinationResponse: ParseOrFindLocationResponse,
  ): google.maps.DirectionsLeg {
    const legGeometry = leg.Geometry.LineString;
    const legDetails = leg.VehicleLegDetails || leg.PedestrianLegDetails;
    const steps = legDetails.TravelSteps as (RouteVehicleTravelStep | RoutePedestrianTravelStep)[];

    const googleSteps = steps.map((step, stepIndex) => {
      const nextGeometryOffset =
        stepIndex + 1 < steps.length ? steps[stepIndex + 1].GeometryOffset : legGeometry.length - 1;
      return this._buildVehicleStep(step, legGeometry, nextGeometryOffset, options.travelMode, unitSystem);
    });

    legGeometry.forEach((coord) => bounds.extend(new MigrationLatLng({ lat: coord[1], lng: coord[0] })));
    routeCoordinates.push(...legGeometry);

    const legOverview = legDetails.Summary.Overview;
    return {
      distance: {
        text: formatDistanceBasedOnUnitSystem(legOverview.Distance, unitSystem),
        value: legOverview.Distance,
      },
      duration: { text: formatSecondsAsGoogleDurationText(legOverview.Duration), value: legOverview.Duration },
      steps: googleSteps,
      start_location: new MigrationLatLng(
        legDetails.Departure.Place.Position[1],
        legDetails.Departure.Place.Position[0],
      ),
      end_location: new MigrationLatLng(legDetails.Arrival.Place.Position[1], legDetails.Arrival.Place.Position[0]),
      start_address: originResponse.formatted_address,
      end_address: destinationResponse.formatted_address,
      traffic_speed_entry: [],
      via_waypoints: [],
    };
  }

  /**
   * Gets a summary string of the route based on major road or route names.
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
    // For transit routes, summarize using the transit line names across all legs
    const transitLegs = route.Legs?.filter((leg) => leg.TransitLegDetails);
    if (transitLegs?.length) {
      const lineNames = transitLegs
        .map((leg) => leg.TransitLegDetails.Transport?.RouteName || leg.TransitLegDetails.Transport?.LongRouteName)
        .filter(Boolean);
      return lineNames.length ? lineNames.join(", ") : "";
    }

    if (!route.MajorRoadLabels) {
      return "";
    }

    // Get valid road or route names, filtering out undefined/null values
    const validRoads = route.MajorRoadLabels.map((label) => label?.RoadName?.Value || label?.RouteNumber?.Value).filter(
      (roadName) => roadName,
    );

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

  private _buildTransitDetails(transitLegDetails: RouteTransitLegDetails): google.maps.TransitDetails {
    const transport = transitLegDetails.Transport;
    const departure = transitLegDetails.Departure;
    const arrival = transitLegDetails.Arrival;
    const agency = transitLegDetails.Agency;

    const departureStop: google.maps.TransitStop = {
      name: departure?.Place?.Name || "",
      location: departure?.Place?.Position
        ? new MigrationLatLng(departure.Place.Position[1], departure.Place.Position[0])
        : new MigrationLatLng(0, 0),
    };

    const arrivalStop: google.maps.TransitStop = {
      name: arrival?.Place?.Name || "",
      location: arrival?.Place?.Position
        ? new MigrationLatLng(arrival.Place.Position[1], arrival.Place.Position[0])
        : new MigrationLatLng(0, 0),
    };

    const transitAgency: google.maps.TransitAgency = {
      name: agency?.Name || "",
      phone: "",
      url: agency?.Url || "",
    };

    const vehicle: google.maps.TransitVehicle = {
      name: transport?.Mode ? this._getVehicleTypeName(transport.Mode) : "Transit",
      type: transport?.Mode
        ? this._mapTransitModeToVehicleType(transport.Mode)
        : (VehicleType.OTHER as unknown as google.maps.VehicleType),
      icon: "",
      local_icon: "",
    };

    const line: google.maps.TransitLine = {
      name: transport?.LongRouteName || transport?.RouteName || "",
      short_name: transport?.RouteName || "",
      color: transport?.Color || "",
      text_color: transport?.TextColor || "",
      agencies: [transitAgency],
      vehicle,
      icon: "",
      url: "",
    };

    const numStops = (transitLegDetails.IntermediateStops?.length || 0) + 1;

    return {
      arrival_stop: arrivalStop,
      departure_stop: departureStop,
      arrival_time: arrival?.Time
        ? {
            value: new Date(arrival.Time),
            text: new Date(arrival.Time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            time_zone: "",
          }
        : undefined,
      departure_time: departure?.Time
        ? {
            value: new Date(departure.Time),
            text: new Date(departure.Time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            time_zone: "",
          }
        : undefined,
      headsign: transport?.Headsign || "",
      headway: 0,
      line,
      num_stops: numStops,
      trip_short_name: transport?.RouteName || "",
    };
  }

  private _mapTransitModeToVehicleType(mode: RouteTransitMode): google.maps.VehicleType {
    switch (mode) {
      case RouteTransitMode.BUS:
      case RouteTransitMode.PRIVATE_BUS:
        return VehicleType.BUS as unknown as google.maps.VehicleType;
      case RouteTransitMode.BUS_RAPID_TRANSIT:
        return VehicleType.INTERCITY_BUS as unknown as google.maps.VehicleType;
      case RouteTransitMode.SUBWAY:
        return VehicleType.SUBWAY as unknown as google.maps.VehicleType;
      case RouteTransitMode.CITY_TRAIN:
        return VehicleType.COMMUTER_TRAIN as unknown as google.maps.VehicleType;
      case RouteTransitMode.HIGH_SPEED_TRAIN:
        return VehicleType.HIGH_SPEED_TRAIN as unknown as google.maps.VehicleType;
      case RouteTransitMode.INTERCITY_TRAIN:
      case RouteTransitMode.INTERREGIONAL_TRAIN:
      case RouteTransitMode.REGIONAL_TRAIN:
        return VehicleType.HEAVY_RAIL as unknown as google.maps.VehicleType;
      case RouteTransitMode.LIGHT_RAIL:
        return VehicleType.TRAM as unknown as google.maps.VehicleType;
      case RouteTransitMode.MONORAIL:
        return VehicleType.MONORAIL as unknown as google.maps.VehicleType;
      case RouteTransitMode.FERRY:
        return VehicleType.FERRY as unknown as google.maps.VehicleType;
      case RouteTransitMode.FUNICULAR_RAILWAY:
        return VehicleType.FUNICULAR as unknown as google.maps.VehicleType;
      case RouteTransitMode.AERIAL_TRAMWAY:
        return VehicleType.GONDOLA_LIFT as unknown as google.maps.VehicleType;
      default:
        return VehicleType.OTHER as unknown as google.maps.VehicleType;
    }
  }

  private _getVehicleTypeName(mode: RouteTransitMode): string {
    switch (mode) {
      case RouteTransitMode.BUS:
      case RouteTransitMode.PRIVATE_BUS:
        return "Bus";
      case RouteTransitMode.BUS_RAPID_TRANSIT:
        return "Bus Rapid Transit";
      case RouteTransitMode.SUBWAY:
        return "Subway";
      case RouteTransitMode.CITY_TRAIN:
        return "Train";
      case RouteTransitMode.HIGH_SPEED_TRAIN:
        return "High Speed Train";
      case RouteTransitMode.INTERCITY_TRAIN:
        return "Intercity Train";
      case RouteTransitMode.INTERREGIONAL_TRAIN:
        return "Interregional Train";
      case RouteTransitMode.REGIONAL_TRAIN:
        return "Regional Train";
      case RouteTransitMode.LIGHT_RAIL:
        return "Light Rail";
      case RouteTransitMode.MONORAIL:
        return "Monorail";
      case RouteTransitMode.FERRY:
        return "Ferry";
      case RouteTransitMode.FUNICULAR_RAILWAY:
        return "Funicular";
      case RouteTransitMode.AERIAL_TRAMWAY:
        return "Aerial Tramway";
      default:
        return "Transit";
    }
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

  _getPath(coordinates: number[][]): google.maps.LatLng[] {
    // Return list of google.maps.LatLng instances from [lng, lat] coordinates
    return coordinates.map((coord) => new MigrationLatLng(coord[1], coord[0]));
  }

  _getPolyline(coordinates: number[][]): string {
    return encodeFromLngLatArray(coordinates);
  }
}
