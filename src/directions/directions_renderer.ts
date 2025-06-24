// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AddListenerResponse } from "../common";
import { MigrationMap, MigrationMarker } from "../maps";

const ASCII_CODE_A = 65;
const DEFAULT_LINE_COLOR = "#73B9FF";
const DEFAULT_LINE_OPACITY = 0.5;
const DEFAULT_LINE_WIDTH = 8;

export class MigrationDirectionsRenderer {
  #directions;
  #routeIndex = 0;
  #markers: MigrationMarker[];
  #map: MigrationMap;
  #markerOptions;
  #polylineOptions;
  #preserveViewport = false;
  #suppressMarkers = false;
  #suppressPolylines = false;
  #onDirectionsChangedListeners = [];
  #onceDirectionsChangedListeners = [];
  #legRenderIds = [];

  // Keep a static index so we can have multiple directions renderers
  // with sources and layers on the same map that can be differentiated
  // by the rendererIndex
  private static counter = 0;
  private readonly rendererIndex: number;

  constructor(options?) {
    this.rendererIndex = MigrationDirectionsRenderer.counter++;

    this.#markers = [];

    this.setOptions(options);
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "directions_changed") {
      // Capitalize the first letter of the listernerType string since MapLibre's method names are
      // 'On' and 'Once', not 'on' and 'once'
      if (typeof listenerType == "string" && listenerType.length > 0) {
        const capitalizedListenerType = listenerType.charAt(0).toUpperCase() + listenerType.slice(1);
        const listener = {
          instance: this,
          eventName: eventName,
          handler: handler,
          listenerType: capitalizedListenerType,
        };
        this[`_get${capitalizedListenerType}DirectionsChangedListeners`]().push(listener);
        return listener;
      }
    }
  }

  getDirections() {
    return this.#directions;
  }

  getMap() {
    return this.#map;
  }

  getRouteIndex(): number {
    return this.#routeIndex;
  }

  setMap(map) {
    // If we're being removed from the map, clear the directions first
    if (!map) {
      this._clearRoute();
    }

    this.#map = map;

    this._updateRouteDrawing();
  }

  setDirections(directions: google.maps.DirectionsResult | null) {
    this.#directions = directions;

    this._updateRouteDrawing();

    if (this.#onDirectionsChangedListeners.length != 0) {
      this.#onDirectionsChangedListeners.forEach((listener) => {
        listener.handler();
      });
    }
    if (this.#onceDirectionsChangedListeners.length != 0) {
      while (this.#onceDirectionsChangedListeners.length > 0) {
        // get handler then call it as a function
        this.#onceDirectionsChangedListeners.pop().handler();
      }
    }
  }

  setOptions(options: google.maps.DirectionsRendererOptions | null) {
    if (!options) {
      return;
    }

    if ("markerOptions" in options) {
      this.#markerOptions = options.markerOptions;
    }

    if ("preserveViewport" in options) {
      this.#preserveViewport = options.preserveViewport;
    }

    if ("directions" in options) {
      this.setDirections(options.directions);
    }

    if ("suppressMarkers" in options) {
      this.#suppressMarkers = options.suppressMarkers;
    }

    if ("suppressPolylines" in options) {
      this.#suppressPolylines = options.suppressPolylines;
    }

    if ("polylineOptions" in options) {
      this.#polylineOptions = options.polylineOptions;
    }

    if ("routeIndex" in options) {
      this.#routeIndex = options.routeIndex;
    }

    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  setRouteIndex(routeIndex: number): void {
    this.#routeIndex = routeIndex;

    this._updateRouteDrawing();
  }

  _clearRoute() {
    if (this.#markers.length) {
      this.#markers.forEach(function (marker) {
        marker.remove();
      });
      this.#markers = [];
    }
    if (this.#legRenderIds.length) {
      const maplibreMap = this.#map._getMap();
      this.#legRenderIds.forEach(function (legId) {
        maplibreMap.removeLayer(legId);
        maplibreMap.removeSource(legId);
      });
      this.#legRenderIds = [];
    }
  }

  _updateRouteDrawing() {
    // First, remove any pre-existing drawn route and its markers
    this._clearRoute();

    // Early exit if nothing to draw (e.g. if directions were set to null)
    if (!this.#directions || !this.#map) {
      return;
    }

    // Google doesn't throw an error if you set a route index out of range, it just doesn't render anything
    if (this.#routeIndex >= this.#directions.routes.length) {
      return;
    }

    const route = this.#directions.routes[this.#routeIndex];

    // Adjust the map to fit to the bounds for this route if preserveViewport option is not set to true
    if (this.#preserveViewport === false) {
      const boundsPaddingInPixels = 100;
      this.#map.fitBounds(route.bounds, boundsPaddingInPixels);
    }

    const maplibreMap = this.#map._getMap();

    // Draw single LineString for the entire route
    // TODO: Detect geometry type instead of just doing LineString
    if (this.#suppressPolylines === false) {
      const routeId = `directions-renderer-${this.rendererIndex}-route-${this.#routeIndex}`;
      maplibreMap.addSource(routeId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.overview_path.map((coord) => [coord.lat(), coord.lng()]),
          },
        },
      });
      // 8 weight, 0.5 opacity, "#73B9FF" color for default, 3 weight, 1 opacity, "Black" color used when one property is set
      const paintOptions = {};
      if (this.#polylineOptions) {
        paintOptions["line-color"] = this.#polylineOptions.strokeColor ? this.#polylineOptions.strokeColor : "Black";
        paintOptions["line-width"] = this.#polylineOptions.strokeWeight ? this.#polylineOptions.strokeWeight : 3;
        paintOptions["line-opacity"] = this.#polylineOptions.strokeOpacity ? this.#polylineOptions.strokeOpacity : 1;
      } else {
        // default line
        paintOptions["line-color"] = DEFAULT_LINE_COLOR;
        paintOptions["line-width"] = DEFAULT_LINE_WIDTH;
        paintOptions["line-opacity"] = DEFAULT_LINE_OPACITY;
      }

      // Add the route layer
      maplibreMap.addLayer({
        id: routeId,
        type: "line",
        source: routeId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: this.#polylineOptions && this.#polylineOptions.visible == false ? "none" : "visible",
        },
        paint: paintOptions,
      });

      this.#legRenderIds.push(routeId);

      // TODO: Add default info windows once location information is passed into route result
    }

    // Add markers (if not suppressed)

    // Add first marker for the start location of the current route
    if (this.#suppressMarkers === false) {
      const firstLeg = route.legs[0];
      const startMarkerOptions =
        this.#markerOptions === undefined
          ? { label: String.fromCharCode(ASCII_CODE_A) } // ASCII_CODE_A + 0 where 0 is the index of first leg
          : structuredClone(this.#markerOptions);
      startMarkerOptions.position = firstLeg.start_location;
      startMarkerOptions.map = this.#map;
      const startMarker = new MigrationMarker(startMarkerOptions);
      this.#markers.push(startMarker);
    }

    // Add final marker for end location of entire route
    if (this.#suppressMarkers === false) {
      const lastLeg = route.legs[route.legs.length - 1];
      const endMarkerOptions =
        this.#markerOptions === undefined
          ? { label: String.fromCharCode(ASCII_CODE_A + route.legs.length) }
          : structuredClone(this.#markerOptions);
      endMarkerOptions.position = lastLeg.end_location;
      endMarkerOptions.map = this.#map;
      const endMarker = new MigrationMarker(endMarkerOptions);
      this.#markers.push(endMarker);
    }
  }

  _getMarkers() {
    return this.#markers;
  }

  _getMarkerOptions() {
    return this.#markerOptions;
  }

  _getPreserveViewport() {
    return this.#preserveViewport;
  }

  _getSuppressMarkers() {
    return this.#suppressMarkers;
  }

  _getSuppressPolylines() {
    return this.#suppressPolylines;
  }

  _getOnDirectionsChangedListeners() {
    return this.#onDirectionsChangedListeners;
  }

  _getOnceDirectionsChangedListeners() {
    return this.#onceDirectionsChangedListeners;
  }

  _setOnDirectionsChangedListeners(listeners) {
    this.#onDirectionsChangedListeners = listeners;
  }

  _setOnceDirectionsChangedListeners(listeners) {
    this.#onceDirectionsChangedListeners = listeners;
  }
}
