// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AddListenerResponse,
  GoogleMapEvent,
  GoogleMapMouseEvent,
  GoogleInfoWindowEvent,
  GoogleToMaplibreEvent,
  MigrationEvent,
  GoogleMarkerMouseDOMEvent,
  GoogleMarkerMouseEvent,
} from "./common";
import { MigrationInfoWindow, MigrationMap, MigrationMarker } from "./maps";
import { MigrationAutocomplete, MigrationSearchBox } from "./places";
import { MigrationDirectionsRenderer } from "./directions";

function addListener(instance, eventName, handler): AddListenerResponse {
  if (
    instance instanceof MigrationMap ||
    instance instanceof MigrationMarker ||
    instance instanceof MigrationInfoWindow ||
    instance instanceof MigrationDirectionsRenderer ||
    instance instanceof MigrationAutocomplete ||
    instance instanceof MigrationSearchBox
  ) {
    return instance.addListener(eventName, handler);
  }
}

function addListenerOnce(instance, eventName, handler): AddListenerResponse {
  if (
    instance instanceof MigrationMap ||
    instance instanceof MigrationMarker ||
    instance instanceof MigrationInfoWindow ||
    instance instanceof MigrationDirectionsRenderer ||
    instance instanceof MigrationAutocomplete ||
    instance instanceof MigrationSearchBox
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
  } else if (listener.instance instanceof MigrationDirectionsRenderer) {
    listener.instance[`_set${listener.listenerType}DirectionsChangedListeners`](
      listener.instance[`_get${listener.listenerType}DirectionsChangedListeners`]().filter((obj) => obj !== listener),
    );
  } else if (listener.instance instanceof MigrationAutocomplete) {
    const geocoder = listener.instance._getMaplibreGeocoder();
    if (listener.eventName == "place_changed") {
      geocoder.getPlacesGeocoder().off("results", listener.resultsHandler);
      geocoder.getPlacesGeocoder().off("result", listener.resultHandler);
    }
  } else if (listener.instance instanceof MigrationSearchBox) {
    const geocoder = listener.instance._getMaplibreGeocoder();
    if (listener.eventName == "places_changed") {
      geocoder.getPlacesGeocoder().off("results", listener.resultsHandler);
      geocoder.getPlacesGeocoder().off("result", listener.resultHandler);
    }
  }
}

export { addListener, addListenerOnce, removeListener };
