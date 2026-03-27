// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as turf from "@turf/turf";
import { MigrationLatLng } from "../common/lat_lng";

// Earth's radius in meters (same as Google Maps uses)
const EARTH_RADIUS = 6378137;

/** Utility functions for computing angles, distances, and areas on the sphere. */
export class MigrationSpherical {
  /**
   * Returns the area of a closed path.
   *
   * @param path - A closed path.
   * @param radiusOfSphere - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The area in square meters.
   */
  static computeArea(
    path: google.maps.LatLng[] | google.maps.MVCArray<google.maps.LatLng>,
    radiusOfSphere: number = EARTH_RADIUS,
  ): number {
    const latLngs = Array.isArray(path) ? path : path.getArray();

    // Create a polygon from the path
    const coordinates = latLngs.map((latLng) => [latLng.lng(), latLng.lat()]);
    // Close the polygon if not already closed
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push(coordinates[0]);
    }

    const polygon = turf.polygon([coordinates]);
    // turf.area returns in square meters assuming Earth's radius
    // Scale by the radius ratio squared
    const areaAtEarthRadius = turf.area(polygon);
    return areaAtEarthRadius * Math.pow(radiusOfSphere / EARTH_RADIUS, 2);
  }

  /**
   * Returns the distance, in meters, between two LatLngs.
   *
   * @param from - The first LatLng.
   * @param to - The second LatLng.
   * @param radius - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The distance in meters.
   */
  static computeDistanceBetween(
    from: google.maps.LatLng | google.maps.LatLngLiteral,
    to: google.maps.LatLng | google.maps.LatLngLiteral,
    radius: number = EARTH_RADIUS,
  ): number {
    const fromLatLng = from instanceof MigrationLatLng ? from : new MigrationLatLng(from);
    const toLatLng = to instanceof MigrationLatLng ? to : new MigrationLatLng(to);

    const point1 = turf.point([fromLatLng.lng(), fromLatLng.lat()]);
    const point2 = turf.point([toLatLng.lng(), toLatLng.lat()]);

    // turf.distance returns in kilometers
    const distanceInKm = turf.distance(point1, point2);
    // Convert to meters and scale by radius
    return distanceInKm * 1000 * (radius / EARTH_RADIUS);
  }

  /**
   * Returns the heading from one LatLng to another LatLng.
   *
   * @param from - The first LatLng.
   * @param to - The second LatLng.
   * @returns The heading in degrees from North in the range [-180, 180).
   */
  static computeHeading(
    from: google.maps.LatLng | google.maps.LatLngLiteral,
    to: google.maps.LatLng | google.maps.LatLngLiteral,
  ): number {
    const fromLatLng = from instanceof MigrationLatLng ? from : new MigrationLatLng(from);
    const toLatLng = to instanceof MigrationLatLng ? to : new MigrationLatLng(to);

    const point1 = turf.point([fromLatLng.lng(), fromLatLng.lat()]);
    const point2 = turf.point([toLatLng.lng(), toLatLng.lat()]);

    // turf.bearing returns in the range [-180, 180]
    return turf.bearing(point1, point2);
  }

  /**
   * Returns the length of the given path.
   *
   * @param path - A sequence of LatLngs.
   * @param radius - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The length in meters.
   */
  static computeLength(
    path: google.maps.LatLng[] | google.maps.MVCArray<google.maps.LatLng>,
    radius: number = EARTH_RADIUS,
  ): number {
    const latLngs = Array.isArray(path) ? path : path.getArray();

    if (latLngs.length < 2) {
      return 0;
    }

    const coordinates = latLngs.map((latLng) => [latLng.lng(), latLng.lat()]);
    const line = turf.lineString(coordinates);

    // turf.length returns in kilometers
    const lengthInKm = turf.length(line);
    // Convert to meters and scale by radius
    return lengthInKm * 1000 * (radius / EARTH_RADIUS);
  }

  /**
   * Returns the LatLng resulting from moving a distance from an origin in the specified heading.
   *
   * @param from - The starting LatLng.
   * @param distance - The distance to travel in meters.
   * @param heading - The heading in degrees clockwise from North.
   * @param radius - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The destination LatLng.
   */
  static computeOffset(
    from: google.maps.LatLng | google.maps.LatLngLiteral,
    distance: number,
    heading: number,
    radius: number = EARTH_RADIUS,
  ): google.maps.LatLng {
    const fromLatLng = from instanceof MigrationLatLng ? from : new MigrationLatLng(from);

    const point = turf.point([fromLatLng.lng(), fromLatLng.lat()]);
    // Scale distance by radius ratio and convert to kilometers
    const distanceInKm = (distance / 1000) * (EARTH_RADIUS / radius);

    const destination = turf.destination(point, distanceInKm, heading);
    const [lng, lat] = destination.geometry.coordinates;

    return new MigrationLatLng(lat, lng);
  }

  /**
   * Returns the location of origin when provided with a LatLng destination, meters traveled, and heading.
   *
   * @param to - The destination LatLng.
   * @param distance - The distance traveled in meters.
   * @param heading - The heading in degrees clockwise from North.
   * @param radius - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The origin LatLng.
   */
  static computeOffsetOrigin(
    to: google.maps.LatLng | google.maps.LatLngLiteral,
    distance: number,
    heading: number,
    radius: number = EARTH_RADIUS,
  ): google.maps.LatLng {
    // To find the origin, we travel in the opposite direction from the destination
    const toLatLng = to instanceof MigrationLatLng ? to : new MigrationLatLng(to);
    const oppositeHeading = (heading + 180) % 360;

    return MigrationSpherical.computeOffset(toLatLng, distance, oppositeHeading, radius);
  }

  /**
   * Returns the signed area of a closed path. The sign of the area is positive if the ordering is counter-clockwise.
   *
   * @param loop - A closed loop path.
   * @param radius - Optional. The radius of the sphere in meters. Defaults to Earth's radius.
   * @returns The signed area in square meters.
   */
  static computeSignedArea(
    loop: google.maps.LatLng[] | google.maps.MVCArray<google.maps.LatLng>,
    radius: number = EARTH_RADIUS,
  ): number {
    const latLngs = Array.isArray(loop) ? loop : loop.getArray();

    // Create a polygon from the loop
    const coordinates = latLngs.map((latLng) => [latLng.lng(), latLng.lat()]);
    // Close the polygon if not already closed
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push(coordinates[0]);
    }

    const polygon = turf.polygon([coordinates]);
    const areaAtEarthRadius = turf.area(polygon);
    const scaledArea = areaAtEarthRadius * Math.pow(radius / EARTH_RADIUS, 2);

    // Check if the polygon is clockwise (negative area) or counter-clockwise (positive area)
    const isClockwise = turf.booleanClockwise(coordinates);

    return isClockwise ? -scaledArea : scaledArea;
  }

  /**
   * Returns the LatLng which lies the given fraction of the way between the origin and the destination.
   *
   * @param from - The starting LatLng.
   * @param to - The ending LatLng.
   * @param fraction - A fraction between 0 and 1.
   * @returns The interpolated LatLng.
   */
  static interpolate(
    from: google.maps.LatLng | google.maps.LatLngLiteral,
    to: google.maps.LatLng | google.maps.LatLngLiteral,
    fraction: number,
  ): google.maps.LatLng {
    const fromLatLng = from instanceof MigrationLatLng ? from : new MigrationLatLng(from);
    const toLatLng = to instanceof MigrationLatLng ? to : new MigrationLatLng(to);

    // Create a line between the two points
    const line = turf.lineString([
      [fromLatLng.lng(), fromLatLng.lat()],
      [toLatLng.lng(), toLatLng.lat()],
    ]);

    // Calculate the total distance
    const totalDistance = turf.length(line);

    // Get the point at the specified fraction
    const point = turf.along(line, totalDistance * fraction);
    const [lng, lat] = point.geometry.coordinates;

    return new MigrationLatLng(lat, lng);
  }
}
