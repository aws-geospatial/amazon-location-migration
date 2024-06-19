// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GoogleMapEvent,
  GoogleMapMouseEvent,
  GoogleInfoWindowEvent,
  GoogleToMaplibreEvent,
  MigrationEvent,
  MigrationLatLng,
  GoogleMarkerMouseDOMEvent,
  GoogleMarkerMouseEvent,
} from "./googleCommon";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationInfoWindow } from "./infoWindow";

function addListener(instance, eventName, handler) {
  // Map, Marker, InfoWindow, DirectionsRenderer
  if (
    instance instanceof MigrationMap ||
    instance instanceof MigrationMarker ||
    instance instanceof MigrationInfoWindow
  ) {
    return instance.addListener(eventName, handler);
  }
}

function addListenerOnce(instance, eventName, handler) {
  if (instance instanceof MigrationMap) {
    const map = instance._getMap();
    if (GoogleMapMouseEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMapMouseEvent) => {
        const googleMapMouseEvent = {
          domEvent: mapLibreMapMouseEvent.originalEvent,
          latLng: new MigrationLatLng(mapLibreMapMouseEvent.lngLat.lat, mapLibreMapMouseEvent.lngLat.lng),
        };
        handler(googleMapMouseEvent);
      };
      map.once(GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: instance,
        eventName: eventName,
        handler: wrappedHandler,
      };
    } else if (GoogleMapEvent.includes(eventName)) {
      const wrappedHandler = () => {
        handler();
      };
      map.once(GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: instance,
        eventName: eventName,
        handler: wrappedHandler,
      };
    }
  } else if (instance instanceof MigrationMarker) {
    const marker = instance._getMarker();
    if (GoogleMarkerMouseDOMEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMouseEvent) => {
        // needed for 'click' so that map does not also register a click when clicking marker if map has a click event listener
        // needed for 'dblclick' so that map does not auto zoom when marker is double clicked
        if (eventName === MigrationEvent.click || eventName === MigrationEvent.dblclick) {
          mapLibreMouseEvent.stopPropagation();
        }
        const googleMapMouseEvent = {
          domEvent: mapLibreMouseEvent,
          latLng: instance.getPosition(),
        };
        handler(googleMapMouseEvent);
        marker.getElement().removeEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
      };
      marker.getElement().addEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: instance,
        eventName: eventName,
        handler: wrappedHandler,
      };
    } else if (GoogleMarkerMouseEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMouseEvent) => {
        const googleMapMouseEvent = {
          domEvent: mapLibreMouseEvent,
          latLng: instance.getPosition(),
        };
        handler(googleMapMouseEvent);
      };
      marker.once(GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: instance,
        eventName: eventName,
        handler: wrappedHandler,
      };
    }
  } else if (instance instanceof MigrationInfoWindow) {
    const popup = instance._getPopup();
    if (GoogleInfoWindowEvent.includes(eventName)) {
      // if close then use 'on' method on popup instance
      if (eventName === MigrationEvent.close) {
        const wrappedHandler = () => {
          handler();
        };
        popup.once(GoogleToMaplibreEvent[eventName], wrappedHandler);
        return {
          instance: instance,
          eventName: eventName,
          handler: wrappedHandler,
        };
      } else if (eventName === MigrationEvent.closeclick) {
        // if closeclick then use 'addEventListener' method on button element
        const closeButton = popup.getElement().querySelector("button.maplibregl-popup-close-button");
        const wrappedHandler = () => {
          handler();
          closeButton.removeEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
        };
        closeButton.addEventListener(GoogleToMaplibreEvent[eventName], wrappedHandler);
        return {
          instance: instance,
          eventName: eventName,
          handler: wrappedHandler,
        };
      }
    }
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

// TODO:
// - write removeListener method
// - refactor addListener methods for maps, markers, infowindow, directionsRenderer to return object
// - refactor addListenerOnce method to return object
// - test removeListner for maps, markers, infowindow
// - write testcases

// - add to core dynamic import

// - add multi listeners to directionsRenderer
// - add event handling for directions, autocomplete widget,
