// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import {
  MigrationDirectionsRenderer,
  MigrationDirectionsService,
  MigrationDistanceMatrixService,
  TravelMode,
  UnitSystem,
  DistanceMatrixElementStatus,
  DistanceMatrixStatus,
} from "../src/directions";
import { MigrationPlacesService } from "../src/places";
import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "../src/googleCommon";

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

const mockedClientSendV1 = jest.fn((command) => {
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
              DurationSeconds: 12032,
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
                Categories: ["City"],
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
                Categories: ["City"],
              },
              PlaceId: "ANOTHER_COOL_PLACE",
            },
          ],
        });
      }
    } else if (command instanceof CalculateRouteMatrixCommand) {
      // checks if DestinationPositions array contains clientErrorDestinationPosition
      if (
        command.input.DestinationPositions?.some(
          (position) =>
            position.length === clientErrorDestinationPosition.length &&
            position.every((num, index) => num === clientErrorDestinationPosition[index]),
        )
      ) {
        resolve({});
      } else {
        resolve({
          RouteMatrix: [[{ Distance: 12, DurationSeconds: 24 }]],
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
      send: mockedClientSendV1,
    };
  }),
}));
import {
  LocationClient,
  CalculateRouteCommand,
  SearchPlaceIndexForTextCommand,
  CalculateRouteMatrixCommand,
} from "@aws-sdk/client-location";

const mockedClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof GetPlaceCommand) {
      if (command.input.PlaceId === undefined || command.input.PlaceId === clientErrorPlaceId) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Address: {
            Label: "cool place, austin, tx",
            Country: {
              Code2: "US",
              Code3: "USA",
              Name: "United States",
            },
            Region: {
              Code: "TX",
              Name: "Texas",
            },
            SubRegion: {
              Name: "Cool SubRegion",
            },
            Locality: "Austin",
            District: "Cool District",
            PostalCode: "78704",
            Street: "Cool Place Road",
            AddressNumber: "1337",
          },
          Contacts: {
            Phones: [
              {
                Value: "+15121234567",
              },
            ],
            Websites: [
              {
                Value: "https://coolwebsite.com",
              },
            ],
          },

          OpeningHours: [
            {
              Display: ["Mon-Sun: 00:00 - 24:00"],
              OpenNow: true,
              Components: [
                {
                  OpenTime: "T000000",
                  OpenDuration: "PT24H00M",
                  Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
                },
              ],
            },
          ],
          PlaceId: "KEEP_AUSTIN_WEIRD",
          PlaceType: "PointOfInterest",
          Position: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
          TimeZone: {
            Name: "America/Chicago",
            Offset: "-05:00",
            OffsetSeconds: -18000,
          },
          Title: "1337 Cool Place Road",
        });
      }
    } else if (command instanceof SearchTextCommand) {
      if (command.input.QueryText == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else if (command.input.QueryText == "cool place") {
        resolve({
          ResultItems: [
            {
              Address: {
                Label: "cool place, austin, tx",
              },
              Categories: [
                {
                  Name: "City",
                  LocalizedName: "City",
                  Id: "city",
                  Primary: true,
                },
              ],
              Position: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
              PlaceId: "KEEP_AUSTIN_WEIRD",
            },
          ],
        });
      } else if (command.input.QueryText == "another cool place") {
        resolve({
          ResultItems: [
            {
              Address: {
                Label: "another cool place, austin, tx",
              },
              Categories: [
                {
                  Name: "City",
                  LocalizedName: "City",
                  Id: "city",
                  Primary: true,
                },
              ],
              Position: [testAnotherCoolPlaceLocation.lng(), testAnotherCoolPlaceLocation.lat()],
              PlaceId: "ANOTHER_COOL_PLACE",
            },
          ],
        });
      }
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-geo-places", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-places"),
  GeoPlacesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedClientSend,
    };
  }),
}));
import { GeoPlacesClient, GetPlaceCommand, SearchTextCommand } from "@aws-sdk/client-geo-places";

const directionsService = new MigrationDirectionsService();
const distanceMatrixService = new MigrationDistanceMatrixService();
directionsService._client = new LocationClient();
distanceMatrixService._client = new LocationClient();

