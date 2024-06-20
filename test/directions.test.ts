// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationDirectionsRenderer, MigrationDirectionsService } from "../src/directions";
import { MigrationPlacesService } from "../src/places";
import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds, TravelMode } from "../src/googleCommon";

const mockAddControl = jest.fn();
const mockFitBounds = jest.fn();
const mockAddSource = jest.fn();
const mockRemoveSource = jest.fn();
const mockAddLayer = jest.fn();
const mockRemoveLayer = jest.fn();

const mockSetLngLat = jest.fn();
const mockAddTo = jest.fn();
const mockRemove = jest.fn();

jest.mock("maplibre-gl", () => ({
  ...jest.requireActual("maplibre-gl"),
  Marker: jest.fn().mockImplementation(() => {
    return {
      _element: document.createElement("div"),
      setLngLat: mockSetLngLat,
      addTo: mockAddTo,
      remove: mockRemove,
    };
  }),
  Map: jest.fn().mockImplementation(() => {
    return {
      addControl: mockAddControl,
      fitBounds: mockFitBounds,
      addSource: mockAddSource,
      removeSource: mockRemoveSource,
      addLayer: mockAddLayer,
      removeLayer: mockRemoveLayer,
    };
  }),
}));

const clientErrorQuery = "THIS_WILL_CAUSE_A_CLIENT_ERROR";
const clientErrorPlaceId = "INVALID_PLACE_ID";
const clientErrorDestinationPosition = [-1, -1];
const testCoolPlaceLocation = new MigrationLatLng(3, 4);
const testAnotherCoolPlaceLocation = new MigrationLatLng(7, 8);

const mockedClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof CalculateRouteCommand) {
      if (JSON.stringify(command.input.DestinationPosition) == JSON.stringify(clientErrorDestinationPosition)) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        const startPosition = command.input.DeparturePosition as number[];
        const endPosition = command.input.DestinationPosition as number[];

        resolve({
          Legs: [
            {
              Distance: 9001,
              DurationSeconds: 1337,
              EndPosition: endPosition,
              Geometry: {
                LineString: [
                  [0, 0],
                  [1, 1],
                  [2, 2],
                ],
              },
              StartPosition: startPosition,
              Steps: [
                {
                  Distance: 3,
                  DurationSeconds: 5,
                  EndPosition: [3, 4],
                  StartPosition: [1, 2],
                },
                {
                  Distance: 4,
                  DurationSeconds: 6,
                  EndPosition: [6, 7],
                  StartPosition: [3, 4],
                },
                {
                  Distance: 10,
                  DurationSeconds: 7,
                  EndPosition: [20, 21],
                  StartPosition: [6, 7],
                },
              ],
            },
          ],
          Summary: {
            Distance: 9001,
            DistanceUnit: "Kilometers",
            DurationSeconds: 1337,
            RouteBBox: startPosition.concat(endPosition),
          },
        });
      }
    } else if (command instanceof SearchPlaceIndexForTextCommand) {
      if (command.input.Text == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else if (command.input.Text == "cool place") {
        resolve({
          Results: [
            {
              Place: {
                Label: "cool place, austin, tx",
                Geometry: {
                  Point: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
                },
              },
              PlaceId: "KEEP_AUSTIN_WEIRD",
            },
          ],
        });
      } else if (command.input.Text == "another cool place") {
        resolve({
          Results: [
            {
              Place: {
                Label: "another cool place, austin, tx",
                Geometry: {
                  Point: [testAnotherCoolPlaceLocation.lng(), testAnotherCoolPlaceLocation.lat()],
                },
              },
              PlaceId: "ANOTHER_COOL_PLACE",
            },
          ],
        });
      }
    } else if (command instanceof GetPlaceCommand) {
      if (command.input.PlaceId === clientErrorPlaceId) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Place: {
            Label: "cool place, austin, tx",
            AddressNumber: "1337",
            Street: "Cool Place Road",
            Geometry: {
              Point: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
            },
            TimeZone: {
              Offset: -18000,
            },
            Municipality: "Austin",
          },
        });
      }
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-location", () => ({
  ...jest.requireActual("@aws-sdk/client-location"),
  LocationClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedClientSend,
    };
  }),
}));
import {
  LocationClient,
  CalculateRouteCommand,
  GetPlaceCommand,
  SearchPlaceIndexForTextCommand,
} from "@aws-sdk/client-location";

const directionsService = new MigrationDirectionsService();
directionsService._client = new LocationClient();

