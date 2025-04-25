// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Popup, PopupOptions } from "maplibre-gl";
import {
  AddListenerResponse,
  GoogleInfoWindowEvent,
  GoogleToMaplibreEvent,
  LatLngToLngLat,
  MigrationEvent,
  MigrationLatLng,
} from "./common";
import { addListenerOnce } from "./events";

const focusQuerySelector = [
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]:not([contenteditable='false'])",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(", ");

class MigrationInfoWindow {
  #popup: Popup;
  #minWidth: number;
  #maxWidth: number;
  #ariaLabel: string;

  constructor(options?) {
    const maplibreOptions: PopupOptions = {};

    // maxWidth - set MapLibre 'maxWidth' option
    if ("maxWidth" in options) {
      maplibreOptions.maxWidth = options.maxWidth + "px";
      this.#maxWidth = options.maxWidth;
    }

    // needed so that popup won't close when map is clicked to match Google (default is true)
    maplibreOptions.closeOnClick = false;

    this.#popup = new Popup(maplibreOptions);

    // content can be string, HTMLElement, or string containing HTML
    if ("content" in options) {
      this.setContent(options.content);
    }

    if ("position" in options) {
      this.setPosition(options.position);
    }

    // cannot set minWidth on popup if popup is not open (on the DOM tree), have to store in local variable
    if ("minWidth" in options) {
      this.#minWidth = options.minWidth;
    }

    // cannot set minWidth on popup if popup is not open (on the DOM tree), have to store in local variable
    if ("ariaLabel" in options) {
      this.#ariaLabel = options.ariaLabel;
    }
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (GoogleInfoWindowEvent.includes(eventName)) {
      // if close then use 'on' method on popup instance
      if (eventName === MigrationEvent.close) {
        this.#popup[listenerType](GoogleToMaplibreEvent[eventName], handler);
        return {
          instance: this,
          eventName: eventName,
          handler: handler,
        };
      } else if (eventName === MigrationEvent.closeclick) {
        // if closeclick then use 'addEventListener' method on button element
        const closeButton = this.#popup.getElement().querySelector("button.maplibregl-popup-close-button");
        const wrappedHandler = () => {
          handler();
          if (listenerType == "once") {
            closeButton.removeEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
          }
        };
        closeButton.addEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
        return {
          instance: this,
          eventName: eventName,
          handler: wrappedHandler,
        };
      }
    }
  }

  close() {
    this.#popup.remove();
  }

  focus() {
    const container = this.#popup.getElement();
    // popup/infowindow not yet rendered
    if (container === undefined) {
      console.error("InfoWindow is not visible");
      return;
    }
    const firstFocusable = container.querySelector(focusQuerySelector) as HTMLElement;
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  getContent() {
    return this.#popup._content;
  }

  getPosition() {
    const position = this.#popup.getLngLat();

    return new MigrationLatLng(position?.lat, position?.lng);
  }

  // Google:
  // - both Marker and LatLng popup/infowindow -> set Marker or LatLng in InfoWindow class and then call InfoWindow.open
  // MapLibre:
  // - Marker popup/infowindow -> Marker.setPopup then Marker.togglePopup (to open Popup)
  // - LatLng popup/infowindow -> Popup.setLngLat (in options when creating popup) then Popup.addTo
  open(options?, anchor?) {
    // close popup if it is already open (to match Google)
    this.close();

    if (options && "shouldFocus" in options) {
      this.#popup.options.focusAfterOpen = options.shouldFocus;
    }

    if (anchor || options.anchor) {
      // Marker specific info window
      const marker = anchor !== undefined ? anchor._getMarker() : options.anchor._getMarker();
      marker.setPopup(this.#popup);
      if (!this.#popup.isOpen()) {
        marker.togglePopup();
      }
      // Needed so that popup is not associated with marker when popup is closed
      // (otherwise Maplibre default behavior will allow users to click the marker and open the popup again
      // which does not match Google's behavior)
      addListenerOnce(this, "close", () => {
        marker.setPopup(null);
      });
      addListenerOnce(this, "closeclick", () => {
        marker.setPopup(null);
      });
    } else if (options.map) {
      // LatLng specific info window
      this.#popup.addTo(options.map._getMap());
    }

    // set style property to local variable once popup is opened
    if (this.#minWidth !== undefined) {
      this.#popup.getElement().style.minWidth = this.#minWidth + "px";
    }

    // use setMaxWidth MapLibre method if maxWidth is set in setOptions Google method
    if (this.#maxWidth !== undefined) {
      this.#popup.setMaxWidth(this.#maxWidth + "px");
    }

    // set ariaLabel property to local variable once popup is opened
    if (this.#ariaLabel !== undefined) {
      this.#popup.getElement().ariaLabel = this.#ariaLabel;
    }
  }

  setContent(content?) {
    if (typeof content === "string") {
      if (this._containsHTMLElements(content)) {
        this.#popup.setHTML(content);
      } else {
        this.#popup.setText(content);
      }
    } else if (content instanceof HTMLElement) {
      this.#popup.setDOMContent(content);
    }
  }

  setOptions(options?) {
    // have to close and reopen infowindowto register new minWidth
    if ("minWidth" in options) {
      this.#minWidth = options.minWidth;
    }

    // have to close and reopen infowindow to register new maxWidth
    if ("maxWidth" in options) {
      this.#maxWidth = options.maxWidth;
    }

    // applies new ariaLabel immediately
    if ("ariaLabel" in options) {
      this.#popup.getElement().ariaLabel = options.ariaLabel;
      this.#ariaLabel = options.ariaLabel;
    }

    // applies new content immediately
    if ("content" in options) {
      this.setContent(options.content);
    }

    // applies new position immediately
    if ("position" in options) {
      this.setPosition(options.position);
    }
  }

  setPosition(position?) {
    if (position) {
      const lnglat = LatLngToLngLat(position);
      this.#popup.setLngLat(lnglat);
    }
  }

  // Internal method for manually getting the private #popup property
  _getPopup() {
    return this.#popup;
  }

  // Internal method for manually getting the private #minWidth property
  _getMinWidth() {
    return this.#minWidth;
  }

  // Internal method for manually getting the private #maxWidth property
  _getMaxWidth() {
    return this.#maxWidth;
  }

  // Internal method for manually getting the private #ariaLabel property
  _getAriaLabel() {
    return this.#ariaLabel;
  }

  // Internal method for manually setting the private #popup property (used for mocking the marker in unit testing)
  _setPopup(popup) {
    this.#popup = popup;
  }

  // Internal method for manually setting the private #maxWidth property
  _setMaxWidth(maxWidth) {
    this.#maxWidth = maxWidth;
  }

  // Internal method for checking if a string contains valid HTML
  _containsHTMLElements(str: string): boolean {
    // Regular expression to match complete HTML elements (opening and closing tags with content)
    const htmlElementRegex = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/gi;

    // Check if the string contains any complete HTML elements
    const hasHTMLElements = str.match(htmlElementRegex) !== null;

    return hasHTMLElements;
  }
}

export { MigrationInfoWindow };
