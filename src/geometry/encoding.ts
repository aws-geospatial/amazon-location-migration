// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodeToLngLatArray, encodeFromLngLatArray } from "@aws/polyline";
import { MigrationLatLng } from "../common/lat_lng";

/**
 * Utility functions for encoding and decoding polylines.
 */
export class MigrationEncoding {
  /**
   * Decodes an encoded path string into a sequence of LatLngs.
   * @param encodedPath - An encoded path string.
   * @returns An array of LatLng objects.
   */
  static decodePath(encodedPath: string): google.maps.LatLng[] {
    const lngLatArray = decodeToLngLatArray(encodedPath);
    return lngLatArray.map(([lng, lat]) => new MigrationLatLng(lat, lng));
  }

  /**
   * Encodes a sequence of LatLngs into an encoded path string.
   * @param path - A sequence of LatLngs.
   * @returns An encoded path string.
   */
  static encodePath(
    path: google.maps.LatLng[] | google.maps.MVCArray<google.maps.LatLng>,
  ): string {
    let latLngs: google.maps.LatLng[];

    if (Array.isArray(path)) {
      latLngs = path;
    } else {
      // MVCArray
      latLngs = path.getArray();
    }

    const lngLatArray: [number, number][] = latLngs.map((latLng) => [
      latLng.lng(),
      latLng.lat(),
    ]);

    return encodeFromLngLatArray(lngLatArray);
  }
}
