// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationDirectionsService, TravelMode } from "../src/directions";
import { MigrationPlacesService } from "../src/places";
import { MigrationLatLng, DirectionsStatus } from "../src/common";
import {
  CalculateRoutesCommand,
  CalculateRoutesRequest,
  GeoRoutesClient,
  OptimizeWaypointsCommand,
  OptimizeWaypointsRequest,
} from "@aws-sdk/client-geo-routes";

// Mock locations for testing
const originLocation = new MigrationLatLng(30.2784, -97.7289); // Austin
const destinationLocation = new MigrationLatLng(30.2672, -97.7431); // Downtown Austin
const waypoint1Location = new MigrationLatLng(30.2983, -97.7481); // North Austin
const waypoint2Location = new MigrationLatLng(30.25, -97.75); // South Austin
const waypoint3Location = new MigrationLatLng(30.28, -97.76); // West Austin

// Mock client send function
const mockedRoutesClientSend = jest.fn((command) => {
  return new Promise((resolve) => {
    if (command instanceof OptimizeWaypointsCommand) {
      // Return optimized waypoints in a different order (2, 0, 1)
      resolve({
        OptimizedWaypoints: [
          { Id: "Origin", Position: [-97.7289, 30.2784] },
          { Id: "2", Position: [-97.75, 30.25] },
          { Id: "0", Position: [-97.7481, 30.2983] },
          { Id: "1", Position: [-97.76, 30.28] },
          { Id: "Destination", Position: [-97.7431, 30.2672] },
        ],
      });
    } else if (command instanceof CalculateRoutesCommand) {
      // Return a mock route response
      resolve({
        Routes: [
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.7289, 30.2784],
                    [-97.7431, 30.2672],
                  ],
                },
                VehicleLegDetails: {
                  Arrival: {
                    Place: {
                      Position: [-97.7431, 30.2672],
                    },
                  },
                  Departure: {
                    Place: {
                      Position: [-97.7289, 30.2784],
                    },
                  },
                  Summary: {
                    Overview: {
                      Distance: 5000,
                      Duration: 600,
                    },
                    TravelOnly: {
                      Duration: 600,
                    },
                  },
                  TravelSteps: [
                    {
                      Distance: 5000,
                      Duration: 600,
                      GeometryOffset: 0,
                      Instruction: "Head south",
                      Type: "Depart",
                    },
                  ],
                },
              },
            ],
            MajorRoadLabels: [
              {
                RoadName: {
                  Language: "en",
                  Value: "Main St",
                },
              },
            ],
            Summary: {
              Distance: 5000,
              Duration: 600,
            },
          },
        ],
      });
    }
  });
});

// Mock the GeoRoutesClient
jest.mock("@aws-sdk/client-geo-routes", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-routes"),
  GeoRoutesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedRoutesClientSend,
    };
  }),
}));

// Mock the PlacesService to return predefined locations
const mockFindPlaceFromQuery = jest.fn((request, callback) => {
  const query = request.query;
  let location;

  if (query === "origin") {
    location = originLocation;
  } else if (query === "destination") {
    location = destinationLocation;
  } else if (query === "waypoint1") {
    location = waypoint1Location;
  } else if (query === "waypoint2") {
    location = waypoint2Location;
  } else if (query === "waypoint3") {
    location = waypoint3Location;
  }

  callback(
    [
      {
        geometry: {
          location: location,
        },
        place_id: `place_id_${query}`,
        formatted_address: `Address for ${query}`,
      },
    ],
    "OK",
  );
});

// Setup the services
const directionsService = new MigrationDirectionsService();
directionsService._client = new GeoRoutesClient();
directionsService._placesService = {
  findPlaceFromQuery: mockFindPlaceFromQuery,
} as unknown as MigrationPlacesService;

