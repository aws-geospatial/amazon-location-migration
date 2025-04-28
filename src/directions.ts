// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CalculateRouteCommand,
  CalculateRouteMatrixCommand,
  CalculateRouteCarModeOptions,
  CalculateRouteRequest,
  CalculateRouteMatrixRequest,
  LocationClient,
} from "@aws-sdk/client-location";

import {
  AddListenerResponse,
  DirectionsStatus,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
} from "./common";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationPlacesService } from "./places";

interface ParseOrFindLocationResponse {
  locationLatLng: MigrationLatLng;
  position: [number, number];
}

export enum UnitSystem {
  IMPERIAL = 0.0,
  METRIC = 1.0,
}

export enum TravelMode {
  DRIVING = "DRIVING",
  WALKING = "WALKING",
  BICYCLING = "BICYCLING",
  TRANSIT = "TRANSIT",
}

export enum DistanceMatrixStatus {
  INVALID_REQUEST = "INVALID_REQUEST",
  MAX_DIMENSIONS_EXCEEDED = "MAX_DIMENSIONS_EXCEEDED",
  MAX_ELEMENTS_EXCEEDED = "MAX_ELEMENTS_EXCEEDED",
  OK = "OK",
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
  REQUEST_DENIED = "REQUEST_DENIED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum DistanceMatrixElementStatus {
  OK = "OK",
  ZERO_RESULTS = "ZERO_RESULTS",
  NOT_FOUND = "NOT_FOUND",
}

const ASCII_CODE_A = 65;
const KILOMETERS_TO_MILES_CONSTANT = 0.621371;
const KILOMETERS_TO_METERS_CONSTANT = 1000;
// place_id and types needed for geocoded_waypoints response property, formatted_address needed for leg start_address and end_address
const ROUTE_FIND_LOCATION_FIELDS = ["geometry", "place_id", "types", "formatted_address"];
// formatted_address needed for originAddresses and destinationAddresses
const DISTANCE_MATRIX_FIND_LOCATION_FIELDS = ["geometry", "formatted_address"];

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
  #routeIds = [];

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
      const leg = route.legs[i];

      // leg.geometry is a new field we've added, because Google doesn't provide the polyline
      // for the leg as a whole, only for the individual steps, but our API (currently) only provides
      // a polyline for the entire leg.
      // TODO: Once we've removed this, we can change the input param of setDirections to be typed (directions: google.maps.DirectionsResult | null)
      const geometry = leg.geometry;

      // TODO: Detect geometry type instead of just doing LineString
      if (this.#suppressPolylines === false) {
        const routeId = "route" + i;
        maplibreMap.addSource(routeId, {
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
          id: routeId,
          type: "line",
          source: routeId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: this.#polylineOptions && this.#polylineOptions.visible == false ? "none" : "visible",
          },
          paint: paintOptions,
        });

        this.#routeIds.push(routeId);
      }

      // Add markers for the start location of the current leg
      if (this.#suppressMarkers === false) {
        const startLocation = leg.start_location;

        const startMarkerOptions =
          this.#markerOptions === undefined
            ? { label: String.fromCharCode(ASCII_CODE_A + i) }
            : structuredClone(this.#markerOptions);
        startMarkerOptions.position = startLocation;
        startMarkerOptions.map = this.#map;
        const startMarker = new MigrationMarker(startMarkerOptions);
        this.#markers.push(startMarker);
      }

      // TODO: Add default info windows once location information is passed into route result
    }

    // Add final marker for end location of enture route
    if (this.#suppressMarkers === false) {
      const lastLeg = route.legs[route.legs.length - 1];
      const endMarkerOptions =
        this.#markerOptions === undefined
          ? { label: String.fromCharCode(ASCII_CODE_A + route.legs.length) }
          : structuredClone(this.#markerOptions);
      endMarkerOptions.position = lastLeg.end_location;
      endMarkerOptions.map = this.#map;
      const endMarker = new MigrationMarker(endMarkerOptions);
      this.#markers.push(endMarker);
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
      this.#markers.forEach(function (marker) {
        marker.remove();
      });
      this.#markers = [];
    }
    if (this.#routeIds.length) {
      const maplibreMap = this.#map._getMap();
      this.#routeIds.forEach(function (routeId) {
        maplibreMap.removeLayer(routeId);
        maplibreMap.removeSource(routeId);
      });
      this.#routeIds = [];
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

