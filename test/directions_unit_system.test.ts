// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationDirectionsService, MigrationDistanceMatrixService, TravelMode } from "../src/directions";
import { MigrationPlacesService } from "../src/places";

// The following positions are in [lng, lat] format
const usaPosition = [-97.7289, 30.2784];
const liberiaPosition = [-11.530496, 6.842682];
const myanmarPosition = [97.11259, 19.647565];
const francePosition = [2.3522, 48.8566];

const mockedPlacesClientSend = jest.fn(() => {
  return new Promise((resolve) => {
    // For distance matrix tests, we just need to handle ReverseGeocodeCommand
    // since the coordinates are already parsed as lat/lng objects
    resolve({
      ResultItems: [
        {
          Address: {
            Label: "Test Address",
          },
        },
      ],
    });
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

const mockedRoutesClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof CalculateRoutesCommand) {
      if (JSON.stringify(command.input.Origin) == JSON.stringify(usaPosition)) {
        const mockRouteResponse: CalculateRoutesResponse = {
          LegGeometryFormat: GeometryFormat.SIMPLE,
          Notices: [],
          PricingBucket: "DummyBucket",
          Routes: [
            {
              Legs: [
                {
                  VehicleLegDetails: {
                    Arrival: {
                      Place: {
                        OriginalPosition: [-97.73835, 30.31332],
                        Position: [-97.7385452, 30.3134151],
                      },
                    },
                    Departure: {
                      Place: {
                        OriginalPosition: [-97.7335401, 30.2870299],
                        Position: [-97.7335401, 30.2870699],
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
                    ],
                    TruckRoadTypes: [],
                    Zones: [],
                  },
                  Geometry: {
                    LineString: [
                      [-97.7289, 30.2784],
                      [-97.7281, 30.2849],
                    ],
                  },
                  Language: "en-us",
                  TravelMode: "Car",
                  Type: "Vehicle",
                },
              ],
              MajorRoadLabels: [
                {
                  RoadName: {
                    Language: "en",
                    Value: "Guadalupe St",
                  },
                },
              ],
              Summary: {
                Distance: 1931,
                Duration: 240,
              },
            },
          ],
        };

        resolve(mockRouteResponse);
      } else if (JSON.stringify(command.input.Origin) == JSON.stringify(liberiaPosition)) {
        const mockRouteResponse: CalculateRoutesResponse = {
          LegGeometryFormat: GeometryFormat.SIMPLE,
          Notices: [],
          PricingBucket: "DummyBucket",
          Routes: [
            {
              Legs: [
                {
                  VehicleLegDetails: {
                    Arrival: {
                      Place: {
                        OriginalPosition: [-11.393328, 6.718845],
                        Position: [-11.393328, 6.718845],
                      },
                    },
                    Departure: {
                      Place: {
                        OriginalPosition: [-11.530496, 6.842682],
                        Position: [-11.530496, 6.842682],
                      },
                    },
                    Incidents: [],
                    Notices: [],
                    PassThroughWaypoints: [],
                    Spans: [],
                    Summary: {
                      Overview: {
                        BestCaseDuration: 600,
                        Distance: 8000,
                        Duration: 600,
                        TypicalDuration: 600,
                      },
                      TravelOnly: {
                        BestCaseDuration: 600,
                        Duration: 600,
                        TypicalDuration: 600,
                      },
                    },
                    TollSystems: [],
                    Tolls: [],
                    TravelSteps: [
                      {
                        Distance: 1200,
                        Duration: 120,
                        ExitNumber: [],
                        GeometryOffset: 0,
                        Instruction: "Head northeast. Go for 1200 m.",
                        Type: "Depart",
                      },
                    ],
                    TruckRoadTypes: [],
                    Zones: [],
                  },
                  Geometry: {
                    LineString: [
                      [-11.530496, 6.842682],
                      [-11.393328, 6.718845],
                    ],
                  },
                  Language: "en-us",
                  TravelMode: "Car",
                  Type: "Vehicle",
                },
              ],
              MajorRoadLabels: [
                {
                  RoadName: {
                    Language: "en",
                    Value: "Main Road",
                  },
                },
              ],
              Summary: {
                Distance: 8000,
                Duration: 600,
              },
            },
          ],
        };
        resolve(mockRouteResponse);
      } else if (JSON.stringify(command.input.Origin) == JSON.stringify(myanmarPosition)) {
        const mockRouteResponse: CalculateRoutesResponse = {
          LegGeometryFormat: GeometryFormat.SIMPLE,
          Notices: [],
          PricingBucket: "DummyBucket",
          Routes: [
            {
              Legs: [
                {
                  VehicleLegDetails: {
                    Arrival: {
                      Place: {
                        OriginalPosition: [97.11542, 19.65123],
                        Position: [97.11542, 19.65123],
                      },
                    },
                    Departure: {
                      Place: {
                        OriginalPosition: [97.11259, 19.647565],
                        Position: [97.11259, 19.647565],
                      },
                    },
                    Incidents: [],
                    Notices: [],
                    PassThroughWaypoints: [],
                    Spans: [],
                    Summary: {
                      Overview: {
                        BestCaseDuration: 900,
                        Distance: 12000,
                        Duration: 900,
                        TypicalDuration: 900,
                      },
                      TravelOnly: {
                        BestCaseDuration: 900,
                        Duration: 900,
                        TypicalDuration: 900,
                      },
                    },
                    TollSystems: [],
                    Tolls: [],
                    TravelSteps: [
                      {
                        Distance: 800,
                        Duration: 90,
                        ExitNumber: [],
                        GeometryOffset: 0,
                        Instruction: "Head northeast. Go for 800 m.",
                        Type: "Depart",
                      },
                    ],
                    TruckRoadTypes: [],
                    Zones: [],
                  },
                  Geometry: {
                    LineString: [
                      [97.11259, 19.647565],
                      [97.11542, 19.65123],
                    ],
                  },
                  Language: "en-us",
                  TravelMode: "Car",
                  Type: "Vehicle",
                },
              ],
              MajorRoadLabels: [
                {
                  RoadName: {
                    Language: "en",
                    Value: "Highway 1",
                  },
                },
              ],
              Summary: {
                Distance: 12000,
                Duration: 900,
              },
            },
          ],
        };
        resolve(mockRouteResponse);
      } else if (JSON.stringify(command.input.Origin) == JSON.stringify(francePosition)) {
        const mockRouteResponse: CalculateRoutesResponse = {
          LegGeometryFormat: GeometryFormat.SIMPLE,
          Notices: [],
          PricingBucket: "DummyBucket",
          Routes: [
            {
              Legs: [
                {
                  VehicleLegDetails: {
                    Arrival: {
                      Place: {
                        OriginalPosition: [2.3376, 48.8606],
                        Position: [2.3376, 48.8606],
                      },
                    },
                    Departure: {
                      Place: {
                        OriginalPosition: [2.3522, 48.8566],
                        Position: [2.3522, 48.8566],
                      },
                    },
                    Incidents: [],
                    Notices: [],
                    PassThroughWaypoints: [],
                    Spans: [],
                    Summary: {
                      Overview: {
                        BestCaseDuration: 480,
                        Distance: 6500,
                        Duration: 480,
                        TypicalDuration: 480,
                      },
                      TravelOnly: {
                        BestCaseDuration: 480,
                        Duration: 480,
                        TypicalDuration: 480,
                      },
                    },
                    TollSystems: [],
                    Tolls: [],
                    TravelSteps: [
                      {
                        Distance: 950,
                        Duration: 85,
                        ExitNumber: [],
                        GeometryOffset: 0,
                        Instruction: "Head west. Go for 950 m.",
                        Type: "Depart",
                      },
                    ],
                    TruckRoadTypes: [],
                    Zones: [],
                  },
                  Geometry: {
                    LineString: [
                      [2.3522, 48.8566],
                      [2.3376, 48.8606],
                    ],
                  },
                  Language: "en-us",
                  TravelMode: "Car",
                  Type: "Vehicle",
                },
              ],
              MajorRoadLabels: [
                {
                  RoadName: {
                    Language: "fr",
                    Value: "Rue de Rivoli",
                  },
                },
              ],
              Summary: {
                Distance: 6500,
                Duration: 480,
              },
            },
          ],
        };
        resolve(mockRouteResponse);
      } else {
        resolve({});
      }
    } else if (command instanceof CalculateRouteMatrixCommand) {
      // Handle distance matrix requests based on origin position
      const originPosition = command.input.Origins?.[0]?.Position;

      if (JSON.stringify(originPosition) === JSON.stringify(usaPosition)) {
        resolve({
          RouteMatrix: [[{ Distance: 4047, DurationSeconds: 423 }]],
        });
      } else if (JSON.stringify(originPosition) === JSON.stringify(myanmarPosition)) {
        resolve({
          RouteMatrix: [[{ Distance: 12000, DurationSeconds: 900 }]],
        });
      } else if (JSON.stringify(originPosition) === JSON.stringify(liberiaPosition)) {
        resolve({
          RouteMatrix: [[{ Distance: 8000, DurationSeconds: 600 }]],
        });
      } else if (JSON.stringify(originPosition) === JSON.stringify(francePosition)) {
        resolve({
          RouteMatrix: [[{ Distance: 6500, DurationSeconds: 480 }]],
        });
      } else {
        resolve({});
      }
    } else {
      reject(new Error("Unknown command"));
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
import {
  GeoRoutesClient,
  CalculateRoutesCommand,
  CalculateRouteMatrixCommand,
  CalculateRoutesResponse,
  GeometryFormat,
} from "@aws-sdk/client-geo-routes";

const directionsService = new MigrationDirectionsService();
const distanceMatrixService = new MigrationDistanceMatrixService();
directionsService._client = new GeoRoutesClient();
distanceMatrixService._client = new GeoRoutesClient();

// The DistanceMatrixService uses the PlacesService to ReverseGeocode coordinates to addresses so we need to set up a mocked one here.
import { GeoPlacesClient } from "@aws-sdk/client-geo-places";
MigrationPlacesService.prototype._client = new GeoPlacesClient();
distanceMatrixService._placesService = new MigrationPlacesService();

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

describe("directionsService route unit system tests", () => {
  test("should return imperial distance when directions are in USA", (done) => {
    const request = {
      origin: { lat: 30.2784, lng: -97.7289 },
      destination: { lat: 30.2849, lng: -97.7281 },
      travelMode: TravelMode.DRIVING,
    };

    directionsService.route(request).then((response) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoRoutesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      expect(response.routes[0].legs[0].distance.text).toContain("2.5 mi");
      expect(response.routes[0].legs[0].distance.value).toBe(4047);

      expect(response.routes[0].legs[0].steps[0].distance.text).toContain("0.3 mi");
      expect(response.routes[0].legs[0].steps[0].distance.value).toBe(403);

      done();
    });
  });

  test("should return imperial distance when directions are in Myanmar", (done) => {
    const request = {
      origin: { lat: 19.647565, lng: 97.11259 },
      destination: { lat: 19.65123, lng: 97.11542 },
      travelMode: TravelMode.DRIVING,
    };

    directionsService.route(request).then((response) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoRoutesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      expect(response.routes[0].legs[0].distance.text).toContain("7.5 mi");
      expect(response.routes[0].legs[0].distance.value).toBe(12000);

      expect(response.routes[0].legs[0].steps[0].distance.text).toContain("0.5 mi");
      expect(response.routes[0].legs[0].steps[0].distance.value).toBe(800);

      done();
    });
  });

  test("should return imperial distance when directions are in Liberia", (done) => {
    const request = {
      origin: { lat: 6.842682, lng: -11.530496 },
      destination: { lat: 6.718845, lng: -11.393328 },
      travelMode: TravelMode.DRIVING,
    };

    directionsService.route(request).then((response) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoRoutesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      expect(response.routes[0].legs[0].distance.text).toContain("5.0 mi");
      expect(response.routes[0].legs[0].distance.value).toBe(8000);

      expect(response.routes[0].legs[0].steps[0].distance.text).toContain("0.7 mi");
      expect(response.routes[0].legs[0].steps[0].distance.value).toBe(1200);

      done();
    });
  });

  test("should return metric distance when directions are not in USA, Myanmar, Liberia", (done) => {
    const request = {
      origin: { lat: 48.8566, lng: 2.3522 }, // Paris, France
      destination: { lat: 48.8606, lng: 2.3376 },
      travelMode: TravelMode.DRIVING,
    };

    directionsService.route(request).then((response) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoRoutesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      expect(response.routes[0].legs[0].distance.text).toContain("6.5 km");
      expect(response.routes[0].legs[0].distance.value).toBe(6500);

      expect(response.routes[0].legs[0].steps[0].distance.text).toContain("950 m");
      expect(response.routes[0].legs[0].steps[0].distance.value).toBe(950);

      done();
    });
  });
});

describe("distanceMatrixService getDistanceMatrix unit system tests", () => {
  test("should return imperial distance when distance matrix is in USA", (done) => {
    const request = {
      origins: [{ lat: 30.2784, lng: -97.7289 }],
      destinations: [{ lat: 30.2849, lng: -97.7281 }],
      travelMode: TravelMode.DRIVING,
    };

    distanceMatrixService.getDistanceMatrix(request).then((response) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

      expect(response.rows[0].elements[0].distance.text).toContain("2.5 mi");
      expect(response.rows[0].elements[0].distance.value).toBe(4047);

      done();
    });
  });

  test("should return imperial distance when distance matrix is in Myanmar", (done) => {
    const request = {
      origins: [{ lat: 19.647565, lng: 97.11259 }],
      destinations: [{ lat: 19.65123, lng: 97.11542 }],
      travelMode: TravelMode.DRIVING,
    };

    distanceMatrixService.getDistanceMatrix(request).then((response) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

      expect(response.rows[0].elements[0].distance.text).toContain("7.5 mi");
      expect(response.rows[0].elements[0].distance.value).toBe(12000);

      done();
    });
  });

  test("should return imperial distance when distance matrix is in Liberia", (done) => {
    const request = {
      origins: [{ lat: 6.842682, lng: -11.530496 }],
      destinations: [{ lat: 6.718845, lng: -11.393328 }],
      travelMode: TravelMode.DRIVING,
    };

    distanceMatrixService.getDistanceMatrix(request).then((response) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

      expect(response.rows[0].elements[0].distance.text).toContain("5.0 mi");
      expect(response.rows[0].elements[0].distance.value).toBe(8000);

      done();
    });
  });

  test("should return metric distance when distance matrix is not in USA, Myanmar, Liberia", (done) => {
    const request = {
      origins: [{ lat: 48.8566, lng: 2.3522 }], // Paris, France
      destinations: [{ lat: 48.8606, lng: 2.3376 }],
      travelMode: TravelMode.DRIVING,
    };

    distanceMatrixService.getDistanceMatrix(request).then((response) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));

      expect(response.rows[0].elements[0].distance.text).toContain("6.5 km");
      expect(response.rows[0].elements[0].distance.value).toBe(6500);

      done();
    });
  });
});