describe("directionsService route waypoint optimization tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call OptimizeWaypoints API when optimizeWaypoints is true", (done) => {
    const request: google.maps.DirectionsRequest = {
      origin: { query: "origin" },
      destination: { query: "destination" },
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: true,
      waypoints: [
        { location: { query: "waypoint1" } },
        { location: { query: "waypoint2" } },
        { location: { query: "waypoint3" } },
      ],
    };

    directionsService.route(request).then((response) => {
      // Verify OptimizeWaypoints API was called
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(OptimizeWaypointsCommand));

      // Verify the OptimizeWaypoints request parameters
      const optimizeInput: OptimizeWaypointsRequest = mockedRoutesClientSend.mock.calls[0][0].input;
      expect(optimizeInput.Origin).toEqual([-97.7289, 30.2784]);
      expect(optimizeInput.Destination).toEqual([-97.7431, 30.2672]);
      expect(optimizeInput.Waypoints).toHaveLength(3);

      // Verify that the waypoints in the OptimizeWaypoints request have the correct IDs
      expect(optimizeInput.Waypoints[0].Id).toBe("0");
      expect(optimizeInput.Waypoints[1].Id).toBe("1");
      expect(optimizeInput.Waypoints[2].Id).toBe("2");

      // Verify that the waypoints in the OptimizeWaypoints request have the correct positions
      expect(optimizeInput.Waypoints[0].Position).toEqual([-97.7481, 30.2983]); // waypoint1
      expect(optimizeInput.Waypoints[1].Position).toEqual([-97.75, 30.25]); // waypoint2
      expect(optimizeInput.Waypoints[2].Position).toEqual([-97.76, 30.28]); // waypoint3

      // Verify CalculateRoutes API was called with optimized waypoints
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const routeInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[1][0].input;

      // Waypoints should be in the optimized order (based on the mock response)
      expect(routeInput.Waypoints).toEqual([
        { Position: [-97.75, 30.25], PassThrough: false }, // waypoint2 (index 2 in optimized order)
        { Position: [-97.7481, 30.2983], PassThrough: false }, // waypoint1 (index 0 in optimized order)
        { Position: [-97.76, 30.28], PassThrough: false }, // waypoint3 (index 1 in optimized order)
      ]);

      // Verify the waypoints are in the correct order by checking each one individually
      expect(routeInput.Waypoints[0].Position).toEqual([-97.75, 30.25]); // waypoint2
      expect(routeInput.Waypoints[1].Position).toEqual([-97.7481, 30.2983]); // waypoint1
      expect(routeInput.Waypoints[2].Position).toEqual([-97.76, 30.28]); // waypoint3

      // Verify the response contains the correct waypoint_order
      expect(response.routes[0].waypoint_order).toEqual([2, 0, 1]);

      // Verify that the waypoint_order array corresponds to the correct reordering
      // Original order: [waypoint1, waypoint2, waypoint3]
      // Optimized order: [waypoint2, waypoint1, waypoint3]
      // So the waypoint_order should be [2, 0, 1] (indices of original array in new order)
      const originalWaypoints = [
        { query: "waypoint1", position: [-97.7481, 30.2983] },
        { query: "waypoint2", position: [-97.75, 30.25] },
        { query: "waypoint3", position: [-97.76, 30.28] },
      ];

      const optimizedOrder = response.routes[0].waypoint_order;
      expect(originalWaypoints[optimizedOrder[0]].query).toBe("waypoint3");
      expect(originalWaypoints[optimizedOrder[1]].query).toBe("waypoint1");
      expect(originalWaypoints[optimizedOrder[2]].query).toBe("waypoint2");

      done();
    });
  });

  test("should not call OptimizeWaypoints API when optimizeWaypoints is false", (done) => {
    const request: google.maps.DirectionsRequest = {
      origin: { query: "origin" },
      destination: { query: "destination" },
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: false,
      waypoints: [
        { location: { query: "waypoint1" } },
        { location: { query: "waypoint2" } },
        { location: { query: "waypoint3" } },
      ],
    };

    directionsService.route(request).then((response) => {
      // Verify OptimizeWaypoints API was not called
      expect(mockedRoutesClientSend).not.toHaveBeenCalledWith(expect.any(OptimizeWaypointsCommand));

      // Verify CalculateRoutes API was called with original waypoint order
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const routeInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      // Waypoints should be in the original order
      expect(routeInput.Waypoints).toEqual([
        { Position: [-97.7481, 30.2983], PassThrough: false },
        { Position: [-97.75, 30.25], PassThrough: false },
        { Position: [-97.76, 30.28], PassThrough: false },
      ]);

      // Verify that the waypoint_order array is empty since no optimization was performed
      expect(response.routes[0].waypoint_order).toEqual([]);

      done();
    });
  });

  test("should not optimize waypoints when any waypoint has stopover set to false", (done) => {
    const request: google.maps.DirectionsRequest = {
      origin: { query: "origin" },
      destination: { query: "destination" },
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: true, // Even though this is true, it should not optimize
      waypoints: [
        { location: { query: "waypoint1" } },
        { location: { query: "waypoint2" }, stopover: false }, // This should prevent optimization
        { location: { query: "waypoint3" } },
      ],
    };

    directionsService.route(request).then(() => {
      // Verify OptimizeWaypoints API was not called
      expect(mockedRoutesClientSend).not.toHaveBeenCalledWith(expect.any(OptimizeWaypointsCommand));

      // Verify CalculateRoutes API was called with original waypoint order
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const routeInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      // Waypoints should be in the original order with correct PassThrough values
      expect(routeInput.Waypoints).toEqual([
        { Position: [-97.7481, 30.2983], PassThrough: false },
        { Position: [-97.75, 30.25], PassThrough: true }, // This one has PassThrough: true
        { Position: [-97.76, 30.28], PassThrough: false },
      ]);

      done();
    });
  });

  test("should handle empty waypoints array with optimizeWaypoints set to true", (done) => {
    const request: google.maps.DirectionsRequest = {
      origin: { query: "origin" },
      destination: { query: "destination" },
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: true,
      waypoints: [], // Empty waypoints array
    };

    directionsService.route(request).then(() => {
      // Verify OptimizeWaypoints API was not called (no waypoints to optimize)
      expect(mockedRoutesClientSend).not.toHaveBeenCalledWith(expect.any(OptimizeWaypointsCommand));

      // Verify CalculateRoutes API was called without waypoints
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const routeInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      // Waypoints should be an empty array
      expect(routeInput.Waypoints).toEqual([]);

      done();
    });
  });
});
test("should handle OptimizeWaypoints API failure", (done) => {
  // Mock the client to reject the OptimizeWaypoints call
  mockedRoutesClientSend.mockImplementationOnce(() => {
    return Promise.reject(new Error("OptimizeWaypoints API error"));
  });

  const request: google.maps.DirectionsRequest = {
    origin: { query: "origin" },
    destination: { query: "destination" },
    travelMode: TravelMode.DRIVING,
    optimizeWaypoints: true,
    waypoints: [
      { location: { query: "waypoint1" } },
      { location: { query: "waypoint2" } },
      { location: { query: "waypoint3" } },
    ],
  };

  // Spy on console.error
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  directionsService.route(request).catch((error) => {
    // Verify OptimizeWaypoints API was called
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(OptimizeWaypointsCommand));

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

    // Verify the promise was rejected with the correct status
    expect(error).toEqual({
      status: DirectionsStatus.UNKNOWN_ERROR,
    });

    // Clean up
    consoleErrorSpy.mockRestore();
    done();
  });
});
