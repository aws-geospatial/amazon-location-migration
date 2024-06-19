// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GoogleMapEvent,
  GoogleMapMouseEvent,
  GoogleInfoWindowEvent,
  GoogleToMaplibreEvent,
  MigrationEvent,
  GoogleMarkerMouseDOMEvent,
  GoogleMarkerMouseEvent,
} from "./googleCommon";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationInfoWindow } from "./infoWindow";

function addListener(instance, eventName, handler) {
  if (
    instance instanceof MigrationMap ||
    instance instanceof MigrationMarker ||
    instance instanceof MigrationInfoWindow
  ) {
    return instance.addListener(eventName, handler);
  }
}

function addListenerOnce(instance, eventName, handler) {
  if (
    instance instanceof MigrationMap ||
    instance instanceof MigrationMarker ||
    instance instanceof MigrationInfoWindow
  ) {
    return instance.addListener(eventName, handler, "once");
  }
}

function removeListener(listener) {
  if (listener.instance instanceof MigrationMap) {
    const map = listener.instance._getMap();
    if (GoogleMapMouseEvent.includes(listener.eventName)) {
      map.off(GoogleToMaplibreEvent[listener.eventName], listener.handler);
    } else if (GoogleMapEvent.includes(listener.eventName)) {
      map.off(GoogleToMaplibreEvent[listener.eventName], listener.handler);
    }
  } else if (listener.instance instanceof MigrationMarker) {
    const marker = listener.instance._getMarker();
    if (GoogleMarkerMouseDOMEvent.includes(listener.eventName)) {
      marker.getElement().removeEventListener(GoogleToMaplibreEvent[listener.eventName], listener.handler);
    } else if (GoogleMarkerMouseEvent.includes(listener.eventName)) {
      marker.off(GoogleToMaplibreEvent[listener.eventName], listener.handler);
    }
  } else if (listener.instance instanceof MigrationInfoWindow) {
    const popup = listener.instance._getPopup();
    if (GoogleInfoWindowEvent.includes(listener.eventName)) {
      if (listener.eventName === MigrationEvent.close) {
        popup.off(GoogleToMaplibreEvent[listener.eventName], listener.handler);
      } else if (listener.eventName === MigrationEvent.closeclick) {
        const closeButton = popup.getElement().querySelector("button.maplibregl-popup-close-button");
        closeButton.removeEventListener(GoogleToMaplibreEvent[listener.eventName], listener.handler);
      }
    }
  }
}

export { addListener, addListenerOnce, removeListener };
