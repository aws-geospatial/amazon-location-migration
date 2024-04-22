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

  // TODO: Add methods to match Google LatLngBounds
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

// function that takes in a Google LatLng or LatLngLiteral and returns array containing a
// longitude and latitude (valid MapLibre input), returns 'null' if 'coord' parameter
// is not a Google LatLng or LatLngLiteral
export const LatLngToLngLat = function (coord): [number, number] {
  if (coord.lng !== undefined && coord.lat !== undefined) {
    if (typeof coord.lng === "number" && typeof coord.lat === "number") {
      return [coord.lng, coord.lat];
    } else if (typeof coord.lng === "function" && typeof coord.lat === "function") {
      return [coord.lng(), coord.lat()];
    }
  }
  return null;
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

// Migration version of google.maps.ControlPosition
// This is only used in adapter standalone mode and in unit tests
export const MigrationControlPosition = {
  TOP_LEFT: 1,
  TOP_CENTER: 2,
  TOP: 2,
  TOP_RIGHT: 3,
  LEFT_CENTER: 4,
  LEFT_TOP: 5,
  LEFT: 5,
  LEFT_BOTTOM: 6,
  RIGHT_TOP: 7,
  RIGHT: 7,
  RIGHT_CENTER: 8,
  RIGHT_BOTTOM: 9,
  BOTTOM_LEFT: 10,
  BOTTOM_CENTER: 11,
  BOTTOM: 11,
  BOTTOM_RIGHT: 12,
  CENTER: 13,
  BLOCK_START_INLINE_START: 14,
  BLOCK_START_INLINE_CENTER: 15,
  BLOCK_START_INLINE_END: 16,
  INLINE_START_BLOCK_CENTER: 17,
  INLINE_START_BLOCK_START: 18,
  INLINE_START_BLOCK_END: 19,
  INLINE_END_BLOCK_START: 20,
  INLINE_END_BLOCK_CENTER: 21,
  INLINE_END_BLOCK_END: 22,
  BLOCK_END_INLINE_START: 23,
  BLOCK_END_INLINE_CENTER: 24,
  BLOCK_END_INLINE_END: 25,
};

// Constant responsible for translating numbers representing Google ControlPositions into MapLibre position
// strings that can be passed into MapLibre's 'addControl'
// see more on Google ControlPosition: https://developers.google.com/maps/documentation/javascript/controls#ControlPositioning
// see more on MapLibre ControlPosition: https://maplibre.org/maplibre-gl-js/docs/API/types/ControlPosition/
export const GoogleToMaplibreControlPosition = {};
GoogleToMaplibreControlPosition[MigrationControlPosition.TOP_LEFT] = "top-left";
GoogleToMaplibreControlPosition[MigrationControlPosition.TOP_RIGHT] = "top-right";
GoogleToMaplibreControlPosition[MigrationControlPosition.LEFT_TOP] = "top-left";
GoogleToMaplibreControlPosition[MigrationControlPosition.LEFT_BOTTOM] = "bottom-left";
GoogleToMaplibreControlPosition[MigrationControlPosition.RIGHT_TOP] = "top-right";
GoogleToMaplibreControlPosition[MigrationControlPosition.RIGHT_BOTTOM] = "bottom-right";
GoogleToMaplibreControlPosition[MigrationControlPosition.BOTTOM_LEFT] = "bottom-left";
GoogleToMaplibreControlPosition[MigrationControlPosition.BOTTOM_RIGHT] = "bottom-right";

// Migration version of Google's Map Events
export const MigrationMapEvent = {
  click: "click",
  dblclick: "dblclick",
  contextmenu: "contextmenu",
  mousemove: "mousemove",
  mouseout: "mouseout",
  mouseover: "mouseover",
  tilesloaded: "tilesloaded",
  tilt_changed: "tilt_changed",
  zoom_changed: "zoom_changed",
  drag: "drag",
  dragend: "dragend",
  dragstart: "dragstart",
};

// Constant responsible for translating Google Event names to corresponding MapLibre Event names,
// these Event names are passed into MapLibre's 'on' method
export const GoogleToMaplibreMapEvent = {};
GoogleToMaplibreMapEvent[MigrationMapEvent.click] = "click";
GoogleToMaplibreMapEvent[MigrationMapEvent.dblclick] = "dblclick";
GoogleToMaplibreMapEvent[MigrationMapEvent.contextmenu] = "contextmenu";
GoogleToMaplibreMapEvent[MigrationMapEvent.mousemove] = "mousemove";
GoogleToMaplibreMapEvent[MigrationMapEvent.mouseout] = "mouseout";
GoogleToMaplibreMapEvent[MigrationMapEvent.mouseover] = "mouseover";
GoogleToMaplibreMapEvent[MigrationMapEvent.tilesloaded] = "load";
GoogleToMaplibreMapEvent[MigrationMapEvent.tilt_changed] = "pitch";
GoogleToMaplibreMapEvent[MigrationMapEvent.zoom_changed] = "zoom";
GoogleToMaplibreMapEvent[MigrationMapEvent.drag] = "drag";
GoogleToMaplibreMapEvent[MigrationMapEvent.dragend] = "dragend";
GoogleToMaplibreMapEvent[MigrationMapEvent.dragstart] = "dragstart";

// List of Google Events that include the MapMouseEvent parameter
export const GoogleMapMouseEvent = [
  MigrationMapEvent.click,
  MigrationMapEvent.dblclick,
  MigrationMapEvent.contextmenu,
  MigrationMapEvent.mousemove,
  MigrationMapEvent.mouseout,
  MigrationMapEvent.mouseover,
];

// List of Google Events that do not have any parameters
export const GoogleMapEvent = [
  MigrationMapEvent.tilesloaded,
  MigrationMapEvent.tilt_changed,
  MigrationMapEvent.zoom_changed,
  MigrationMapEvent.drag,
  MigrationMapEvent.dragend,
  MigrationMapEvent.dragstart,
];

export interface QueryAutocompletePrediction {
  description: string;
  place_id?: string;
}
