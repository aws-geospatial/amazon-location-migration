// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker, MarkerOptions } from "maplibre-gl";
import { LatLngToLngLat } from "./googleCommon";

class MigrationMarker {
  #marker: Marker;

  constructor(options) {
    const maplibreOptions: MarkerOptions = {};

    // handles:
    // - HTML-based marker
    // - custom graphic file
    // - does not support inline SVG or any customization that uses PinElement
    if (options.content) {
      if (options.content instanceof HTMLElement) {
        maplibreOptions.element = options.content;
      } else if (typeof options.content === "string") {
        const img = new Image();
        img.src = options.content;
        maplibreOptions.element = img;
      }
    }

    // handles:
    // - url parameter
    // - simple icon interface parameter (no customizability),
    // - does not handle svg parameter
    if (options.icon) {
      if (typeof options.icon === "object") {
        const img = new Image();
        img.src = options.icon.url;
        maplibreOptions.element = img;
      } else if (typeof options.icon === "string") {
        const img = new Image();
        img.src = options.icon;
        maplibreOptions.element = img;
      }
    }

    this.#marker = new Marker(maplibreOptions);

    if (typeof options.draggable !== "undefined") {
      this.setDraggable(options.draggable);
    }

    if (typeof options.gmpDraggable !== "undefined") {
      this.setDraggable(options.gmpDraggable);
    }

    if (options.position) {
      this.setPosition(options.position);
    }

    if (options.opacity) {
      this.setOpacity(options.opacity);
    }

    if (options.map) {
      this.setMap(options.map);
    }
  }

  setDraggable(draggable) {
    this.#marker.setDraggable(draggable);
  }

  setPosition(position) {
    const lnglat = LatLngToLngLat(position);
    this.#marker.setLngLat(lnglat);
  }

  setOpacity(opacity) {
    this.#marker.setOpacity(opacity);
  }

  setMap(map) {
    if (map) {
      this.#marker.addTo(map._getMap());
    } else {
      this.#marker.remove();
    }
  }

  remove() {
    this.#marker.remove();
  }
}

export { MigrationMarker };
