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
import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "../src/common";

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
    if (command instanceof CalculateRouteMatrixCommand) {
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
import { LocationClient, CalculateRouteMatrixCommand } from "@aws-sdk/client-location";

const mockedPlacesClientSend = jest.fn((command) => {
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
      send: mockedPlacesClientSend,
    };
  }),
}));
import { GeoPlacesClient, GetPlaceCommand, SearchTextCommand } from "@aws-sdk/client-geo-places";

const testDeparturePosition = [-97.7335401, 30.2870699];
const testArrivalPosition = [-97.7385452, 30.3134151];
const testRouteBounds = new MigrationLatLngBounds({
  east: -97.7298,
  north: 30.31381,
  west: -97.738545,
  south: 30.28707,
});
const mockedRoutesClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof CalculateRoutesCommand) {
      if (JSON.stringify(command.input.Destination) == JSON.stringify(clientErrorDestinationPosition)) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          LegGeometryFormat: "Simple",
          Notices: [],
          Routes: [
            {
              Legs: [
                {
                  Geometry: {
                    LineString: [
                      [-97.73354, 30.28707],
                      [-97.73355, 30.28715],
                      [-97.73356, 30.28735],
                      [-97.73361, 30.28752],
                      [-97.7337, 30.28766],
                      [-97.73379, 30.28778],
                      [-97.73396, 30.28797],
                      [-97.73434, 30.28841],
                      [-97.73445, 30.28859],
                      [-97.7345, 30.2887],
                      [-97.73453, 30.28878],
                      [-97.73458, 30.28896],
                      [-97.73461, 30.28907],
                      [-97.73461, 30.28931],
                      [-97.73457, 30.28962],
                      [-97.73454, 30.28976],
                      [-97.73449, 30.29005],
                      [-97.73449, 30.29019],
                      [-97.73452, 30.29043],
                      [-97.73446, 30.29054],
                      [-97.73446, 30.29061],
                      [-97.73464, 30.29112],
                      [-97.73454, 30.29126],
                      [-97.73444, 30.29142],
                      [-97.73424, 30.29174],
                      [-97.73413, 30.29191],
                      [-97.73401, 30.2921],
                      [-97.73392, 30.29224],
                      [-97.73367, 30.29266],
                      [-97.73333, 30.29318],
                      [-97.73291, 30.29383],
                      [-97.73275, 30.29408],
                      [-97.73247, 30.29453],
                      [-97.73183, 30.29553],
                      [-97.73149, 30.29606],
                      [-97.73122, 30.29649],
                      [-97.73118, 30.29655],
                      [-97.73095, 30.29691],
                      [-97.73055, 30.29754],
                      [-97.7304, 30.29778],
                      [-97.73, 30.2984],
                      [-97.7298, 30.29872],
                      [-97.73016, 30.2989],
                      [-97.73075, 30.2992],
                      [-97.73093, 30.29929],
                      [-97.73154, 30.29957],
                      [-97.7321, 30.29984],
                      [-97.73268, 30.30012],
                      [-97.73312, 30.30033],
                      [-97.73343, 30.30048],
                      [-97.73357, 30.30055],
                      [-97.73392, 30.30071],
                      [-97.73415, 30.30082],
                      [-97.73441, 30.30094],
                      [-97.73454, 30.301],
                      [-97.73469, 30.30107],
                      [-97.73492, 30.30118],
                      [-97.73511, 30.30127],
                      [-97.73524, 30.30133],
                      [-97.73553, 30.30147],
                      [-97.73557, 30.30149],
                      [-97.73581, 30.30161],
                      [-97.73631, 30.30185],
                      [-97.73708, 30.30221],
                      [-97.73744, 30.30238],
                      [-97.73763, 30.30248],
                      [-97.73781, 30.30257],
                      [-97.73791, 30.30262],
                      [-97.73816, 30.30275],
                      [-97.73796, 30.30306],
                      [-97.73789, 30.30318],
                      [-97.73784, 30.30325],
                      [-97.73774, 30.30342],
                      [-97.73768, 30.30351],
                      [-97.73752, 30.30376],
                      [-97.73734, 30.30406],
                      [-97.73729, 30.30414],
                      [-97.73722, 30.30425],
                      [-97.73701, 30.30457],
                      [-97.73688, 30.30476],
                      [-97.73668, 30.30505],
                      [-97.73654, 30.30525],
                      [-97.7364, 30.30549],
                      [-97.73634, 30.30559],
                      [-97.73609, 30.30599],
                      [-97.73584, 30.30638],
                      [-97.73575, 30.30652],
                      [-97.73561, 30.30674],
                      [-97.73528, 30.30725],
                      [-97.73514, 30.30749],
                      [-97.73471, 30.30816],
                      [-97.73461, 30.30831],
                      [-97.73444, 30.30864],
                      [-97.73421, 30.30899],
                      [-97.73402, 30.30928],
                      [-97.73371, 30.30976],
                      [-97.73325, 30.31045],
                      [-97.73299, 30.31085],
                      [-97.73352, 30.31116],
                      [-97.73372, 30.31128],
                      [-97.7339, 30.31138],
                      [-97.73529, 30.31221],
                      [-97.73537, 30.31225],
                      [-97.73596, 30.31259],
                      [-97.73624, 30.31275],
                      [-97.7368, 30.31305],
                      [-97.73702, 30.31317],
                      [-97.73759, 30.31348],
                      [-97.73799, 30.31367],
                      [-97.7381, 30.31372],
                      [-97.73829, 30.31381],
                      [-97.73841, 30.31362],
                      [-97.738545, 30.313415],
                    ],
                  },
                  Language: "en-us",
                  TravelMode: "Car",
                  Type: "Vehicle",
                  VehicleLegDetails: {
                    Arrival: {
                      Place: {
                        OriginalPosition: [-97.73835, 30.31332],
                        Position: testArrivalPosition,
                      },
                    },
                    Departure: {
                      Place: {
                        OriginalPosition: [-97.7335401, 30.2870299],
                        Position: testDeparturePosition,
                      },
                    },
                    Incidents: [],
                    Notices: [],
                    PassThroughWaypoints: [],
                    Spans: [],
                    Summary: {
                      Overview: {
                        BestCaseDuration: 423,
                        Distance: 4047,
                        Duration: 423,
                        TypicalDuration: 423,
                      },
                      TravelOnly: {
                        BestCaseDuration: 423,
                        Duration: 423,
                        TypicalDuration: 423,
                      },
                    },
                    TollSystems: [],
                    Tolls: [],
                    TravelSteps: [
                      {
                        Distance: 403,
                        Duration: 74,
                        ExitNumber: [],
                        GeometryOffset: 0,
                        Instruction: "Head north on San Jacinto Blvd. Go for 403 m.",
                        Type: "Depart",
                      },
                      {
                        Distance: 1044,
                        Duration: 112,
                        ExitNumber: [],
                        GeometryOffset: 18,
                        Instruction: "Turn right onto Duval St. Go for 1.0 km.",
                        TurnStepDetails: {
                          Intersection: [],
                          SteeringDirection: "Right",
                          TurnIntensity: "Typical",
                        },
                        Type: "Turn",
                      },
                      {
                        Distance: 916,
                        Duration: 77,
                        ExitNumber: [],
                        GeometryOffset: 41,
                        Instruction: "Turn left onto E 38th St. Go for 916 m.",
                        TurnStepDetails: {
                          Intersection: [],
                          SteeringDirection: "Left",
                          TurnIntensity: "Typical",
                        },
                        Type: "Turn",
                      },
                      {
                        Distance: 1029,
                        Duration: 80,
                        ExitNumber: [],
                        GeometryOffset: 68,
                        Instruction: "Turn right onto Guadalupe St. Go for 1.0 km.",
                        TurnStepDetails: {
                          Intersection: [],
                          SteeringDirection: "Right",
                          TurnIntensity: "Typical",
                        },
                        Type: "Turn",
                      },
                      {
                        Distance: 605,
                        Duration: 62,
                        ExitNumber: [],
                        GeometryOffset: 97,
                        Instruction: "Turn left onto W 45th St. Go for 605 m.",
                        TurnStepDetails: {
                          Intersection: [],
                          SteeringDirection: "Left",
                          TurnIntensity: "Typical",
                        },
                        Type: "Turn",
                      },
                      {
                        Distance: 50,
                        Duration: 18,
                        ExitNumber: [],
                        GeometryOffset: 110,
                        Instruction: "Turn left. Go for 50 m.",
                        TurnStepDetails: {
                          Intersection: [],
                          SteeringDirection: "Left",
                          TurnIntensity: "Typical",
                        },
                        Type: "Turn",
                      },
                      {
                        Distance: 0,
                        Duration: 0,
                        ExitNumber: [],
                        GeometryOffset: 112,
                        Instruction: "Arrive at your destination on the left.",
                        Type: "Arrive",
                      },
                    ],
                    TruckRoadTypes: [],
                    Zones: [],
                  },
                },
              ],
              MajorRoadLabels: [
                {
                  RoadName: {
                    Language: "en",
                    Value: "Guadalupe St",
                  },
                },
                {
                  RoadName: {
                    Language: "en",
                    Value: "Duval St",
                  },
                },
              ],
              Summary: {
                Distance: 4047,
                Duration: 423,
              },
            },
          ],
        });
      }
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-geo-routes", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-routes"),
  GeoRoutesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedRoutesClientSend,
    };
  }),
}));
import { GeoRoutesClient, CalculateRoutesCommand, CalculateRoutesRequest } from "@aws-sdk/client-geo-routes";

