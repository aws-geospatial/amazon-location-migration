// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationEncoding, MigrationSpherical, MigrationPoly } from "../src/geometry";
import { MigrationLatLng } from "../src/common";
import { MigrationPolyline } from "../src/maps/polyline";

// Mock maplibre-gl for Circle and Polyline
jest.mock("maplibre-gl");

describe("MigrationEncoding", () => {
  test("should encode a path to a string", () => {
    const path = [
      new MigrationLatLng(38.5, -120.2),
      new MigrationLatLng(40.7, -120.95),
      new MigrationLatLng(43.252, -126.453),
    ];

    const encoded = MigrationEncoding.encodePath(path);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  test("should decode a path from a string", () => {
    // First encode a known path
    const originalPath = [new MigrationLatLng(38.5, -120.2), new MigrationLatLng(40.7, -120.95)];
    const encoded = MigrationEncoding.encodePath(originalPath);

    // Then decode it
    const decoded = MigrationEncoding.decodePath(encoded);

    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded.length).toBeGreaterThan(0);
    expect(decoded[0]).toBeInstanceOf(MigrationLatLng);
  });

  test("should encode and decode to get similar path", () => {
    const originalPath = [new MigrationLatLng(38.5, -120.2), new MigrationLatLng(40.7, -120.95)];

    const encoded = MigrationEncoding.encodePath(originalPath);
    const decoded = MigrationEncoding.decodePath(encoded);

    expect(decoded.length).toBe(originalPath.length);
    // Check coordinates are approximately equal (encoding has some precision loss)
    expect(Math.abs(decoded[0].lat() - originalPath[0].lat())).toBeLessThan(0.00001);
    expect(Math.abs(decoded[0].lng() - originalPath[0].lng())).toBeLessThan(0.00001);
  });

  test("should encode path from MVCArray", () => {
    const path = [new MigrationLatLng(38.5, -120.2), new MigrationLatLng(40.7, -120.95)];

    // Create an MVCArray-like object
    const mvcArray = {
      getArray: () => path,
    };

    const encoded = MigrationEncoding.encodePath(mvcArray as unknown as google.maps.MVCArray<google.maps.LatLng>);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });
});

describe("MigrationSpherical", () => {
  const chicago = new MigrationLatLng(41.85, -87.65);
  const newYork = new MigrationLatLng(40.71, -74.01);

  test("should compute distance between two points", () => {
    const distance = MigrationSpherical.computeDistanceBetween(chicago, newYork);

    expect(distance).toBeGreaterThan(0);
    // Distance between Chicago and New York is approximately 1145 km
    expect(distance).toBeGreaterThan(1000000); // > 1000 km in meters
    expect(distance).toBeLessThan(1300000); // < 1300 km in meters
  });

  test("should compute distance with LatLngLiteral inputs", () => {
    const chicagoLiteral = { lat: 41.85, lng: -87.65 };
    const newYorkLiteral = { lat: 40.71, lng: -74.01 };
    const distance = MigrationSpherical.computeDistanceBetween(chicagoLiteral, newYorkLiteral);

    expect(distance).toBeGreaterThan(1000000);
    expect(distance).toBeLessThan(1300000);
  });

  test("should compute distance with custom radius", () => {
    const distanceEarth = MigrationSpherical.computeDistanceBetween(chicago, newYork);
    const distanceMars = MigrationSpherical.computeDistanceBetween(chicago, newYork, 3389500);

    // Mars radius is about 53% of Earth, so distance should scale accordingly
    expect(distanceMars).toBeLessThan(distanceEarth);
  });

  test("should compute heading between two points", () => {
    const heading = MigrationSpherical.computeHeading(chicago, newYork);

    // Heading from Chicago to New York should be roughly east (around 90 degrees)
    expect(heading).toBeGreaterThan(50);
    expect(heading).toBeLessThan(130);
  });

  test("should compute heading with LatLngLiteral inputs", () => {
    const chicagoLiteral = { lat: 41.85, lng: -87.65 };
    const newYorkLiteral = { lat: 40.71, lng: -74.01 };
    const heading = MigrationSpherical.computeHeading(chicagoLiteral, newYorkLiteral);

    expect(heading).toBeGreaterThan(50);
    expect(heading).toBeLessThan(130);
  });

  test("should compute offset from a point", () => {
    const distance = 100000; // 100 km
    const heading = 90; // East
    const destination = MigrationSpherical.computeOffset(chicago, distance, heading);

    expect(destination).toBeInstanceOf(MigrationLatLng);
    expect(destination.lng()).toBeGreaterThan(chicago.lng()); // Should be more east
    // Latitude should be relatively similar when going east
    expect(Math.abs(destination.lat() - chicago.lat())).toBeLessThan(1);
  });

  test("should compute offset from LatLngLiteral", () => {
    const chicagoLiteral = { lat: 41.85, lng: -87.65 };
    const distance = 100000;
    const heading = 90;
    const destination = MigrationSpherical.computeOffset(chicagoLiteral, distance, heading);

    expect(destination).toBeInstanceOf(MigrationLatLng);
    expect(destination.lng()).toBeGreaterThan(chicagoLiteral.lng);
  });

  test("should compute offset with custom radius", () => {
    const distance = 100000;
    const heading = 90;
    const destinationEarth = MigrationSpherical.computeOffset(chicago, distance, heading);
    const destinationMars = MigrationSpherical.computeOffset(chicago, distance, heading, 3389500);

    expect(destinationMars).toBeInstanceOf(MigrationLatLng);
    // Different radii should give different results
    expect(destinationMars.lng()).not.toBe(destinationEarth.lng());
  });

  test("should compute offset origin", () => {
    const distance = 10000; // 10 km (shorter distance for better accuracy)
    const heading = 90; // East

    // First compute offset to get destination
    const destination = MigrationSpherical.computeOffset(chicago, distance, heading);
    // Then compute origin from destination
    const origin = MigrationSpherical.computeOffsetOrigin(destination, distance, heading);

    // Origin should be very close to original chicago point (within ~0.1 degrees)
    expect(Math.abs(origin.lat() - chicago.lat())).toBeLessThan(0.1);
    expect(Math.abs(origin.lng() - chicago.lng())).toBeLessThan(0.1);
  });

  test("should compute offset origin from LatLngLiteral", () => {
    const destinationLiteral = { lat: 41.85, lng: -87.55 };
    const distance = 10000;
    const heading = 90;

    const origin = MigrationSpherical.computeOffsetOrigin(destinationLiteral, distance, heading);

    expect(origin).toBeInstanceOf(MigrationLatLng);
    expect(origin.lng()).toBeLessThan(destinationLiteral.lng); // Should be west of destination
  });

  test("should compute offset origin with custom radius", () => {
    const distance = 10000;
    const heading = 90;

    const destination = MigrationSpherical.computeOffset(chicago, distance, heading);
    const originEarth = MigrationSpherical.computeOffsetOrigin(destination, distance, heading);
    const originMars = MigrationSpherical.computeOffsetOrigin(destination, distance, heading, 3389500);

    expect(originMars).toBeInstanceOf(MigrationLatLng);
    // Different radii should give different origins
    expect(Math.abs(originMars.lng() - originEarth.lng())).toBeGreaterThan(0);
  });

  test("should compute length of a path", () => {
    const path = [chicago, newYork, new MigrationLatLng(34.05, -118.24)]; // Add LA
    const length = MigrationSpherical.computeLength(path);

    expect(length).toBeGreaterThan(0);
    // Total path should be > 2000 km
    expect(length).toBeGreaterThan(2000000);
  });

  test("should compute length from MVCArray path", () => {
    const path = [chicago, newYork, new MigrationLatLng(34.05, -118.24)];
    const mvcPath = {
      getArray: () => path,
    };
    const length = MigrationSpherical.computeLength(
      mvcPath as unknown as google.maps.MVCArray<google.maps.LatLng>,
    );

    expect(length).toBeGreaterThan(2000000);
  });

  test("should compute length with custom radius", () => {
    const path = [chicago, newYork];
    const lengthEarth = MigrationSpherical.computeLength(path);
    const lengthMars = MigrationSpherical.computeLength(path, 3389500); // Mars radius

    expect(lengthMars).toBeLessThan(lengthEarth);
    expect(lengthMars).toBeGreaterThan(0);
  });

  test("should return zero length for path with less than 2 points", () => {
    expect(MigrationSpherical.computeLength([chicago])).toBe(0);
    expect(MigrationSpherical.computeLength([])).toBe(0);
  });

  test("should compute area of a polygon", () => {
    // Small square around Chicago
    const path = [
      new MigrationLatLng(41.85, -87.65),
      new MigrationLatLng(41.86, -87.65),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.85, -87.64),
    ];

    const area = MigrationSpherical.computeArea(path);
    expect(area).toBeGreaterThan(0);
  });

  test("should compute area from MVCArray path", () => {
    const path = [
      new MigrationLatLng(41.85, -87.65),
      new MigrationLatLng(41.86, -87.65),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.85, -87.64),
    ];
    const mvcPath = {
      getArray: () => path,
    };

    const area = MigrationSpherical.computeArea(mvcPath as unknown as google.maps.MVCArray<google.maps.LatLng>);
    expect(area).toBeGreaterThan(0);
  });

  test("should compute area of closed polygon", () => {
    // Polygon that's already closed (first point equals last point)
    const path = [
      new MigrationLatLng(41.85, -87.65),
      new MigrationLatLng(41.86, -87.65),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.85, -87.64),
      new MigrationLatLng(41.85, -87.65), // Closed
    ];

    const area = MigrationSpherical.computeArea(path);
    expect(area).toBeGreaterThan(0);
  });

  test("should compute signed area - counter-clockwise is positive", () => {
    // Counter-clockwise square
    const ccwPath = [
      new MigrationLatLng(0, 0),
      new MigrationLatLng(0, 1),
      new MigrationLatLng(1, 1),
      new MigrationLatLng(1, 0),
    ];

    const signedArea = MigrationSpherical.computeSignedArea(ccwPath);
    expect(signedArea).toBeGreaterThan(0); // Counter-clockwise should be positive
  });

  test("should compute signed area - clockwise is negative", () => {
    // Clockwise square
    const cwPath = [
      new MigrationLatLng(0, 0),
      new MigrationLatLng(1, 0),
      new MigrationLatLng(1, 1),
      new MigrationLatLng(0, 1),
    ];

    const signedArea = MigrationSpherical.computeSignedArea(cwPath);
    expect(signedArea).toBeLessThan(0); // Clockwise should be negative
  });

  test("should compute signed area from MVCArray", () => {
    const path = [
      new MigrationLatLng(0, 0),
      new MigrationLatLng(0, 1),
      new MigrationLatLng(1, 1),
      new MigrationLatLng(1, 0),
    ];
    const mvcPath = {
      getArray: () => path,
    };

    const signedArea = MigrationSpherical.computeSignedArea(
      mvcPath as unknown as google.maps.MVCArray<google.maps.LatLng>,
    );
    expect(signedArea).toBeGreaterThan(0);
  });

  test("should compute signed area with custom radius", () => {
    const path = [
      new MigrationLatLng(0, 0),
      new MigrationLatLng(0, 1),
      new MigrationLatLng(1, 1),
      new MigrationLatLng(1, 0),
    ];

    const areaEarth = MigrationSpherical.computeSignedArea(path);
    const areaMars = MigrationSpherical.computeSignedArea(path, 3389500);

    // Mars has smaller radius, so area should scale down
    expect(areaMars).toBeLessThan(Math.abs(areaEarth));
    expect(areaMars).toBeGreaterThan(0);
  });

  test("should compute area with custom radius", () => {
    const path = [
      new MigrationLatLng(41.85, -87.65),
      new MigrationLatLng(41.86, -87.65),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.85, -87.64),
    ];

    const areaEarth = MigrationSpherical.computeArea(path);
    const areaMars = MigrationSpherical.computeArea(path, 3389500);

    // Mars has smaller radius, so area should be smaller
    expect(areaMars).toBeLessThan(areaEarth);
    expect(areaMars).toBeGreaterThan(0);
  });

  test("should interpolate between two points", () => {
    const midpoint = MigrationSpherical.interpolate(chicago, newYork, 0.5);

    expect(midpoint).toBeInstanceOf(MigrationLatLng);
    // Midpoint should be between the two cities
    expect(midpoint.lat()).toBeGreaterThan(Math.min(chicago.lat(), newYork.lat()));
    expect(midpoint.lat()).toBeLessThan(Math.max(chicago.lat(), newYork.lat()));
    expect(midpoint.lng()).toBeGreaterThan(Math.min(chicago.lng(), newYork.lng()));
    expect(midpoint.lng()).toBeLessThan(Math.max(chicago.lng(), newYork.lng()));
  });

  test("should interpolate with LatLngLiteral inputs", () => {
    const chicagoLiteral = { lat: 41.85, lng: -87.65 };
    const newYorkLiteral = { lat: 40.71, lng: -74.01 };
    const midpoint = MigrationSpherical.interpolate(chicagoLiteral, newYorkLiteral, 0.5);

    expect(midpoint).toBeInstanceOf(MigrationLatLng);
    expect(midpoint.lat()).toBeGreaterThan(Math.min(chicagoLiteral.lat, newYorkLiteral.lat));
    expect(midpoint.lat()).toBeLessThan(Math.max(chicagoLiteral.lat, newYorkLiteral.lat));
  });

  test("should interpolate at fraction 0 to get start point", () => {
    const start = MigrationSpherical.interpolate(chicago, newYork, 0);

    expect(Math.abs(start.lat() - chicago.lat())).toBeLessThan(0.00001);
    expect(Math.abs(start.lng() - chicago.lng())).toBeLessThan(0.00001);
  });

  test("should interpolate at fraction 1 to get end point", () => {
    const end = MigrationSpherical.interpolate(chicago, newYork, 1);

    expect(Math.abs(end.lat() - newYork.lat())).toBeLessThan(0.00001);
    expect(Math.abs(end.lng() - newYork.lng())).toBeLessThan(0.00001);
  });
});

