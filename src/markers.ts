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

    // Legacy Marker content customizability
    if (options.icon || options.label) {
      // container for icon and label
      const imgContainer = document.createElement("div");

      // if icon specified, then add it to container
      // handles:
      // - url parameter
      // - simple icon interface parameter (no customizability),
      // - does not handle svg parameter
      if (options.icon) {
        const imgElement = new Image();
        imgElement.src =
          typeof options.icon === "object"
            ? options.icon.url
            : typeof options.icon === "string"
            ? options.icon
            : options.label // if label is specified, then create default marker without inner circle
            ? this._createDefaultMarker(true)
            : this._createDefaultMarker();
        imgContainer.appendChild(imgElement);
      } else {
        // if icon not specified, then add default marker to container
        const defaultMarker = options.label ? this._createDefaultMarker(true) : this._createDefaultMarker();
        imgContainer.appendChild(defaultMarker);
      }

      // if label specified, then add it to container
      if (options.label) {
        imgContainer.appendChild(
          typeof options.label === "object"
            ? this._createLabel(
                options.icon,
                options.label.text,
                options.label.className,
                options.label.color,
                options.label.fontFamily,
                options.label.fontSize,
                options.label.fontWeight,
              )
            : typeof options.label === "string"
            ? this._createLabel(options.icon, options.label)
            : undefined,
        );
      }
      maplibreOptions.element = imgContainer;
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

  // Code copied from MapLibre: https://github.com/maplibre/maplibre-gl-js/blob/0502606ae5eb5cc0df5bac242ef2a4104bd425d1/src/ui/marker.ts#L171
  // Needed because we do not want the inner circle if the 'label' MarkerOption is specified and we cannot change MapLibre's default marker
  // as it is a private property of the Marker class. Cannot unit test due to being a DOM based function, our current unit test infrastructure
  // does not support testing these kinds of functions.
  _createDefaultMarker(removeInnerCircle?: boolean) {
    // create default map marker SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defaultHeight = 41;
    const defaultWidth = 27;
    svg.setAttributeNS(null, "display", "block");
    svg.setAttributeNS(null, "height", `${defaultHeight}px`);
    svg.setAttributeNS(null, "width", `${defaultWidth}px`);
    svg.setAttributeNS(null, "viewBox", `0 0 ${defaultWidth} ${defaultHeight}`);

    const markerLarge = document.createElementNS("http://www.w3.org/2000/svg", "g");
    markerLarge.setAttributeNS(null, "stroke", "none");
    markerLarge.setAttributeNS(null, "stroke-width", "1");
    markerLarge.setAttributeNS(null, "fill", "none");
    markerLarge.setAttributeNS(null, "fill-rule", "evenodd");

    const page1 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    page1.setAttributeNS(null, "fill-rule", "nonzero");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "g");
    shadow.setAttributeNS(null, "transform", "translate(3.0, 29.0)");
    shadow.setAttributeNS(null, "fill", "#000000");

    const ellipses = [
      { rx: "10.5", ry: "5.25002273" },
      { rx: "10.5", ry: "5.25002273" },
      { rx: "9.5", ry: "4.77275007" },
      { rx: "8.5", ry: "4.29549936" },
      { rx: "7.5", ry: "3.81822308" },
      { rx: "6.5", ry: "3.34094679" },
      { rx: "5.5", ry: "2.86367051" },
      { rx: "4.5", ry: "2.38636864" },
    ];

    for (const data of ellipses) {
      const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      ellipse.setAttributeNS(null, "opacity", "0.04");
      ellipse.setAttributeNS(null, "cx", "10.5");
      ellipse.setAttributeNS(null, "cy", "5.80029008");
      ellipse.setAttributeNS(null, "rx", data["rx"]);
      ellipse.setAttributeNS(null, "ry", data["ry"]);
      shadow.appendChild(ellipse);
    }

    const background = document.createElementNS("http://www.w3.org/2000/svg", "g");
    background.setAttributeNS(null, "fill", "#3FB1CE");

    const bgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bgPath.setAttributeNS(
      null,
      "d",
      "M27,13.5 C27,19.074644 20.250001,27.000002 14.75,34.500002 C14.016665,35.500004 12.983335,35.500004 12.25,34.500002 C6.7499993,27.000002 0,19.222562 0,13.5 C0,6.0441559 6.0441559,0 13.5,0 C20.955844,0 27,6.0441559 27,13.5 Z",
    );

    background.appendChild(bgPath);

    const border = document.createElementNS("http://www.w3.org/2000/svg", "g");
    border.setAttributeNS(null, "opacity", "0.25");
    border.setAttributeNS(null, "fill", "#000000");

    const borderPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    borderPath.setAttributeNS(
      null,
      "d",
      "M13.5,0 C6.0441559,0 0,6.0441559 0,13.5 C0,19.222562 6.7499993,27 12.25,34.5 C13,35.522727 14.016664,35.500004 14.75,34.5 C20.250001,27 27,19.074644 27,13.5 C27,6.0441559 20.955844,0 13.5,0 Z M13.5,1 C20.415404,1 26,6.584596 26,13.5 C26,15.898657 24.495584,19.181431 22.220703,22.738281 C19.945823,26.295132 16.705119,30.142167 13.943359,33.908203 C13.743445,34.180814 13.612715,34.322738 13.5,34.441406 C13.387285,34.322738 13.256555,34.180814 13.056641,33.908203 C10.284481,30.127985 7.4148684,26.314159 5.015625,22.773438 C2.6163816,19.232715 1,15.953538 1,13.5 C1,6.584596 6.584596,1 13.5,1 Z",
    );

    border.appendChild(borderPath);

    const maki = document.createElementNS("http://www.w3.org/2000/svg", "g");
    maki.setAttributeNS(null, "transform", "translate(6.0, 7.0)");
    maki.setAttributeNS(null, "fill", "#FFFFFF");

    if (removeInnerCircle === true) {
      page1.appendChild(shadow);
      page1.appendChild(background);
      page1.appendChild(border);
      page1.appendChild(maki);
    } else {
      const circleContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      circleContainer.setAttributeNS(null, "transform", "translate(8.0, 8.0)");

      const circle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle1.setAttributeNS(null, "fill", "#000000");
      circle1.setAttributeNS(null, "opacity", "0.25");
      circle1.setAttributeNS(null, "cx", "5.5");
      circle1.setAttributeNS(null, "cy", "5.5");
      circle1.setAttributeNS(null, "r", "5.4999962");

      const circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle2.setAttributeNS(null, "fill", "#FFFFFF");
      circle2.setAttributeNS(null, "cx", "5.5");
      circle2.setAttributeNS(null, "cy", "5.5");
      circle2.setAttributeNS(null, "r", "5.4999962");

      circleContainer.appendChild(circle1);
      circleContainer.appendChild(circle2);

      page1.appendChild(shadow);
      page1.appendChild(background);
      page1.appendChild(border);
      page1.appendChild(maki);
      page1.appendChild(circleContainer);
    }

    svg.appendChild(page1);

    svg.setAttributeNS(null, "height", `${defaultHeight}px`);
    svg.setAttributeNS(null, "width", `${defaultWidth}px`);
    return svg;
  }

  _createLabel(
    icon,
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
    // if custom icon is used, center text in the middle of the icon, else center text in upper half of default marker
    typeof icon === "undefined" ? (textElement.style.top = "35%") : (textElement.style.top = "50%");
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