// The DirectionsService and DistanceMatrixService also uses the PlacesService in cases where the route is specified with a query string
// or PlaceId, so we need to set up a mocked one here.
MigrationPlacesService.prototype._clientV1 = new LocationClient();
MigrationPlacesService.prototype._client = new GeoPlacesClient();
directionsService._placesService = new MigrationPlacesService();
distanceMatrixService._placesService = new MigrationPlacesService();

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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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
  expect(mockAddSource).toHaveBeenCalledWith("route0", {
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
    id: "route0",
    type: "line",
    source: "route0",
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

test("should clear directions when directionsrenderer removed from map", () => {
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
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);

  // Clear the directions (remove from map)
  testDirectionsRenderer.setMap(null);

  expect(testDirectionsRenderer.getMap()).toBeNull();
  expect(mockRemoveSource).toHaveBeenCalledTimes(1);
  expect(mockRemoveLayer).toHaveBeenCalledTimes(1);
  expect(testDirectionsRenderer._getMarkers().length).toBe(0);
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

test("should call setDirections with a route that contains multiple legs and create multiple markers", () => {
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
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 0, lng: 0 },
                end_location: { lat: 1, lng: 1 },
              },
            ],
          },
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 1, lng: 1 },
                end_location: { lat: 2, lng: 2 },
              },
            ],
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  expect(testDirectionsRenderer._getMarkers().length).toBe(3);
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

test("should return undefined for addEventListener method with invalid listenerType", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const handlerSpy = jest.fn();
  const listener = testDirectionsRenderer.addListener("directions_changed", handlerSpy, "");

  expect(handlerSpy).toHaveBeenCalledTimes(0);
  expect(listener).toBeUndefined();
});

test("should get new directions in handler when directions_changed event", (done) => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const firstDirections = {
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
  const secondDirections = {
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
  };
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: firstDirections,
  });
  const handler = () => {
    // directions should be set to new directions by the time you can call 'getDirections'
    expect(testDirectionsRenderer.getDirections()).toBe(secondDirections);
    done();
  };
  testDirectionsRenderer.addListener("directions_changed", handler);
  testDirectionsRenderer.setDirections(secondDirections);
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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));
    expect(mockedClientSend).toHaveBeenCalledTimes(2);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));

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
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledTimes(2);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

    const geocodedWaypoints = response.geocoded_waypoints;
    const routes = response.routes;
    expect(geocodedWaypoints?.length).toStrictEqual(2);
    expect(routes.length).toStrictEqual(1);

    const route = routes[0];
    const bounds = route.bounds;
    const legs = route.legs;
    expect(bounds.equals(new MigrationLatLngBounds(testCoolPlaceLocation, testAnotherCoolPlaceLocation))).toStrictEqual(
      true,
    );
    expect(legs.length).toStrictEqual(1);

    const leg = legs[0];
    const distance = leg.distance;
    const steps = leg.steps;
    const duration = leg.duration;
    const start_address = leg.start_address;
    const end_address = leg.end_address;
    const start_location = leg.start_location;
    const end_location = leg.end_location;
    expect(distance).toStrictEqual({
      text: "9001 km",
      value: 9001000,
    });
    expect(steps.length).toStrictEqual(3);
    expect(duration).toStrictEqual({
      text: "3 hours 21 mins",
      value: 12032,
    });
    expect(start_address).toStrictEqual("cool place, austin, tx");
    expect(end_address).toStrictEqual("another cool place, austin, tx");
    expect(start_location.equals(new MigrationLatLng(testCoolPlaceLocation))).toStrictEqual(true);
    expect(end_location.equals(new MigrationLatLng(testAnotherCoolPlaceLocation))).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as LatLng and destination as LatLng with callback specified", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(20, 21);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request, (results, status) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // LocationClient call should be the CalculateRouteCommand
      expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
      expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteCommand));

      const routes = results.routes;

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

      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
      done();
    });
});

test("should call route with options travel mode set to walking and unit system set to imperial", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.WALKING,
    unitSystem: UnitSystem.IMPERIAL,
  };

  directionsService.route(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          DeparturePosition: [4, 3],
          DestinationPosition: [8, 7],
          IncludeLegGeometry: true,
          TravelMode: "Walking",
        },
      }),
    );

    done();
  });
});

test("should call route with options travel mode set to driving and unit system set to metric", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    unitSystem: UnitSystem.METRIC,
    drivingOptions: {
      departureTime: new Date("2000-01-01"),
    },
  };

  directionsService.route(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          DeparturePosition: [4, 3],
          DepartureTime: new Date("2000-01-01"),
          DestinationPosition: [8, 7],
          IncludeLegGeometry: true,
          TravelMode: "Car",
        },
      }),
    );

    done();
  });
});

