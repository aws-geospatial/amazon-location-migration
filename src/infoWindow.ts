// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Popup, PopupOptions } from "maplibre-gl";
import { LatLngToLngLat } from "./googleCommon";

class MigrationInfoWindow {
  #popup: Popup;

  constructor(options?) {
    const maplibreOptions: PopupOptions = {};

    // maxWidth - set MapLibre 'maxWidth' option
    if ("maxWidth" in options) {
      maplibreOptions.maxWidth = options.maxWidth + "px";
    }

    this.#popup = new Popup(maplibreOptions);

    // content can be string, HTMLElement, or string containing HTML
    if ("content" in options) {
      if (typeof options.content === "string") {
        if (this._containsOnlyHTMLElements(options.content)) {
          this.#popup.setHTML(options.content);
        } else {
          this.#popup.setText(options.content);
        }
      } else if (options.content instanceof HTMLElement) {
        this.#popup.setDOMContent(options.content);
      }
    }

    if ("position" in options) {
      this.setPosition(options.position);
    }

    // TODO:
    // pixelOffset - set 'offset' MapLibre option
    // minWidth - set by HTMLElement.style.minWidth
    // ariaLabel - add to DOM element
  }

  // Google:
  // - both Marker and LatLng popup/infowindow -> set Marker or LatLng in InfoWindow class and then call InfoWindow.open
  // MapLibre:
  // - Marker popup/infowindow -> Marker.setPopup then Marker.togglePopup (to open Popup)
  // - LatLng popup/infowindow -> Popup.setLngLat (in options when creating popup) then Popup.addTo
  open(options?, anchor?) {
    if (anchor || options.anchor) {
      // Marker specific info window
      const marker = anchor !== undefined ? anchor._getMarker() : options.anchor._getMarker();
      marker.setPopup(this.#popup);
      if (!this.#popup.isOpen()) {
        marker.togglePopup();
      }
    } else if (options.map) {
      // LatLng specific info window
      this.#popup.addTo(options.map._getMap());
    }

    // TODO: shouldFocus - focusAfterOpening, use focus method on DOM element
  }

  setPosition(position?) {
    if (position) {
      const lnglat = LatLngToLngLat(position);
      this.#popup.setLngLat(lnglat);
    }
  }

  // Internal method for manually getting the private #marker property
  _getPopup() {
    return this.#popup;
  }

  // Internal method for checking if a string contains valid HTML
  _containsOnlyHTMLElements(str: string): boolean {
    // Regular expression to match complete HTML elements (opening and closing tags with content)
    const htmlElementRegex = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi;

    // Check if the string contains any complete HTML elements
    const hasHTMLElements = str.match(htmlElementRegex) !== null;

    // Check if the string contains any text outside of HTML elements
    const textOutsideElements = str.replace(htmlElementRegex, "").trim();
    return hasHTMLElements && textOutsideElements.length === 0;
  }
}

export { MigrationInfoWindow };