const directionsService = new MigrationDirectionsService();
const distanceMatrixService = new MigrationDistanceMatrixService();
directionsService._client = new GeoRoutesClient();
distanceMatrixService._client = new LocationClient();

// The DirectionsService and DistanceMatrixService also uses the PlacesService in cases where the route is specified with a query string
// or PlaceId, so we need to set up a mocked one here.
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
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(testRouteBounds)).toStrictEqual(true);

    const legs = route.legs;

    expect(legs.length).toStrictEqual(1);

    const leg = legs[0];

    expect(leg.steps.length).toStrictEqual(7);
    expect(leg.start_location.equals(origin)).toStrictEqual(true);
    expect(leg.end_location.equals(destination)).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as LatLng and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: {
      location: destination,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as Place.location and destination as LatLng", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: {
      location: origin,
    },
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as Place.location and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

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
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

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
    // will be a total of 3 mocked send calls (2 for places, 1 for routes)
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

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
    // so there will be a total of 3 mocked send calls (2 for places, 1 for routes)
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

    const geocodedWaypoints = response.geocoded_waypoints;
    const routes = response.routes;
    expect(geocodedWaypoints?.length).toStrictEqual(2);
    expect(routes.length).toStrictEqual(1);

    const route = routes[0];
    const legs = route.legs;
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
      text: "4047 km",
      value: 4047000,
    });
    expect(steps.length).toStrictEqual(7);
    expect(duration).toStrictEqual({
      text: "8 mins",
      value: 423,
    });

    expect(start_address).toStrictEqual("cool place, austin, tx");
    expect(end_address).toStrictEqual("another cool place, austin, tx");
    expect(
      start_location.equals(new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0])),
    ).toStrictEqual(true);
    expect(end_location.equals(new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]))).toStrictEqual(
      true,
    );

    done();
  });
});

