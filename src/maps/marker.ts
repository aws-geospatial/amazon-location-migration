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
  #clickable: boolean = true;
  #label: string | google.maps.MarkerLabel | null = null;

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
      const iconElement = this._createIconElement(options.icon);
      if (iconElement.element) {
        maplibreOptions.element = iconElement.element;
      }
      if (iconElement.offset) {
        maplibreOptions.offset = iconElement.offset;
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

  setIcon(icon?: string | google.maps.Icon | null | google.maps.Symbol) {
    const element = this.#marker.getElement();

    if (!icon) {
      // Reset to default marker
      element.classList.remove("non-default-legacy-marker");
      element.innerHTML = "";
      return;
    }

    const iconElement = this._createIconElement(icon);
    if (iconElement.element) {
      // Replace existing element content
      element.classList.add("non-default-legacy-marker");
      element.innerHTML = "";
      // Copy children from iconElement to existing element
      while (iconElement.element.firstChild) {
        element.appendChild(iconElement.element.firstChild);
      }
    }
    if (iconElement.offset) {
      this.#marker.setOffset(iconElement.offset);
    }
  }

  setZIndex(zIndex?: number | null) {
    const element = this.#marker.getElement();
    if (zIndex !== null && zIndex !== undefined) {
      element.style.zIndex = String(zIndex);
    } else {
      element.style.zIndex = "";
    }
  }

  getZIndex(): number | null | undefined {
    const element = this.#marker.getElement();
    const zIndex = element.style.zIndex;
    return zIndex ? parseInt(zIndex, 10) : undefined;
  }

  setTitle(title?: string | null) {
    const element = this.#marker.getElement();
    if (title) {
      element.setAttribute("title", title);
    } else {
      element.removeAttribute("title");
    }
  }

  getTitle(): string | null | undefined {
    const element = this.#marker.getElement();
    return element.getAttribute("title") || undefined;
  }

  setCursor(cursor?: string | null) {
    const element = this.#marker.getElement();
    if (cursor) {
      element.style.cursor = cursor;
    } else {
      element.style.cursor = "";
    }
  }

  getCursor(): string | null | undefined {
    const element = this.#marker.getElement();
    return element.style.cursor || undefined;
  }

  setClickable(clickable: boolean) {
    this.#clickable = clickable;
    const element = this.#marker.getElement();
    element.style.pointerEvents = clickable ? "" : "none";
  }

  getClickable(): boolean {
    return this.#clickable;
  }

  getMap(): google.maps.Map | null {
    // MapLibre's _map property holds the map reference
    return this.#marker._map ? (this.#marker._map as any) : null;
  }

  setLabel(label?: string | google.maps.MarkerLabel | null) {
    this.#label = label || null;
    // Note: This only tracks the label state. Full label rendering would require
    // DOM manipulation similar to what's done in the constructor.
    // For now, we just store the value for getLabel() to return.
  }

  getLabel(): google.maps.MarkerLabel | null | string | undefined {
    return this.#label || undefined;
  }

  setAnimation(animation?: google.maps.Animation | null) {
    console.error("setAnimation is not supported");
  }

  getAnimation(): google.maps.Animation | null | undefined {
    console.error("getAnimation is not supported");
    return undefined;
  }

  setShape(shape?: google.maps.MarkerShape | null) {
    console.error("setShape is not supported");
  }

  getShape(): google.maps.MarkerShape | null | undefined {
    console.error("getShape is not supported");
    return undefined;
  }

  // Internal method for creating icon element from various icon formats
  _createIconElement(icon: string | google.maps.Icon | google.maps.Symbol): {
    element?: HTMLElement;
    offset?: [number, number];
  } {
    if (typeof icon === "string") {
      // Simple string URL
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("non-default-legacy-marker");
      const imgElement = new Image();
      imgElement.src = icon;
      imgContainer.appendChild(imgElement);
      return { element: imgContainer };
    } else if (typeof icon === "object") {
      if ("url" in icon) {
        // Icon with url
        const imgContainer = document.createElement("div");
        imgContainer.classList.add("non-default-legacy-marker");
        const imgElement = new Image();
        imgElement.src = icon.url;

        // Handle scaledSize if provided
        if (icon.scaledSize) {
          imgElement.style.width = `${icon.scaledSize.width}px`;
          imgElement.style.height = `${icon.scaledSize.height}px`;
        }

        imgContainer.appendChild(imgElement);

        // Handle anchor if provided
        // Google's anchor is the point on the icon that should be placed at the marker's position
        // MapLibre centers markers by default (anchor is at center)
        // So we need to calculate offset from center
        let offset: [number, number] | undefined;
        if (icon.anchor && icon.scaledSize) {
          const anchorX = icon.anchor.x || 0;
          const anchorY = icon.anchor.y || 0;
          const centerX = icon.scaledSize.width / 2;
          const centerY = icon.scaledSize.height / 2;
          // Offset from center: if anchor is at center, offset is [0, 0]
          // If anchor is top-left (0, 0), we need offset [-centerX, -centerY] to shift it
          offset = [centerX - anchorX, centerY - anchorY];
        }

        return { element: imgContainer, offset };
      } else if ("path" in icon) {
        // Symbol with path
        const imgContainer = document.createElement("div");
        imgContainer.classList.add("non-default-legacy-marker");

        // Container svg element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        // Child element to store the path, which is required a required option
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", String(icon.path));

        // Set optional attributes for the path
        // Default values from https://developers.google.com/maps/documentation/javascript/symbols#properties
        const scale = icon.scale || 1.0;
        path.setAttribute("fill", icon.fillColor || "black");
        path.setAttribute("fill-opacity", String(icon.fillOpacity ?? 0.0));
        path.setAttribute("stroke", icon.strokeColor || "black");
        path.setAttribute("stroke-width", String(icon.strokeWeight || scale));
        path.setAttribute("stroke-opacity", String(icon.strokeOpacity ?? 1.0));

        svg.appendChild(path);

        // Collect the rotation and scale options (if specified) into single transform line
        let transform = "";
        if (icon.rotation) {
          transform = `rotate(${icon.rotation})`;
        }
        if (scale !== 1.0) {
          transform += ` scale(${scale})`;
        }

        // Set the transform attribute, if any overrides were specified
        if (transform) {
          svg.setAttribute("transform", transform);
        }

        imgContainer.appendChild(svg);

        // Handle SVG viewBox after load
        svg.addEventListener("load", () => {
          const svgElement = imgContainer.querySelector("svg");
          if (svgElement) {
            const pathElement = svgElement.querySelector("path");
            if (pathElement) {
              const pathBBox = pathElement.getBBox();
              svgElement.setAttribute("viewBox", `${pathBBox.x} ${pathBBox.y} ${pathBBox.width} ${pathBBox.height}`);
              svgElement.setAttribute("width", `${pathBBox.width}`);
              svgElement.setAttribute("height", `${pathBBox.height}`);
            }
          }
        });

        return { element: imgContainer };
      }
    }

    return {};
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
    textElement.style.top = defaultMarker ? "35%" : "50%";
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
