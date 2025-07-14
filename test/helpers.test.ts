// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createBoundsFromPositions } from "../src/common";
import { LngLat } from "maplibre-gl";
import {
  createPolygons,
  formatDistanceBasedOnUnitSystem,
  formatSecondsAsGoogleDurationText,
  getReverseGeocodedAddresses,
  getUnitSystem,
  isPointInPolygons,
  largeNumberFormatter,
  numberFormatter,
} from "../src/directions/helpers";
import { TravelMode } from "../src/directions";
import * as turf from "@turf/turf";
import { GeoPlacesClient, ReverseGeocodeCommand } from "@aws-sdk/client-geo-places";
import { UnitSystem } from "../src/directions";
import { CountryGeoJSON } from "../src/directions/country_geojson/countryType";
import { Position } from "geojson";

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
jest.mock("@turf/turf");

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

  /*
  getDistanceMatrix's response has many origins and destinations which may or may not have
  addresses. This is represented by the following matrix:
  Expected Geocode Address Response Matrix
  +------------+-------------+------------+-------------+------------------+
  | Origin1    | Dest1      | Origin2    | Dest2       | Expected Result |
  +------------+-------------+------------+-------------+------------------+
  | correct    | correct    | correct    | correct     | All addresses   |
  | correct    | incorrect  | correct    | correct     | D1 empty        |
  | correct    | correct    | incorrect  | correct     | O2 empty        |
  | correct    | correct    | correct    | incorrect   | D2 empty        |
  | correct    | correct    | incorrect  | incorrect   | O2,D2 empty     |
  | correct    | incorrect  | incorrect  | incorrect   | All empty except O1|
  | incorrect  | incorrect  | incorrect  | incorrect   | All empty       |
  +------------+-------------+------------+-------------+------------------+

  where:
  - correct   = returns valid address
  - incorrect = returns empty string
  - O1,O2     = Origin addresses
  - D1,D2     = Destination addresses
  */

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

  test("should handle two origins and two destinations - all correct", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin1" } }] }))
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Destination1" } }] }))
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin2" } }] }))
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Destination2" } }] }));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Origin1", "Destination1", "Origin2", "Destination2"]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      done();
    });
  });

  test("should handle correct origins with one incorrect destination", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin1" } }] }))
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))) // Destination1 fails
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin2" } }] }))
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Destination2" } }] }));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Origin1", "", "Origin2", "Destination2"]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      done();
    });
  });

  test("should handle one incorrect origin with correct destinations", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin1" } }] }))
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Destination1" } }] }))
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))) // Origin2 fails
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Destination2" } }] }));

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Origin1", "Destination1", "", "Destination2"]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      done();
    });
  });

  test("should handle correct origins with both destinations incorrect", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin1" } }] }))
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))) // Destination1 fails
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin2" } }] }))
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))); // Destination2 fails

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Origin1", "", "Origin2", ""]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      done();
    });
  });

  test("should handle one correct origin with all others incorrect", (done) => {
    const positions = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    mockedPlacesClientSend
      .mockImplementationOnce(() => Promise.resolve({ ResultItems: [{ Address: { Label: "Origin1" } }] }))
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))) // Destination1 fails
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))) // Origin2 fails
      .mockImplementationOnce(() => Promise.reject(new Error("Geocoding failed"))); // Destination2 fails

    getReverseGeocodedAddresses(geoPlacesClient, positions, (addresses) => {
      expect(addresses).toEqual(["Origin1", "", "", ""]);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      done();
    });
  });
});

