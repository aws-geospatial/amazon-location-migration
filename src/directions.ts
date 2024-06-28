// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CalculateRouteCommand,
  CalculateRouteCarModeOptions,
  CalculateRouteRequest,
  LocationClient,
} from "@aws-sdk/client-location";

import {
  AddListenerResponse,
  DirectionsStatus,
  LatLngLiteral,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
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

export enum UnitSystem {
  IMPERIAL = 0.0,
  METRIC = 1.0,
}

export enum TravelMode {
  DRIVING = "DRIVING",
  WALKING = "WALKING",
  BICYCLING = "BICYCLING",
  TRANSIT = "TRANSIT",
  TWO_WHEELER = "TWO_WHEELER",
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

const ASCII_CODE_A = 65;

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

              if ("unitSystem" in options) {
                if (options.unitSystem == UnitSystem.IMPERIAL) {
                  input.DistanceUnit = "Miles";
                } else if (options.unitSystem == UnitSystem.METRIC) {
                  input.DistanceUnit = "Kilometers";
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
                this._parseOrFindLocations(options.waypoints)
                  .then((locationReponses) => {
                    input.WaypointPositions = locationReponses.map((locationResponse) => locationResponse.position);

                    const command = new CalculateRouteCommand(input);

                    this._client
                      .send(command)
                      .then((response) => {
                        const googleResponse = this._convertAmazonResponseToGoogleResponse(response, options);
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
                    const googleResponse = this._convertAmazonResponseToGoogleResponse(response, options);
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

  _parseOrFindLocations(locationInputs: DirectionsWaypoint[]) {
    const locations = [];
    for (const locationInput of locationInputs) {
      locations.push(this._parseOrFindLocation(locationInput.location));
    }
    return Promise.all(locations);
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

  _convertAmazonResponseToGoogleResponse(response, options) {
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
        start_location: new MigrationLatLng(leg.StartPosition[1], leg.StartPosition[0]), // start_location of leg, not entire route
        end_location: new MigrationLatLng(leg.EndPosition[1], leg.EndPosition[0]), // end_location of leg, not entire route
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

    return googleResponse;
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

export { MigrationDirectionsService, MigrationDirectionsRenderer };