test("should return route with origin as LatLng and destination as LatLng with callback specified", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request, (results, status) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoPlacesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      const routes = results.routes;
      expect(routes.length).toStrictEqual(1);

      const route = routes[0];
      const legs = route.legs;

      expect(legs.length).toStrictEqual(1);

      const leg = legs[0];

      expect(leg.steps.length).toStrictEqual(7);
      expect(leg.start_location.equals(origin)).toStrictEqual(true);
      expect(leg.end_location.equals(destination)).toStrictEqual(true);

      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
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
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.Avoid?.Ferries).toStrictEqual(true);
    expect(clientInput.Avoid?.TollRoads).toStrictEqual(true);
    expect(clientInput.Avoid?.TollTransponders).toStrictEqual(true);

    done();
  });
});

test("should use correct travelMode when walking is specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.WALKING,
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.TravelMode).toStrictEqual("Pedestrian");

    done();
  });
});

test("should use correct departureTime when when drivingOptions are specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    drivingOptions: {
      departureTime: new Date("2020-04-22T17:57:24Z"),
    },
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.DepartureTime).toStrictEqual("2020-04-22T17:57:24.000Z");

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
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.Waypoints).toStrictEqual([
      {
        Position: [8, 7],
        PassThrough: false,
      },
    ]);

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
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      expect(clientInput.Waypoints).toStrictEqual([
        {
          Position: [8, 7],
          PassThrough: false,
        },
      ]);
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
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
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
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
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
