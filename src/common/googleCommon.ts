// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LngLatBounds } from "maplibre-gl";
import * as turf from "@turf/turf";

export type LatLngLike = google.maps.LatLngLiteral | google.maps.LatLng;
export type LatLngBoundsLike = google.maps.LatLngBoundsLiteral | google.maps.LatLngBounds;

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
        southWest = new MigrationLatLng(swOrLatLngBounds as LatLngLike);
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

export class MigrationMVCObject implements google.maps.MVCObject {
  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  addListener(eventName: string, handler): google.maps.MapsEventListener {
    console.error("addListener not supported");

    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    return { remove: () => {} };
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  bindTo(key: string, target: google.maps.MVCObject, targetKey?: string | null, noNotify?: boolean): void {
    console.error("bindTo not supported");
  }

  get(key: string) {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      return this[key];
    }

    return undefined;
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  notify(key: string): void {
    console.error("notify not supported");
  }

  set(key: string, value: unknown): void {
    this[key] = value;
  }

  setValues(values?: object | null): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  unbind(key: string): void {
    console.error("unbind not supported");
  }

  unbindAll(): void {
    console.error("unbindAll not supported");
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

export enum PlacesServiceStatus {
  OK = "OK",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
  REQUEST_DENIED = "REQUEST_DENIED",
  INVALID_REQUEST = "INVALID_REQUEST",
  ZERO_RESULTS = "ZERO_RESULTS",
  NOT_FOUND = "NOT_FOUND",
}

export enum DirectionsStatus {
  OK = "OK",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
  REQUEST_DENIED = "REQUEST_DENIED",
  INVALID_REQUEST = "INVALID_REQUEST",
  ZERO_RESULTS = "ZERO_RESULTS",
  MAX_WAYPOINTS_EXCEEDED = "MAX_WAYPOINTS_EXCEEDED",
  NOT_FOUND = "NOT_FOUND",
}

export enum GeocoderStatus {
  ERROR = "ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  OK = "OK",
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
  REQUEST_DENIED = "REQUEST_DENIED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  ZERO_RESULTS = "ZERO_RESULTS",
}

export enum MapTypeId {
  HYBRID = "hybrid",
  ROADMAP = "roadmap",
  SATELLITE = "satellite",
  TERRAIN = "terrain",
}

export enum ColorScheme {
  DARK = "DARK",
  FOLLOW_SYSTEM = "FOLLOW_SYSTEM",
  LIGHT = "LIGHT",
}

// Migration version of google.maps.ControlPosition
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

// addListener response
export interface AddListenerResponse {
  instance;
  eventName: string;
  handler?;
  resultHandler?;
  resultsHandler?;
  listenerType?: string;
}

// Migration version of Google's Events
export const MigrationEvent = {
  center_changed: "center_changed",
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
  close: "close",
  closeclick: "closeclick",
};

// Constant responsible for translating Google Event names to corresponding MapLibre Event names,
// these Event names are passed into MapLibre's 'on' method
export const GoogleToMaplibreEvent = {};
GoogleToMaplibreEvent[MigrationEvent.center_changed] = "move";
GoogleToMaplibreEvent[MigrationEvent.click] = "click";
GoogleToMaplibreEvent[MigrationEvent.dblclick] = "dblclick";
GoogleToMaplibreEvent[MigrationEvent.contextmenu] = "contextmenu";
GoogleToMaplibreEvent[MigrationEvent.mousemove] = "mousemove";
GoogleToMaplibreEvent[MigrationEvent.mouseout] = "mouseout";
GoogleToMaplibreEvent[MigrationEvent.mouseover] = "mouseover";
GoogleToMaplibreEvent[MigrationEvent.tilesloaded] = "load";
GoogleToMaplibreEvent[MigrationEvent.tilt_changed] = "pitch";
GoogleToMaplibreEvent[MigrationEvent.zoom_changed] = "zoom";
GoogleToMaplibreEvent[MigrationEvent.drag] = "drag";
GoogleToMaplibreEvent[MigrationEvent.dragend] = "dragend";
GoogleToMaplibreEvent[MigrationEvent.dragstart] = "dragstart";
GoogleToMaplibreEvent[MigrationEvent.close] = "close";
GoogleToMaplibreEvent[MigrationEvent.closeclick] = "click";

// List of Google Map Events that include the MapMouseEvent parameter
export const GoogleMapMouseEvent = [
  MigrationEvent.click,
  MigrationEvent.dblclick,
  MigrationEvent.contextmenu,
  MigrationEvent.mousemove,
  MigrationEvent.mouseout,
  MigrationEvent.mouseover,
];

// List of Google Map Events that do not have any parameters
export const GoogleMapEvent = [
  MigrationEvent.center_changed,
  MigrationEvent.tilesloaded,
  MigrationEvent.tilt_changed,
  MigrationEvent.zoom_changed,
  MigrationEvent.drag,
  MigrationEvent.dragend,
  MigrationEvent.dragstart,
];

// List of Google Marker Events that are supported by MapLibre Markers that include the MapMouseEvent parameter
export const GoogleMarkerMouseEvent = [MigrationEvent.drag, MigrationEvent.dragstart, MigrationEvent.dragend];

// List of Google Marker Events that are not supported by MapLibre Markers that include the MapMouseEvent parameter
// (must add event listener using DOM element)
export const GoogleMarkerMouseDOMEvent = [MigrationEvent.click, MigrationEvent.dblclick, MigrationEvent.contextmenu];

// List of Google InfoWindow Events
export const GoogleInfoWindowEvent = [MigrationEvent.close, MigrationEvent.closeclick];
