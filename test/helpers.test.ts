// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createProgressiveBounds, RouteMatrixPosition } from '../src/common';

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

describe('createProgressiveBounds', () => {
  test('should return correct bounds for single pair of points', () => {
    // Input is in lat,lng format which is used in Amazon Location
    const origins: RouteMatrixPosition[] = [
      { Position: [37.7749, -122.4194] }  // [lat, lng]
    ];
    const destinations: RouteMatrixPosition[] = [
      { Position: [40.7128, -74.0060] }   // [lat, lng]
    ];

    const bounds = createProgressiveBounds(origins, destinations);

    expect(bounds).toEqual([-122.4194, 37.7749, -74.0060, 40.7128]);
  });

  test('should return correct bounds for multiple pairs of points', () => {
    // Input in lat,lng format
    const origins: RouteMatrixPosition[] = [
      { Position: [37.7749, -122.4194] },  // San Francisco [lat, lng]
      { Position: [34.0522, -118.2437] },  // Los Angeles [lat, lng]
      { Position: [32.7157, -117.1611] }   // San Diego [lat, lng]
    ];
    const destinations: RouteMatrixPosition[] = [
      { Position: [40.7128, -74.0060] },   // New York [lat, lng]
      { Position: [41.8781, -87.6298] },   // Chicago [lat, lng]
      { Position: [39.9526, -75.1652] }    // Philadelphia [lat, lng]
    ];

    const bounds = createProgressiveBounds(origins, destinations);

    expect(bounds).toEqual([-122.4194, 32.7157, -74.0060, 41.8781]);
  });

  test('should throw error when arrays have different lengths', () => {
    const origins: RouteMatrixPosition[] = [
      { Position: [37.7749, -122.4194] }
    ];
    const destinations: RouteMatrixPosition[] = [
      { Position: [40.7128, -74.0060] },
      { Position: [41.8781, -87.6298] }
    ];

    expect(() => createProgressiveBounds(origins, destinations))
      .toThrow('Origin and destination arrays must be of equal length');
  });
});
