// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker, MarkerOptions } from "maplibre-gl";
import { GoogleLatLng, LatLngToLngLat } from "./googleCommon";

class MigrationMarker {
  #marker: Marker;

  constructor(options) {
    const maplibreOptions: MarkerOptions = {};

    // Advanced Marker content customizability
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
        const imgContainer = document.createElement("div");
        const imgElement = new Image();
        imgElement.src = options.icon.url;
        imgContainer.appendChild(imgElement);
        maplibreOptions.element = imgContainer;
      } else if (typeof options.icon === "string") {
        const imgContainer = document.createElement("div");
        const imgElement = new Image();
        imgElement.src = options.icon;
        imgContainer.appendChild(imgElement);
        maplibreOptions.element = imgContainer;
      }
    }

    this.#marker = new Marker(maplibreOptions);

    // Cannot unit test due to being a DOM based function, our current unit test infrastructure
    // does not support testing these kinds of functions.
    if (options.label) {
      // check if marker is default or custom icon, if default marker, then remove inner circle
      const marker = this.#marker._element;
      const svg = marker.querySelector("svg");
      if (svg) {
        const firstG = svg.querySelector("g");
        const removedChild = firstG.removeChild(firstG.children[4]);
        removedChild.remove();
      }

      // create label
      const defaultMarker = svg === null ? false : true;
      const label =
        typeof options.label === "object"
          ? this._createLabel(
              defaultMarker,
              options.label.text,
              options.label.className,
              options.label.color,
              options.label.fontFamily,
              options.label.fontSize,
              options.label.fontWeight,
            )
          : typeof options.label === "string"
          ? this._createLabel(defaultMarker, options.label)
          : undefined;

      // add label to marker
      if (label !== undefined) {
        marker.appendChild(label);
      }
    }

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

  // Internal method for creating a span element containing the label to add to the Marker element
  _createLabel(
    defaultMarker: boolean,
    text: string,
    className?: string,
    color?: string,
    fontFamily?: string,
    fontSize?: string,
    fontWeight?: string,
  ) {
    const textElement = document.createElement("span");

    // default style requirements
    textElement.textContent = text;
    textElement.style.position = "absolute";
    // if default marker center text in upper half of default marker, else center text in the middle of the icon
    defaultMarker === true ? (textElement.style.top = "35%") : (textElement.style.top = "50%");
    textElement.style.left = "50%";
    textElement.style.transform = "translate(-50%, -50%)";

    // customizable properties, defined: https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
    textElement.style.color = typeof color === "undefined" ? "black" : color;
    // handle both "14px" input as well as "14" input
    textElement.style.fontSize =
      typeof fontSize === "undefined" ? "14px" : fontSize.slice(-2) === "px" ? `${fontSize}` : `${fontSize}px`;
    if (typeof className !== "undefined") {
      textElement.className = className;
    }
    if (typeof fontWeight !== "undefined") {
      textElement.style.fontWeight = fontWeight;
    }
    if (typeof fontFamily !== "undefined") {
      textElement.style.fontFamily = fontFamily;
    }
    return textElement;
  }
}

export { MigrationMarker };
