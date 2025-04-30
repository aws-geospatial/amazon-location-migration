// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker, MarkerOptions } from "maplibre-gl";
import {
  AddListenerResponse,
  GoogleMarkerMouseDOMEvent,
  GoogleMarkerMouseEvent,
  GoogleToMaplibreEvent,
  LatLngToLngLat,
  MigrationEvent,
  MigrationLatLng,
} from "../common";

class MigrationMarker {
  #marker: Marker;

  constructor(options) {
    const maplibreOptions: MarkerOptions = {};

    // Advanced Marker content customizability
    // handles:
    // - HTML-based marker
    // - custom graphic file
    // - inline SVG
    // - does not support any customization that uses PinElement
    if (options.content) {
      if (options.content instanceof HTMLElement || options.content instanceof SVGElement) {
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
    // - svg parameter (Symbol) excluding anchor
    if (options.icon) {
      if (typeof options.icon === "object") {
        if ("url" in options.icon) {
          const imgContainer = document.createElement("div");
          imgContainer.classList.add("non-default-legacy-marker");
          const imgElement = new Image();
          imgElement.src = options.icon.url;
          imgContainer.appendChild(imgElement);
          maplibreOptions.element = imgContainer;
        } else if ("path" in options.icon) {
          const imgContainer = document.createElement("div");
          imgContainer.classList.add("non-default-legacy-marker");

          // Container svg element
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

          // Child element to store the path, which is required a required option
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", options.icon.path);

          // Set optional attributes for the path
          // Default values from https://developers.google.com/maps/documentation/javascript/symbols#properties
          const scale = options.icon.scale || 1.0;
          path.setAttribute("fill", options.icon.fillColor || "black");
          path.setAttribute("fill-opacity", options.icon.fillOpacity || 0.0);
          path.setAttribute("stroke", options.icon.strokeColor || "black");
          path.setAttribute("stroke-width", options.icon.strokeWeight || scale);
          path.setAttribute("stroke-opacity", options.icon.strokeOpacity || 1.0);

          svg.appendChild(path);

          // Collect the rotation and scale options (if specified) into single transform line
          let transform = "";
          if (options.icon.rotation) {
            transform = `rotate(${options.icon.rotation})`;
          }
          if (scale !== 1.0) {
            transform += ` scale(${scale})`;
          }

          // Set the transform attribute, if any overrides were specified
          if (transform) {
            svg.setAttribute("transform", transform);
          }

          imgContainer.appendChild(svg);
          maplibreOptions.element = imgContainer;
          svg.addEventListener("load", () => {
            if (options.icon && typeof options.icon === "object" && "path" in options.icon) {
              const svg = this.#marker._element.querySelector("svg");
              const pathBBox = svg.querySelector("path").getBBox();
              svg.setAttribute("viewBox", `${pathBBox.x} ${pathBBox.y} ${pathBBox.width} ${pathBBox.height}`);
              svg.setAttribute("width", `${pathBBox.width}`);
              svg.setAttribute("height", `${pathBBox.height}`);
            }
          });
        }
      } else if (typeof options.icon === "string") {
        const imgContainer = document.createElement("div");
        imgContainer.classList.add("non-default-legacy-marker");
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
      if (svg && !marker.classList.contains("non-default-legacy-marker")) {
        const firstG = svg.querySelector("g");
        const removedChild = firstG.removeChild(firstG.children[4]);
        removedChild.remove();
      }

      // create label
      const defaultMarker = marker.classList.contains("non-default-legacy-marker") ? false : true;
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

    // unable to test because testing requires a mocked map to be applied to a MigrationMap object
    // and this will run before a MigrationMap object is created
    if ("visible" in options) {
      this.setVisible(options.visible);
    }

    // need to use 'in' because null and undefined are valid inputs
    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  // handles two types of events:
  // handles events that MapLibre markers does not support, adds event listener to marker DOM element instead - click, dblclick, contextmenu
  // handles events that MapLibre markers inherently supports, uses 'on' method - drag, dragstart, dragend
  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (GoogleMarkerMouseDOMEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMouseEvent) => {
        // needed for 'click' so that map does not also register a click when clicking marker if map has a click event listener
        // needed for 'dblclick' so that map does not auto zoom when marker is double clicked
        if (eventName === MigrationEvent.click || eventName === MigrationEvent.dblclick) {
          mapLibreMouseEvent.stopPropagation();
        }
        const googleMapMouseEvent = {
          domEvent: mapLibreMouseEvent,
          latLng: this.getPosition(),
        };
        handler(googleMapMouseEvent);
        if (listenerType == "once") {
          this.#marker.getElement().removeEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
        }
      };
      this.#marker.getElement().addEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: this,
        eventName: eventName,
        handler: wrappedHandler,
      };
    } else if (GoogleMarkerMouseEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMouseEvent) => {
        const googleMapMouseEvent = {
          domEvent: mapLibreMouseEvent,
          latLng: this.getPosition(),
        };
        handler(googleMapMouseEvent);
      };
      this.#marker[listenerType](eventName, wrappedHandler);
      return {
        instance: this,
        eventName: eventName,
        handler: wrappedHandler,
      };
    }
  }

  getDraggable() {
    return this.#marker.isDraggable();
  }

  getIcon() {
    const markerElement = this.#marker.getElement();
    if (markerElement.classList.contains("non-default-legacy-marker")) {
      const svg = markerElement.querySelector("svg");
      if (svg) {
        const symbol = {};
        const path = svg.querySelector("path");
        if (path.hasAttribute("d")) {
          symbol["path"] = path.getAttribute("d");
        }
        if (path.hasAttribute("fill")) {
          symbol["fillColor"] = path.getAttribute("fill");
        }
        if (path.hasAttribute("fill-opacity")) {
          symbol["fillOpacity"] = path.getAttribute("fill-opacity");
        }
        if (path.hasAttribute("stroke")) {
          symbol["strokeColor"] = path.getAttribute("stroke");
        }
        if (path.hasAttribute("stroke-opacity")) {
          symbol["strokeOpacity"] = path.getAttribute("stroke-opacity");
        }
        if (path.hasAttribute("stroke-width")) {
          symbol["strokeWeight"] = path.getAttribute("stroke-width");
        }
        return symbol;
      }
      const img = markerElement.querySelector("img");
      if (img) {
        // cannot differentiate between when to return img url and icon class, will always return url
        return img.src;
      }
    } else {
      return undefined;
    }
  }

  getOpacity() {
    return this.#marker._opacity;
  }

  getPosition() {
    const position = this.#marker.getLngLat();

    return new MigrationLatLng(position?.lat, position?.lng);
  }

  getVisible() {
    return this.#marker.getElement().style.visibility;
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

    if ("visible" in options) {
      this.setVisible(options.visible);
    }
  }

  setMap(map) {
    if (map !== null && map !== undefined) {
      this.#marker.addTo(map._getMap());
    } else {
      this.#marker.remove();
    }
  }

  setVisible(visible) {
    if (visible === false) {
      this.#marker.getElement().style.visibility = "hidden";
    } else if (visible === true) {
      this.#marker.getElement().style.visibility = "visible";
    }
  }

  remove() {
    this.#marker.remove();
  }

  // Internal method for manually getting the private #marker property
  _getMarker() {
    return this.#marker;
  }

  // Internal method for manually setting the private #marker property (used for mocking the marker in unit testing)
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