class MigrationDistanceMatrixService {
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

function parseOrFindLocations(
  locationInputs: (string | google.maps.LatLng | MigrationLatLng | google.maps.LatLngLiteral | google.maps.Place)[],
  placesService: MigrationPlacesService,
  findPlaceFromQueryFields: string[],
) {
  const locations = [];
  for (const locationInput of locationInputs) {
    locations.push(parseOrFindLocation(locationInput, placesService, findPlaceFromQueryFields));
  }
  return Promise.all(locations);
}

function parseOrFindLocation(locationInput, placesService: MigrationPlacesService, findPlaceFromQueryFields: string[]) {
  // The locationInput can be either a string to be geocoded, a Place, LatLng or LatLngLiteral
  // For query or placeId, we will need to perform a request to figure out the location.
  // Otherwise, for LatLng|LatLngLiteral we can just parse it.
  return new Promise((resolve, reject) => {
    // For a query, we use findPlaceFromQuery to retrieve the location
    if (typeof locationInput === "string" || typeof locationInput?.query === "string") {
      const query = locationInput?.query || locationInput;

      const findPlaceFromQueryRequest = {
        query: query,
        fields: findPlaceFromQueryFields,
      };

      placesService.findPlaceFromQuery(findPlaceFromQueryRequest, (results, status) => {
        if (status === PlacesServiceStatus.OK && results.length) {
          const locationLatLng = results[0].geometry.location;
          const position = [locationLatLng.lng(), locationLatLng.lat()];

          resolve({
            locationLatLng: locationLatLng,
            position: position,
            place_id: results[0].place_id,
            types: results[0].types,
            formatted_address: results[0].formatted_address,
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

      placesService.getDetails(getDetailsRequest, function (result, status) {
        if (status === PlacesServiceStatus.OK) {
          const locationLatLng = result.geometry.location;
          const position = [locationLatLng.lng(), locationLatLng.lat()];

          resolve({
            locationLatLng: locationLatLng,
            position: position,
            place_id: locationInput?.placeId,
            types: result.types,
            formatted_address: result.formatted_address,
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

function formatSecondsAsGoogleDurationText(seconds) {
  // convert seconds to days, hours, and minutes, rounding up to whole minutes
  const days = Math.floor(seconds / 86400); // 1 day = 86400 seconds
  const remainingSeconds = seconds % 86400;
  const hours = Math.floor(remainingSeconds / 3600);
  const remainingMinuteSeconds = remainingSeconds % 3600;
  const minutes = Math.ceil(remainingMinuteSeconds / 60);

  // take care of the "1 day", "1 hour", or "1 min" edge case
  const dayString = days > 0 ? `${days === 1 ? `${days} day` : `${days} days`}` : "";
  const hourString = hours > 0 ? `${hours === 1 ? `${hours} hour` : `${hours} hours`}` : "";
  const minuteString = minutes > 0 ? `${minutes === 1 ? `${minutes} min` : `${minutes} mins`}` : "";

  // return day, hour, and minute strings only if they are set
  const parts = [dayString, hourString, minuteString].filter((str) => str !== "");
  return parts.join(" ");
}

function convertKilometersToGoogleDistanceText(kilometers, options) {
  return "unitSystem" in options && options.unitSystem == UnitSystem.IMPERIAL
    ? kilometers * KILOMETERS_TO_MILES_CONSTANT + " mi"
    : kilometers + " km";
}

export { MigrationDirectionsService, MigrationDirectionsRenderer, MigrationDistanceMatrixService };
