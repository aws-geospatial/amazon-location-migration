// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Migration version of google.maps.LatLng
// This is only used in adapter standalone mode and in unit tests
class MigrationLatLng {
  lat: any;
  lng: any;

  constructor(lat: number, lng: number, noWrap?: boolean) {
    // TODO: Need to implement handling of noWrap
    // TODO: Add support for handling LatLngLiteral

    // These are implemented as property functions instead of prototype functions
    // to match the google.maps API
    this.lat = function () {
      return lat;
    };

    this.lng = function () {
      return lng;
    };
  }

  equals(other) {
    return other ? this.lat() == other.lat() && this.lng() == other.lng() : false;
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

  toUrlValue() {
    return this.lat() + "," + this.lng();
  }
}

// Migration version of google.maps.LatLngBounds
// This is only used in adapter standalone mode and in unit tests
class MigrationLatLngBounds {
  sw: MigrationLatLng;
  ne: MigrationLatLng;

  constructor(swOrLatLngBounds, ne) {
    // TODO: Handle LatLngBoundsLiteral

    this.sw = swOrLatLngBounds;
    this.ne = ne;
  }

  getNorthEast() {
    return this.ne;
  }

  getSouthWest() {
    return this.sw;
  }
}

// Dynamic function to create a LatLng instance. It will first try google.maps.LatLng
// and if it's not found, our migration version will be used.
export const GoogleLatLng = function (lat, lng, noWrap = false) {
  return typeof google !== "undefined"
    ? new google.maps.LatLng(lat, lng, noWrap)
    : new MigrationLatLng(lat, lng, noWrap);
};

// Dynamic function to create a LatLngBounds instance. It will first try google.maps.LatLngBounds
// and if it's not found, our migration version will be used.
export const GoogleLatLngBounds = function (swOrLatLngBounds, ne) {
  return typeof google !== "undefined"
    ? new google.maps.LatLngBounds(swOrLatLngBounds, ne)
    : new MigrationLatLngBounds(swOrLatLngBounds, ne);
};

export const PlacesServiceStatus = {
  OK: "OK",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  OVER_QUERY_LIMIT: "OVER_QUERY_LIMIT",
  REQUEST_DENIED: "REQUEST_DENIED",
  INVALID_REQUEST: "INVALID_REQUEST",
  ZERO_RESULTS: "ZERO_RESULTS",
  NOT_FOUND: "NOT_FOUND",
};

export const DirectionsStatus = {
  OK: "OK",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  OVER_QUERY_LIMIT: "OVER_QUERY_LIMIT",
  REQUEST_DENIED: "REQUEST_DENIED",
  INVALID_REQUEST: "INVALID_REQUEST",
  ZERO_RESULTS: "ZERO_RESULTS",
  MAX_WAYPOINTS_EXCEEDED: "MAX_WAYPOINTS_EXCEEDED",
  NOT_FOUND: "NOT_FOUND",
};

export interface QueryAutocompletePrediction {
  description: string;
  place_id?: string;
}
