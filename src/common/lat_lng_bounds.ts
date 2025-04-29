// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LngLatBounds } from "maplibre-gl";
import * as turf from "@turf/turf";

import { LatLngToLngLat, MigrationLatLng } from "./lat_lng";

// Migration version of google.maps.LatLngBounds
export class MigrationLatLngBounds implements google.maps.LatLngBounds {
  #lngLatBounds: LngLatBounds;

  constructor(
    swOrLatLngBounds?:
      | google.maps.LatLng
      | null
      | google.maps.LatLngLiteral
      | google.maps.LatLngBounds
      | google.maps.LatLngBoundsLiteral,
    ne?: google.maps.LatLng | null | google.maps.LatLngLiteral,
  ) {
    let west, south, east, north;

    if (!swOrLatLngBounds) {
      // Inputs are empty, so create an empty LngLatBounds
      this.#lngLatBounds = new LngLatBounds();
      return;
    } else {
      let southWest, northEast;
      if (ne) {
        southWest = new MigrationLatLng(swOrLatLngBounds as google.maps.LatLngLiteral | google.maps.LatLng);
        northEast = new MigrationLatLng(ne);

        west = southWest.lng();
        south = southWest.lat();
        east = northEast.lng();
        north = northEast.lat();
      } else if (swOrLatLngBounds instanceof MigrationLatLngBounds) {
        southWest = swOrLatLngBounds.getSouthWest();
        northEast = swOrLatLngBounds.getNorthEast();

        west = southWest.lng();
        south = southWest.lat();
        east = northEast.lng();
        north = northEast.lat();
      } /* google.maps.LatLngBoundsLiteral */ else {
        const boundsLiteral = swOrLatLngBounds as google.maps.LatLngBoundsLiteral;
        west = boundsLiteral.west;
        south = boundsLiteral.south;
        east = boundsLiteral.east;
        north = boundsLiteral.north;
      }

      // west, south, east, north
      this.#lngLatBounds = new LngLatBounds([west, south, east, north]);
    }
  }

  contains(latLng) {
    return this.#lngLatBounds.contains(LatLngToLngLat(latLng));
  }

  equals(other) {
    const otherBounds = new MigrationLatLngBounds(other);

    return (
      this.getSouthWest().equals(otherBounds.getSouthWest()) && this.getNorthEast().equals(otherBounds.getNorthEast())
    );
  }

  extend(point) {
    const lngLat = LatLngToLngLat(point);

    this.#lngLatBounds.extend(lngLat);

    return this;
  }

  intersects(other) {
    const otherBounds = new MigrationLatLngBounds(other);

    const bboxPolygon = turf.bboxPolygon([
      this.#lngLatBounds.getWest(),
      this.#lngLatBounds.getSouth(),
      this.#lngLatBounds.getEast(),
      this.#lngLatBounds.getNorth(),
    ]);

    const otherLngLatBounds = otherBounds._getBounds();
    const otherBboxPolygon = turf.bboxPolygon([
      otherLngLatBounds.getWest(),
      otherLngLatBounds.getSouth(),
      otherLngLatBounds.getEast(),
      otherLngLatBounds.getNorth(),
    ]);

    return turf.booleanOverlap(bboxPolygon, otherBboxPolygon);
  }

  getCenter() {
    const lngLatCenter = this.#lngLatBounds.getCenter();
    return new MigrationLatLng(lngLatCenter.lat, lngLatCenter.lng);
  }

  getNorthEast() {
    const northEast = this.#lngLatBounds.getNorthEast();
    return new MigrationLatLng(northEast.lat, northEast.lng);
  }

  getSouthWest() {
    const southWest = this.#lngLatBounds.getSouthWest();
    return new MigrationLatLng(southWest.lat, southWest.lng);
  }

  isEmpty() {
    return this.#lngLatBounds.isEmpty();
  }

  toJSON() {
    return {
      east: this.#lngLatBounds.getEast(),
      north: this.#lngLatBounds.getNorth(),
      west: this.#lngLatBounds.getWest(),
      south: this.#lngLatBounds.getSouth(),
    };
  }

  toSpan() {
    const latSpan = this.#lngLatBounds.getNorth() - this.#lngLatBounds.getSouth();
    const lngSpan = this.#lngLatBounds.getEast() - this.#lngLatBounds.getWest();

    return new MigrationLatLng(latSpan, lngSpan);
  }

  toString() {
    const south = this.#lngLatBounds.getSouth();
    const west = this.#lngLatBounds.getWest();
    const north = this.#lngLatBounds.getNorth();
    const east = this.#lngLatBounds.getEast();

    return `((${south}, ${west}), (${north}, ${east}))`;
  }

  // Rounded to 6 decimal places by default
  toUrlValue(precision = 6) {
    // Trim trailing 0's by using trick of dividing by 1 afterwards
    const southDigits = this.#lngLatBounds.getSouth().toPrecision(precision);
    const southTrimmed = parseFloat(southDigits) / 1;
    const westDigits = this.#lngLatBounds.getWest().toPrecision(precision);
    const westTrimmed = parseFloat(westDigits) / 1;
    const northDigits = this.#lngLatBounds.getNorth().toPrecision(precision);
    const northTrimmed = parseFloat(northDigits) / 1;
    const eastDigits = this.#lngLatBounds.getEast().toPrecision(precision);
    const eastTrimmed = parseFloat(eastDigits) / 1;

    return `${southTrimmed},${westTrimmed},${northTrimmed},${eastTrimmed}`;
  }

  union(other) {
    const bounds = new MigrationLatLngBounds(other);

    this.#lngLatBounds.extend(bounds._getBounds());

    return this;
  }

  // Internal method for migration logic that needs to access the underlying MapLibre LngLatBounds
  _getBounds() {
    return this.#lngLatBounds;
  }
}
