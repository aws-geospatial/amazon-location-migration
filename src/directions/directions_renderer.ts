// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AddListenerResponse } from "../common";
import { MigrationMap, MigrationMarker } from "../maps";

const ASCII_CODE_A = 65;

export class MigrationDirectionsRenderer {
  #directions: google.maps.DirectionsResult | null;
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
  #routeLayerId: string | null;

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

  getDirections(): google.maps.DirectionsResult | null {
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

  setDirections(directions: google.maps.DirectionsResult | null): void {
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
    if (this.#routeLayerId) {
      const maplibreMap = this.#map._getMap();
      maplibreMap.removeLayer(this.#routeLayerId);
      maplibreMap.removeSource(this.#routeLayerId);
      this.#routeLayerId = null;
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

    // TODO: Detect geometry type instead of just doing LineString
    if (this.#suppressPolylines === false) {
      // We need to get a list of LngLat[] coordinates as the LineString data geometry to pass to MapLibre
      // from the overview_path passed in from Google's DirectionsRoute, which comes as a list
      // of google.maps.LatLng instances
      const coordinates = route.overview_path.map((latLng) => [latLng.lng(), latLng.lat()]);

      // Unique layer ID for this particular directions renderer and route
      this.#routeLayerId = `directions-renderer-${this.rendererIndex}-route-${this.#routeIndex}`;

      const maplibreMap = this.#map._getMap();
      maplibreMap.addSource(this.#routeLayerId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
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
        paintOptions["line-color"] = "#73B9FF";
        paintOptions["line-width"] = 8;
        paintOptions["line-opacity"] = 0.5;
      }

      maplibreMap.addLayer({
        id: this.#routeLayerId,
        type: "line",
        source: this.#routeLayerId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: this.#polylineOptions && this.#polylineOptions.visible == false ? "none" : "visible",
        },
        paint: paintOptions,
      });
    }

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];

      // Add markers for the start location of the current leg
      if (this.#suppressMarkers === false) {
        const startLocation = leg.start_location;

        const startMarkerOptions =
          this.#markerOptions === undefined
            ? { label: String.fromCharCode(ASCII_CODE_A + i) }
            : structuredClone(this.#markerOptions);
        startMarkerOptions.position = startLocation;
        startMarkerOptions.map = this.#map;
        const startMarker = new MigrationMarker(startMarkerOptions);
        this.#markers.push(startMarker);
      }

      // TODO: Add default info windows once location information is passed into route result
    }

    // Add final marker for end location of enture route
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