describe("createPolygons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore normal turf.polygon implementation by default
    (turf.polygon as jest.Mock).mockImplementation((coords) => ({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: coords },
    }));
  });

  describe("createPolygons", () => {
    test("should handle turf.polygon throwing error for invalid polygon coordinates", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      (turf.polygon as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid polygon coordinates");
      });

      const invalidGeoJson: CountryGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[]] as [number, number][][],
            },
          },
        ],
      };

      const result = createPolygons(invalidGeoJson);

      expect(result).toEqual([]); // Should return empty array
      expect(consoleSpy).toHaveBeenCalledWith("Error creating polygon:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  test("should handle invalid feature geometry", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const invalidGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: null,
        },
      ],
    } as CountryGeoJSON; // Type assertion needed because we're intentionally creating invalid data for testing

    const result = createPolygons(invalidGeoJson);

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("should handle mixed valid and invalid features", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Mock turf.polygon to throw error for specific coordinates
    (turf.polygon as jest.Mock).mockImplementation((coords: Position[][]) => {
      if (coords[0].length < 3) {
        throw new Error("Invalid polygon coordinates");
      }
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: coords },
      };
    });

    const mixedGeoJson: CountryGeoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-97.7289, 30.2784],
                [-97.7282, 30.2745],
                [-97.7224, 30.2755],
                [-97.7289, 30.2784],
              ],
            ] as Position[][],
          },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[[-97.7289, 30.2784]]] as Position[][],
          },
        },
      ],
    };

    const result = createPolygons(mixedGeoJson);

    expect(result.length).toBe(1); // Only valid polygon should be included
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  test("should handle forEach throwing error in MultiPolygon", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const invalidMultiPolygonGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiPolygon",
            coordinates: null as unknown as Position[][][], // Intentionally invalid for testing
          },
        },
      ],
    } as CountryGeoJSON;

    const result = createPolygons(invalidMultiPolygonGeoJson);

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("should handle undefined features array", () => {
    const invalidGeoJson = {
      type: "FeatureCollection",
      features: undefined,
    } as CountryGeoJSON;

    const result = createPolygons(invalidGeoJson);
    expect(result).toEqual([]);
  });

  test("should handle undefined features array (with explicit typing)", () => {
    type InvalidGeoJSON = Omit<CountryGeoJSON, "features"> & {
      features: undefined;
    };

    const invalidGeoJson: InvalidGeoJSON = {
      type: "FeatureCollection",
      features: undefined,
    };

    const result = createPolygons(invalidGeoJson as CountryGeoJSON);
    expect(result).toEqual([]);
  });

  test("should handle null input", () => {
    const result = createPolygons(null);
    expect(result).toEqual([]);
  });

  test("should handle forEach throwing error in MultiPolygon", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const invalidMultiPolygonGeoJson: CountryGeoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiPolygon",
            coordinates: null,
          },
        },
      ],
    };

    const result = createPolygons(invalidMultiPolygonGeoJson as CountryGeoJSON);

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("isPointInPolygons", () => {
  test("should return false for null point", () => {
    expect(isPointInPolygons(null, [])).toBeFalsy();
  });

  test("should return false for empty polygons array", () => {
    expect(isPointInPolygons([1, 1], [])).toBeFalsy();
  });

  test("should return false for null polygon in array", () => {
    expect(isPointInPolygons([1, 1], [null])).toBeFalsy();
  });
});

describe("Number Formatters", () => {
  describe("numberFormatter", () => {
    test("formats one decimal place for numbers < 10", () => {
      expect(numberFormatter.format(1)).toBe("1.0");
      expect(numberFormatter.format(1.23)).toBe("1.2");
      expect(numberFormatter.format(9.874)).toBe("9.9");
    });

    test("formats one decimal place for whole numbers", () => {
      expect(numberFormatter.format(5)).toBe("5.0");
      expect(numberFormatter.format(5.0)).toBe("5.0");
    });

    test("formats one decimal place for zero and negative numbers", () => {
      expect(numberFormatter.format(0)).toBe("0.0");
      expect(numberFormatter.format(-1.23)).toBe("-1.2");
    });
  });

  describe("largeNumberFormatter", () => {
    test("formats large numbers with thousand separators", () => {
      expect(largeNumberFormatter.format(1234)).toBe("1,234");
      expect(largeNumberFormatter.format(1000000)).toBe("1,000,000");
    });

    test("rounds decimals to whole numbers", () => {
      expect(largeNumberFormatter.format(1234.56)).toBe("1,235");
      expect(largeNumberFormatter.format(9999.1)).toBe("9,999");
    });
  });
});

describe("formatDistanceBasedOnUnitSystem", () => {
  describe("metric formatting", () => {
    test("formats distances under 1 km in meters", () => {
      expect(formatDistanceBasedOnUnitSystem(500, UnitSystem.METRIC)).toBe("500 m");
      expect(formatDistanceBasedOnUnitSystem(950, UnitSystem.METRIC)).toBe("950 m");
    });

    test("formats distances between 1-10 km with one decimal", () => {
      expect(formatDistanceBasedOnUnitSystem(1500, UnitSystem.METRIC)).toBe("1.5 km");
      expect(formatDistanceBasedOnUnitSystem(9500, UnitSystem.METRIC)).toBe("9.5 km");
    });

    test("formats distances between 10-999 km whole numbers with one decimal", () => {
      expect(formatDistanceBasedOnUnitSystem(15000, UnitSystem.METRIC)).toBe("15.0 km");
      expect(formatDistanceBasedOnUnitSystem(999000, UnitSystem.METRIC)).toBe("999.0 km");
    });

    test("formats distances 1000 km and above with separators without decimal", () => {
      expect(formatDistanceBasedOnUnitSystem(1500000, UnitSystem.METRIC)).toBe("1,500 km");
    });
  });

  describe("imperial formatting", () => {
    test("formats distances under 10 miles with one decimal", () => {
      expect(formatDistanceBasedOnUnitSystem(1609.34, UnitSystem.IMPERIAL)).toBe("1.0 mi");
      expect(formatDistanceBasedOnUnitSystem(12874.72, UnitSystem.IMPERIAL)).toBe("8.0 mi");
    });

    test("formats distances between 10-999 miles with one decimal", () => {
      expect(formatDistanceBasedOnUnitSystem(16093.4, UnitSystem.IMPERIAL)).toBe("10.0 mi");
      expect(formatDistanceBasedOnUnitSystem(1207008, UnitSystem.IMPERIAL)).toBe("750.0 mi");
    });

    test("formats distances 1000 miles and above with separators", () => {
      // 1609344 meters = 1000.000621 miles
      expect(formatDistanceBasedOnUnitSystem(1609345, UnitSystem.IMPERIAL)).toBe("1,000 mi");
    });
  });
});

