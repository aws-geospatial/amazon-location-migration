// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
