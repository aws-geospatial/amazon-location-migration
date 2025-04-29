// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Migration version of google.maps.LatLng
export class MigrationLatLng implements google.maps.LatLng {
  #lat: number;
  #lng: number;

  constructor(
    latOrLatLngOrLatLngLiteral: number | google.maps.LatLngLiteral | google.maps.LatLng,
    lngOrNoClampNoWrap?: number | boolean | null,
    noClampNoWrap?: boolean,
  ) {
    if (latOrLatLngOrLatLngLiteral == null) {
      this.#lat = NaN;
      this.#lng = NaN;
    } else if (typeof latOrLatLngOrLatLngLiteral === "number") {
      this.#lat = latOrLatLngOrLatLngLiteral;
    } else if (latOrLatLngOrLatLngLiteral.lat !== undefined && latOrLatLngOrLatLngLiteral.lng !== undefined) {
      if (typeof latOrLatLngOrLatLngLiteral.lat === "number" && typeof latOrLatLngOrLatLngLiteral.lng === "number") {
        this.#lat = latOrLatLngOrLatLngLiteral.lat;
        this.#lng = latOrLatLngOrLatLngLiteral.lng;
      } else if (
        typeof latOrLatLngOrLatLngLiteral.lat === "function" &&
        typeof latOrLatLngOrLatLngLiteral.lng === "function"
      ) {
        this.#lat = latOrLatLngOrLatLngLiteral.lat();
        this.#lng = latOrLatLngOrLatLngLiteral.lng();
      }
    }

    let shouldClamp = true;
    if (typeof lngOrNoClampNoWrap === "number") {
      this.#lng = lngOrNoClampNoWrap;
    } else if (typeof lngOrNoClampNoWrap === "boolean") {
      shouldClamp = !lngOrNoClampNoWrap;
    }

    if (typeof noClampNoWrap === "boolean") {
      shouldClamp = !noClampNoWrap;
    }

    if (shouldClamp && this.#lat != null && this.#lng != null) {
      // Latitude should be clamped to [-90, 90]
      if (this.#lat < -90) {
        this.#lat = -90;
      } else if (this.#lat > 90) {
        this.#lat = 90;
      }

      // Longitude should be wrapped to [-180, 180]
      const minLongitude = -180;
      const maxLongitude = 180;
      if (this.#lng < minLongitude || this.#lng > maxLongitude) {
        const range = maxLongitude - minLongitude;
        const wrapped = ((((this.#lng - minLongitude) % range) + range) % range) + minLongitude;

        this.#lng = wrapped;
      }
    }
  }

  equals(other) {
    return other ? this.lat() == other.lat() && this.lng() == other.lng() : false;
  }

  lat() {
    return this.#lat;
  }

  lng() {
    return this.#lng;
  }

  toString() {
    return "(" + this.lat() + ", " + this.lng() + ")";
  }

  toJSON() {
    return {
      lat: this.lat(),
      lng: this.lng(),
    };
  }

  // Rounded to 6 decimal places by default
  toUrlValue(precision = 6) {
    // Trim trailing 0's by using trick of dividing by 1 afterwards
    const latDigits = this.lat().toPrecision(precision);
    const latTrimmed = parseFloat(latDigits) / 1;
    const lngDigits = this.lng().toPrecision(precision);
    const lngTrimmed = parseFloat(lngDigits) / 1;

    return `${latTrimmed},${lngTrimmed}`;
  }
}

// function that takes in a Google LatLng or LatLngLiteral and returns array containing a
// longitude and latitude (valid MapLibre input), returns 'null' if 'coord' parameter
// is not a Google LatLng or LatLngLiteral
export const LatLngToLngLat = function (coord): [number, number] {
  const latLng = new MigrationLatLng(coord);
  const lat = latLng.lat();
  const lng = latLng.lng();
  if (isFinite(lat) && isFinite(lng)) {
    return [lng, lat];
  }

  return null;
};