test("should call route with options avoidFerries set to true and avoidTolls set to true", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    avoidFerries: true,
    avoidTolls: true,
  };

  directionsService.route(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          CarModeOptions: { AvoidFerries: true, AvoidTolls: true },
          DeparturePosition: [4, 3],
          DestinationPosition: [8, 7],
          IncludeLegGeometry: true,
          TravelMode: "Car",
        },
      }),
    );

    done();
  });
});

test("should call route with option waypoints set", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService.route(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          DeparturePosition: [4, 3],
          DestinationPosition: [8, 7],
          IncludeLegGeometry: true,
          TravelMode: "Car",
          WaypointPositions: [[8, 7]],
        },
      }),
    );

    done();
  });
});

test("should call route with option waypoints set and callback specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService
    .route(request, (_, status) => {
      expect(mockedClientSendV1).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            CalculatorName: undefined,
            DeparturePosition: [4, 3],
            DestinationPosition: [8, 7],
            IncludeLegGeometry: true,
            TravelMode: "Car",
            WaypointPositions: [[8, 7]],
          },
        }),
      );
      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
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
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error with waypoint specified", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService
    .route(request)
    .then(() => {})
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
    .then(() => {})
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
    .then(() => {})
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
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing getDetails waypoint request", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          placeId: clientErrorPlaceId,
        },
      },
    ],
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("should return getDistanceMatrix with origin as Place.placeId and destination as Place.query", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService.getDistanceMatrix(request).then((response) => {
    // Since origin was a placeId and destination was a query input, these will trigger a
    // getDetails and findPlaceFromQuery request (respectively) to retrieve the location geometry,
    // so there will be a total of 3 mocked LocationClient.send calls (2 for places, 1 for distance matrix)
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledTimes(2);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
    expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

    const rows = response.rows;
    expect(rows.length).toStrictEqual(1);

    const row = rows[0];
    expect(row.elements.length).toStrictEqual(1);

    const element = row.elements[0];
    expect(element.distance).toStrictEqual({
      text: "12 km",
      value: 12000,
    });
    expect(element.duration).toStrictEqual({
      text: "1 min",
      value: 24,
    });
    expect(element.status).toStrictEqual(DistanceMatrixElementStatus.OK);

    done();
  });
});

test("should call getDistanceMatrix with options avoidFerries set to true and avoidTolls set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidFerries: true,
    avoidTolls: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          CarModeOptions: { AvoidFerries: true, AvoidTolls: true },
          DeparturePositions: [[4, 3]],
          DestinationPositions: [[8, 7]],
          TravelMode: "Car",
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options travel mode set to driving, unit system set to metric, and departureTime set", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    unitSystem: UnitSystem.METRIC,
    drivingOptions: {
      departureTime: new Date("2000-01-01"),
    },
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          DeparturePositions: [[4, 3]],
          DepartureTime: new Date("2000-01-01"),
          DestinationPositions: [[8, 7]],
          TravelMode: "Car",
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options travel mode set to walking and unit system set to imperial", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.WALKING,
    unitSystem: UnitSystem.IMPERIAL,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedClientSendV1).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          CalculatorName: undefined,
          DeparturePositions: [[4, 3]],
          DestinationPositions: [[8, 7]],
          TravelMode: "Walking",
        },
      }),
    );

    done();
  });
});

test("getDistanceMatrix should handle client error when performing getDetails destination request", (done) => {
  const request = {
    origins: ["cool place"],
    destinations: [
      {
        placeId: clientErrorPlaceId,
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      done();
    });
});

test("getDistanceMatrix should handle client error when performing findPlaceFromQuery origin request", (done) => {
  const request = {
    origins: [clientErrorQuery],
    destinations: [
      {
        query: "cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      done();
    });
});

test("getDistanceMatrix should handle client error", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origins: [origin],
    destinations: [destination],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("getDistanceMatrix will invoke the callback if specified", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request, (results, status) => {
      expect(mockedClientSendV1).toHaveBeenCalledTimes(1);
      expect(mockedClientSend).toHaveBeenCalledTimes(2);
      expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
      expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
      expect(mockedClientSendV1).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

      const rows = results.rows;
      expect(rows.length).toStrictEqual(1);

      const row = rows[0];
      expect(row.elements.length).toStrictEqual(1);

      const element = row.elements[0];
      expect(element.distance).toStrictEqual({
        text: "12 km",
        value: 12000,
      });
      expect(element.duration).toStrictEqual({
        text: "1 min",
        value: 24,
      });
      expect(element.status).toStrictEqual(DistanceMatrixElementStatus.OK);

      expect(status).toStrictEqual(DistanceMatrixStatus.OK);
    })
    .then(() => {
      done();
    });
});