describe("MigrationPoly", () => {
  test("should detect point inside polygon", () => {
    // Create a simple square polygon
    const polygonPath = [
      new MigrationLatLng(41.84, -87.66),
      new MigrationLatLng(41.84, -87.64),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.86, -87.66),
    ];
    const mockPolygon = {
      getPath: () => polygonPath,
    };

    const pointInside = new MigrationLatLng(41.85, -87.65); // Center point
    const result = MigrationPoly.containsLocation(pointInside, mockPolygon as unknown as google.maps.Polygon);

    expect(result).toBe(true);
  });

  test("should detect point outside polygon", () => {
    // Create a simple square polygon
    const polygonPath = [
      new MigrationLatLng(41.84, -87.66),
      new MigrationLatLng(41.84, -87.64),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.86, -87.66),
    ];
    const mockPolygon = {
      getPath: () => polygonPath,
    };

    const pointOutside = new MigrationLatLng(42.0, -88.0); // Far away
    const result = MigrationPoly.containsLocation(pointOutside, mockPolygon as unknown as google.maps.Polygon);

    expect(result).toBe(false);
  });

  test("should detect LatLngLiteral point inside polygon", () => {
    const polygonPath = [
      new MigrationLatLng(41.84, -87.66),
      new MigrationLatLng(41.84, -87.64),
      new MigrationLatLng(41.86, -87.64),
      new MigrationLatLng(41.86, -87.66),
    ];
    const mockPolygon = {
      getPath: () => polygonPath,
    };

    const pointInside = { lat: 41.85, lng: -87.65 }; // LatLngLiteral
    const result = MigrationPoly.containsLocation(pointInside, mockPolygon as unknown as google.maps.Polygon);

    expect(result).toBe(true);
  });

  test("should detect point on polyline edge", () => {
    const path = [new MigrationLatLng(0, 0), new MigrationLatLng(0, 1), new MigrationLatLng(1, 1)];

    const polyline = new MigrationPolyline({ path });

    // Point exactly on the line
    const pointOnLine = new MigrationLatLng(0, 0.5);
    const result = MigrationPoly.isLocationOnEdge(pointOnLine, polyline as google.maps.Polyline);

    expect(result).toBe(true);
  });

  test("should detect point near polyline edge with tolerance", () => {
    const path = [new MigrationLatLng(0, 0), new MigrationLatLng(0, 1)];

    const polyline = new MigrationPolyline({ path });

    // Point very close to the line
    const pointNearLine = new MigrationLatLng(0.00001, 0.5);
    const result = MigrationPoly.isLocationOnEdge(pointNearLine, polyline as google.maps.Polyline, 0.001);

    expect(result).toBe(true);
  });

  test("should detect point not on polyline edge", () => {
    const path = [new MigrationLatLng(0, 0), new MigrationLatLng(0, 1)];

    const polyline = new MigrationPolyline({ path });

    // Point far from the line
    const pointNotOnLine = new MigrationLatLng(5, 5);
    const result = MigrationPoly.isLocationOnEdge(pointNotOnLine, polyline as google.maps.Polyline);

    expect(result).toBe(false);
  });

  test("should use default tolerance when not specified", () => {
    const path = [new MigrationLatLng(0, 0), new MigrationLatLng(0, 1)];

    const polyline = new MigrationPolyline({ path });
    const pointOnLine = new MigrationLatLng(0, 0);

    // Should work with default tolerance
    const result = MigrationPoly.isLocationOnEdge(pointOnLine, polyline as google.maps.Polyline);
    expect(result).toBe(true);
  });

  test("should detect LatLngLiteral point on polyline edge", () => {
    const path = [new MigrationLatLng(0, 0), new MigrationLatLng(0, 1), new MigrationLatLng(1, 1)];

    const polyline = new MigrationPolyline({ path });

    // Point as LatLngLiteral on the line
    const pointOnLine = { lat: 0, lng: 0.5 };
    const result = MigrationPoly.isLocationOnEdge(pointOnLine, polyline as google.maps.Polyline);

    expect(result).toBe(true);
  });
});
