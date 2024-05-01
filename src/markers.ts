// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker, MarkerOptions } from "maplibre-gl";
import { GoogleLatLng, LatLngToLngLat } from "./googleCommon";

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

    // need to use 'in' because 'false' is valid input
    if ("draggable" in options) {
      this.setDraggable(options.draggable);
    }

    // need to use 'in' because 'false' is valid input
    if ("gmpDraggable" in options) {
      this.setDraggable(options.gmpDraggable);
    }

    if (options.position) {
      this.setPosition(options.position);
    }

    if (options.opacity) {
      this.setOpacity(options.opacity);
    }

    // need to use 'in' because null and undefined are valid inputs
    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  getDraggable() {
    return this.#marker.isDraggable();
  }

  getIcon() {
    return (this.#marker.getElement() as HTMLImageElement).src;
  }

  getPosition() {
    const position = this.#marker.getLngLat();

    return GoogleLatLng(position?.lat, position?.lng);
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

  // only need to handle legacy marker options (setOptions not an Advanced Marker method)
  setOptions(options) {
    if ("draggable" in options) {
      this.setDraggable(options.draggable);
    }

    if (options.position) {
      this.setPosition(options.position);
    }

    // need to use 'in' because 0 is valid input
    if ("opacity" in options) {
      this.setOpacity(options.opacity);
    }

    // need to use 'in' because null and undefined are valid inputs
    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  setMap(map) {
    if (map !== null && map !== undefined) {
      this.#marker.addTo(map._getMap());
    } else {
      this.#marker.remove();
    }
  }

  remove() {
    this.#marker.remove();
  }

  // Internal method for manually setting the private #map property (used for mocking the map in unit testing)
  _setMarker(marker) {
    this.#marker = marker;
  }
}

export { MigrationMarker };
