// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createBoundsFromPositions } from "../src/common";
import { LngLat } from "maplibre-gl";

jest.mock("@aws-sdk/client-geo-places", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-places"),
  GeoPlacesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedPlacesClientSend,
    };
  }),
}));

const mockedPlacesClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof ReverseGeocodeCommand) {
      resolve({
        ResultItems: [
          {
            Address: {
              Label: "Test Address",
            },
          },
        ],
      });
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
import { GeoPlacesClient, ReverseGeocodeCommand } from "@aws-sdk/client-geo-places";
import { getReverseGeocodedAddresses } from "../src/directions/helpers";

const geoPlacesClient = new GeoPlacesClient();
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

describe("createBoundsFromPositions", () => {
  test("should return correct bounds for multiple positions", () => {
    const positions: LngLat[] = [
      new LngLat(-122.4194, 37.7749), // San Francisco
      new LngLat(-74.006, 40.7128), // New York
      new LngLat(-87.6298, 41.8781), // Chicago
    ];

    const result = createBoundsFromPositions(positions);

    expect(result).toEqual([-122.4194, 37.7749, -74.006, 41.8781]);
  });

  test("should handle single position", () => {
    const positions: LngLat[] = [
      new LngLat(-122.4194, 37.7749), // San Francisco
    ];

    const result = createBoundsFromPositions(positions);

    expect(result).toEqual([-122.4194, 37.7749, -122.4194, 37.7749]);
  });

  test("should handle positions in different quadrants", () => {
    const positions: LngLat[] = [
      new LngLat(-122.4194, 37.7749), // San Francisco (Northwest)
      new LngLat(151.2093, -33.8688), // Sydney (Southeast)
      new LngLat(139.6917, 35.6895), // Tokyo (Northeast)
      new LngLat(-58.3816, -34.6037), // Buenos Aires (Southwest)
    ];

    const result = createBoundsFromPositions(positions);

    expect(result).toEqual([-122.4194, -34.6037, 151.2093, 37.7749]);
  });

  test("should throw error for empty array", () => {
    expect(() => createBoundsFromPositions([])).toThrow();
  });
});

describe("getReverseGeocodedAddresses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle empty positions array", (done) => {
    const mockCallback = jest.fn();

    getReverseGeocodedAddresses(geoPlacesClient, [], mockCallback);

    expect(mockCallback).toHaveBeenCalledWith([]);
    expect(mockedPlacesClientSend).not.toHaveBeenCalled();
    done();
  });

  test("should handle successful reverse geocoding", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() =>
        Promise.resolve({
          ResultItems: [{ Address: { Label: "Test Address 1" } }],
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ResultItems: [{ Address: { Label: "Test Address 2" } }],
        }),
      );

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Test Address 1", "Test Address 2"]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
      done();
    });
  });

  test("should handle missing address in response", (done) => {
    const positions = [[1, 2]];

    mockedPlacesClientSend.mockImplementationOnce(() =>
      Promise.resolve({
        ResultItems: [{}], // No Address object
      }),
    );

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual([""]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(1);
      done();
    });
  });

  test("should handle missing ResultItems in response", (done) => {
    const positions = [[1, 2]];

    mockedPlacesClientSend.mockImplementationOnce(
      () => Promise.resolve({}), // Empty response
    );

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual([""]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(1);
      done();
    });
  });

  test("should handle individual geocoding failures", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() =>
        Promise.resolve({
          ResultItems: [{ Address: { Label: "Test Address" } }],
        }),
      )
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed")));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Test Address", ""]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error reverse geocoding position:", expect.any(Error));
      done();
    });
  });

  test("should verify ReverseGeocodeCommand parameters", (done) => {
    const positions = [[1, 2]];

    getReverseGeocodedAddresses(geoPlacesClient, positions, () => {
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueryPosition: [1, 2],
            AdditionalFeatures: ["TimeZone"],
          },
        }),
      );
      done();
    });
  });

  test("should handle all geocoding requests failing", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
    ];
    // mock all requests to fail
    mockedPlacesClientSend.mockImplementation(() => Promise.reject(new Error("All geocoding failed")));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      // should get empty strings for all positions
      expect(addresses).toEqual(["", ""]);

      // should have attempted to geocode all positions
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error reverse geocoding position:", expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in reverse geocoding:", expect.any(Error));

      done();
    });
  });

  test("should handle mixed success and failure with Promise.all", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() =>
        Promise.resolve({
          ResultItems: [{ Address: { Label: "Success Address" } }],
        }),
      )
      .mockImplementation(() => Promise.reject(new Error("Geocoding failed")));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      // should get one success and two empty strings
      expect(addresses).toEqual(["Success Address", "", ""]);

      // should have attempted all three geocoding requests
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(3);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error reverse geocoding position:", expect.any(Error));

      expect(consoleErrorSpy).not.toHaveBeenCalledWith("Error in reverse geocoding:", expect.any(Error));

      done();
    });
  });
});