// The DirectionsService also uses the PlacesService in cases where the route is specified with a query string
// or PlaceId, so we need to set up a mocked one here.
MigrationPlacesService.prototype._client = new LocationClient();
directionsService._placesService = new MigrationPlacesService();

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
import { Marker } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should set directionsrenderer options", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testMarkerOptions = {};
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: testMarkerOptions,
    preserveViewport: true,
    suppressMarkers: true,
    suppressPolylines: true,
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(testDirectionsRenderer._getMarkers()).toStrictEqual([]);
  expect(testDirectionsRenderer.getMap()).toBe(testMap);
  expect(testDirectionsRenderer._getMarkerOptions()).toBe(testMarkerOptions);
  expect(testDirectionsRenderer._getPreserveViewport()).toBe(true);
  expect(testDirectionsRenderer._getSuppressMarkers()).toBe(true);
  expect(testDirectionsRenderer._getSuppressPolylines()).toBe(true);
});

test("should set directionsrenderer directions option", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: {
      routes: [
        {
          bounds: null,
          legs: [
            {
              geometry: {
                LineString: 0,
              },
              start_location: { lat: 0, lng: 0 },
              end_location: { lat: 1, lng: 1 },
            },
          ],
        },
      ],
    },
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer twice", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 2, lng: 2 },
            end_location: { lat: 3, lng: 3 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(2);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(2);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(4);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with all polylineOptions set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Blue",
      strokeWeight: 10,
      strokeOpacity: 0.1,
      visible: false,
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "none",
    },
    paint: {
      "line-color": "Blue",
      "line-width": 10,
      "line-opacity": 0.1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeColor set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Red",
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Red",
      "line-width": 3,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeWeight set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeWeight: 1,
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Black",
      "line-width": 1,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call getDirections method on directionsrenderer", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  const result = testDirectionsRenderer.getDirections();

  expect(result).toBe(directions);
});

test("should not allow calling setDirections with multiple routes", () => {
  // TODO: This test can be removed in the future once/if we support multiple routes
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  expect(testDirectionsRenderer.getDirections()).toBeUndefined();
});

test("should call addEventListener method on directionsrenderer", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const handlerSpy = jest.fn();
  testDirectionsRenderer.addListener("directions_changed", handlerSpy);
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);
  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should return route with origin as LatLng and destination as LatLng", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(20, 21);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // LocationClient call should be the CalculateRouteCommand
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(origin, destination))).toStrictEqual(true);

    const legs = route.legs;

    expect(legs.length).toStrictEqual(1);

    const leg = legs[0];

    expect(leg.steps.length).toStrictEqual(3);
    expect(leg.start_location.equals(origin)).toStrictEqual(true);
    expect(leg.end_location.equals(destination)).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as LatLng and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(20, 21);

  const request = {
    origin: origin,
    destination: {
      location: destination,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // LocationClient call should be the CalculateRouteCommand
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(origin, destination))).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as Place.location and destination as LatLng", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(20, 21);

  const request = {
    origin: {
      location: origin,
    },
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // LocationClient call should be the CalculateRouteCommand
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(origin, destination))).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as Place.location and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(20, 21);

  const request = {
    origin: {
      location: origin,
    },
    destination: {
      location: destination,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // LocationClient call should be the CalculateRouteCommand
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(origin, destination))).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as string and destination as Place.query", (done) => {
  const request = {
    origin: "cool place",
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since both origin and destination were query inputs, these will both trigger a
    // findPlaceFromQuery request to retrieve the location geometry, so there
    // will be a total of 3 mocked LocationClient.send calls (2 for places, 1 for routes)
    expect(mockedClientSend).toHaveBeenCalledTimes(3);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(testCoolPlaceLocation, testAnotherCoolPlaceLocation))).toStrictEqual(
      true,
    );

    done();
  });
});

test("should return route with origin as Place.placeId and destination as Place.query", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin was a placeId and destination was a query input, these will trigger a
    // getDetails and findPlaceFromQuery request (respectively) to retrieve the location geometry,
    // so there will be a total of 3 mocked LocationClient.send calls (2 for places, 1 for routes)
    expect(mockedClientSend).toHaveBeenCalledTimes(3);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(new MigrationLatLngBounds(testCoolPlaceLocation, testAnotherCoolPlaceLocation))).toStrictEqual(
      true,
    );

    done();
  });
});

test("route should handle client error", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then((response) => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing findPlaceFromQuery origin request", (done) => {
  const request = {
    origin: clientErrorQuery,
    destination: {
      query: "cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then((response) => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing findPlaceFromQuery destination request", (done) => {
  const request = {
    origin: "cool place",
    destination: clientErrorQuery,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then((response) => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing getDetails destination request", (done) => {
  const request = {
    origin: "cool place",
    destination: {
      placeId: clientErrorPlaceId,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then((response) => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});
