// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Migration version of google.maps.LatLng
// This is only used in adapter standalone mode and in unit tests
class MigrationLatLng {
  lat: any;
  lng: any;

  constructor(lat: number, lng: number, noWrap?: boolean) {
    // TODO: Need to implement handling of noWrap
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

// Dynamic function to create a LatLng instance. It will first try google.maps.LatLng
// and if it's not found, our migration version will be used.
export const GoogleLatLng = function (lat, lng, noWrap = false) {
  return typeof google !== "undefined"
    ? new google.maps.LatLng(lat, lng, noWrap)
    : new MigrationLatLng(lat, lng, noWrap);
};