describe("getUnitSystem", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests for null/undefined options
  test("should return METRIC when options is null", () => {
    const options = null;
    const response = [40.7128, -74.006];

    const result = getUnitSystem(options, response);
    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options is undefined", () => {
    const options = undefined;
    const response = [40.7128, -74.006];

    const result = getUnitSystem(options, response);
    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options has no unitSystem and response returns null", () => {
    const options: google.maps.DirectionsRequest = {
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 34.0522, lng: -118.2437 },
      travelMode: TravelMode.DRIVING,
    };
    const response = null;

    const result = getUnitSystem(options, response);

    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options has no unitSystem and response is empthy", () => {
    const options: google.maps.DirectionsRequest = {
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 34.0522, lng: -118.2437 },
      travelMode: TravelMode.DRIVING,
    };
    const response = [];

    const result = getUnitSystem(options, response);

    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options has no unitSystem and response is not of length 2", () => {
    const options: google.maps.DirectionsRequest = {
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 34.0522, lng: -118.2437 },
      travelMode: TravelMode.DRIVING,
    };
    const response = [40.7128];

    const result = getUnitSystem(options, response);

    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options is null", () => {
    const options: google.maps.DirectionsRequest = null;
    const response = [40.7128, -74.006];

    const result = getUnitSystem(options, response);

    expect(result).toBe(UnitSystem.METRIC);
  });

  test("should return METRIC when options has no unitSystem and unitSystem is undefined", () => {
    const options: google.maps.DirectionsRequest = {
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 34.0522, lng: -118.2437 },
      travelMode: TravelMode.DRIVING,
      unitSystem: undefined,
    };
    const response = [40.7128];

    const result = getUnitSystem(options, response);

    expect(result).toBe(UnitSystem.METRIC);
  });
});

describe("formatSecondsAsGoogleDurationText", () => {
  test("formats seconds less than a minute", () => {
    expect(formatSecondsAsGoogleDurationText(30)).toBe("1 min");
    expect(formatSecondsAsGoogleDurationText(59)).toBe("1 min");
  });

  test("formats seconds to minutes", () => {
    expect(formatSecondsAsGoogleDurationText(60)).toBe("1 min");
    expect(formatSecondsAsGoogleDurationText(61)).toBe("2 mins");
    expect(formatSecondsAsGoogleDurationText(119)).toBe("2 mins");
    expect(formatSecondsAsGoogleDurationText(120)).toBe("2 mins");
    expect(formatSecondsAsGoogleDurationText(600)).toBe("10 mins");
  });

  test("formats seconds to hours and minutes", () => {
    expect(formatSecondsAsGoogleDurationText(3600)).toBe("1 hour");
    expect(formatSecondsAsGoogleDurationText(3601)).toBe("1 hour 1 min");
    expect(formatSecondsAsGoogleDurationText(3660)).toBe("1 hour 1 min");
    expect(formatSecondsAsGoogleDurationText(3720)).toBe("1 hour 2 mins");
    expect(formatSecondsAsGoogleDurationText(7200)).toBe("2 hours");
    expect(formatSecondsAsGoogleDurationText(7260)).toBe("2 hours 1 min");
    expect(formatSecondsAsGoogleDurationText(7320)).toBe("2 hours 2 mins");
  });

  test("formats seconds to days, hours, and minutes", () => {
    expect(formatSecondsAsGoogleDurationText(86400)).toBe("1 day");
    expect(formatSecondsAsGoogleDurationText(86401)).toBe("1 day 1 min");
    expect(formatSecondsAsGoogleDurationText(86460)).toBe("1 day 1 min");
    expect(formatSecondsAsGoogleDurationText(90000)).toBe("1 day 1 hour");
    expect(formatSecondsAsGoogleDurationText(90060)).toBe("1 day 1 hour 1 min");
    expect(formatSecondsAsGoogleDurationText(90120)).toBe("1 day 1 hour 2 mins");
    expect(formatSecondsAsGoogleDurationText(172800)).toBe("2 days");
    expect(formatSecondsAsGoogleDurationText(172801)).toBe("2 days 1 min");
    expect(formatSecondsAsGoogleDurationText(176400)).toBe("2 days 1 hour");
    expect(formatSecondsAsGoogleDurationText(176460)).toBe("2 days 1 hour 1 min");
  });
});
