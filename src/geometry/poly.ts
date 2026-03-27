// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as turf from "@turf/turf";
import { MigrationLatLng } from "../common/lat_lng";

/** Utility functions for computations involving polygons and polylines. */
export class MigrationPoly {
  /**
   * Determines whether the given point falls within the polygon.
   *
   * @param point - The point to test.
   * @param polygon - The polygon to test.
   * @returns True if the point is inside the polygon.
   */
  static containsLocation(
    point: google.maps.LatLng | google.maps.LatLngLiteral,
    polygon: google.maps.Polygon,
  ): boolean {
    const testPoint = point instanceof MigrationLatLng ? point : new MigrationLatLng(point);
    const turfPoint = turf.point([testPoint.lng(), testPoint.lat()]);

    // Get the polygon's path
    const path = polygon.getPath();
    const latLngs = Array.isArray(path) ? path : path.getArray();

    // Create turf polygon
    const coordinates = latLngs.map((latLng) => [latLng.lng(), latLng.lat()]);
    // Close the polygon if not already closed
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push(coordinates[0]);
    }

    const turfPolygon = turf.polygon([coordinates]);

    return turf.booleanPointInPolygon(turfPoint, turfPolygon);
  }

  /**
   * Determines whether the given point falls on or near a polyline, or the edge of a polygon, within a tolerance.
   *
   * @param point - The point to test.
   * @param poly - The polyline or polygon to test.
   * @param tolerance - Optional. The tolerance in degrees. Defaults to 10^-9.
   * @returns True if the point is on or near the polyline/polygon edge.
   */
  static isLocationOnEdge(
    point: google.maps.LatLng | google.maps.LatLngLiteral,
    poly: google.maps.Polygon | google.maps.Polyline,
    tolerance: number = 1e-9,
  ): boolean {
    const testPoint = point instanceof MigrationLatLng ? point : new MigrationLatLng(point);
    const turfPoint = turf.point([testPoint.lng(), testPoint.lat()]);

    // Get the path from the polyline or polygon
    const path = poly.getPath();
    const latLngs = Array.isArray(path) ? path : path.getArray();

    // Create turf line
    const coordinates = latLngs.map((latLng) => [latLng.lng(), latLng.lat()]);
    const line = turf.lineString(coordinates);

    // Check if point is on the line with some tolerance
    // First check exact match
    if (turf.booleanPointOnLine(turfPoint, line)) {
      return true;
    }

    // If not exact, check distance to line
    const distanceInKm = turf.pointToLineDistance(turfPoint, line);
    const distanceInDegrees = distanceInKm / 111.32; // Approximate conversion at equator

    return distanceInDegrees <= tolerance;
  }
}
