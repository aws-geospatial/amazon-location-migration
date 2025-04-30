// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AddListenerResponse } from "../common";
import { MigrationMap, MigrationMarker } from "../maps";

const ASCII_CODE_A = 65;

export class MigrationDirectionsRenderer {
  #directions;
  #markers: MigrationMarker[];
  #map: MigrationMap;
  #markerOptions;
  #polylineOptions;
  #preserveViewport = false;
  #suppressMarkers = false;
  #suppressPolylines = false;
  #onDirectionsChangedListeners = [];
  #onceDirectionsChangedListeners = [];
  #routeIds = [];

  constructor(options?) {
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

  setMap(map) {
    // If we're being removed from the map, clear the directions first
    if (!map) {
      this._clearDirections();
    }

    this.#map = map;
  }

  setDirections(directions) {
    // TODO: Currently only support one route for directions
    if (directions.routes.length !== 1) {
      return;
    }

    this.#directions = directions;

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

    // First, remove any pre-existing drawn route and its markers
    this._clearDirections();

    const route = directions.routes[0];

    // Adjust the map to fit to the bounds for this route if preserveViewport option is not set to true
    if (this.#preserveViewport === false) {
      const boundsPaddingInPixels = 100;
      this.#map.fitBounds(route.bounds, boundsPaddingInPixels);
    }

    const maplibreMap = this.#map._getMap();
    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];

      // leg.geometry is a new field we've added, because Google doesn't provide the polyline
      // for the leg as a whole, only for the individual steps, but our API (currently) only provides
      // a polyline for the entire leg.
      // TODO: Once we've removed this, we can change the input param of setDirections to be typed (directions: google.maps.DirectionsResult | null)
      const geometry = leg.geometry;

      // TODO: Detect geometry type instead of just doing LineString
      if (this.#suppressPolylines === false) {
        const routeId = "route" + i;
        maplibreMap.addSource(routeId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: geometry.LineString,
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

        this.#routeIds.push(routeId);
      }

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

  setOptions(options?) {
    if (options !== undefined && "map" in options) {
      this.setMap(options.map);
    }

    if (options !== undefined && "markerOptions" in options) {
      this.#markerOptions = options.markerOptions;
    }

    if (options !== undefined && "preserveViewport" in options) {
      this.#preserveViewport = options.preserveViewport;
    }

    if (options !== undefined && "directions" in options) {
      this.setDirections(options.directions);
    }

    if (options !== undefined && "suppressMarkers" in options) {
      this.#suppressMarkers = options.suppressMarkers;
    }

    if (options !== undefined && "suppressPolylines" in options) {
      this.#suppressPolylines = options.suppressPolylines;
    }

    if (options !== undefined && "polylineOptions" in options) {
      this.#polylineOptions = options.polylineOptions;
    }
  }

  _clearDirections() {
    if (this.#markers.length) {
      this.#markers.forEach(function (marker) {
        marker.remove();
      });
      this.#markers = [];
    }
    if (this.#routeIds.length) {
      const maplibreMap = this.#map._getMap();
      this.#routeIds.forEach(function (routeId) {
        maplibreMap.removeLayer(routeId);
        maplibreMap.removeSource(routeId);
      });
      this.#routeIds = [];
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
