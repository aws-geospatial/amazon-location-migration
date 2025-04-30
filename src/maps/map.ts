// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CameraOptions, IControl, Map, MapOptions, NavigationControl } from "maplibre-gl";
import {
  AddListenerResponse,
  ColorScheme,
  GoogleMapEvent,
  GoogleMapMouseEvent,
  GoogleToMaplibreControlPosition,
  GoogleToMaplibreEvent,
  LatLngToLngLat,
  MapTypeId,
  MigrationLatLng,
  MigrationLatLngBounds,
} from "../common";
import { PACKAGE_VERSION } from "../version";

const systemIsDarkMode = () => {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/*
  This migration map class is a thin wrapper replacement for google.maps.Map, which
  replaces Google's map with a MapLibre map and routes the appropriate APIs

  map = new google.maps.Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
  });
*/
class MigrationMap {
  #map: Map;
  #navigationControl: IControl;
  #colorScheme = "Light";
  #mapTypeId: MapTypeId = MapTypeId.ROADMAP;
  #styleUrl: string;

  // These will be populated by the top level module that is passed our region and API key
  _apiKey: string;
  _region: string;

  constructor(containerElement, options: google.maps.MapOptions) {
    // Check for color scheme first, since it's used with the mapTypeId to construct the styleUrl
    this.#setColorScheme(options.colorScheme);
    this.setMapTypeId(options.mapTypeId);

    const maplibreOptions: MapOptions = {
      container: containerElement,
      style: this.#styleUrl,
      validateStyle: false, // Disable style validation for faster map load
    };

    if (options.center) {
      const lnglat = LatLngToLngLat(options.center);
      if (lnglat) {
        maplibreOptions.center = lnglat;
      } else {
        console.error("Unrecognized center option", options.center);
      }
    }

    // MapLibre offers 0-24 zoom (handles out of bounds), Google can potentially go higher based on location
    // see more: https://developers.google.com/maps/documentation/javascript/maxzoom
    if (options.zoom) {
      maplibreOptions.zoom = options.zoom;
    }

    if (options.maxZoom) {
      maplibreOptions.maxZoom = options.maxZoom;
    }

    if (options.minZoom) {
      maplibreOptions.minZoom = options.minZoom;
    }

    if (options.heading) {
      maplibreOptions.bearing = options.heading;
    }

    if (options.tilt) {
      maplibreOptions.pitch = options.tilt;
    }

    // Add our custom user agent header with our package version
    maplibreOptions.transformRequest = (url: string) => {
      return {
        url: url,
        headers: {
          "X-Amz-User-Agent": `${navigator.userAgent} migration-sdk-${PACKAGE_VERSION}`,
        },
      };
    };

    this.#map = new Map(maplibreOptions);

    // Add NavigationControl if zoomControl is true or not passed in (Google by default adds zoom control to map),
    // furthermore, you can specify zoomControlOptions without passing in zoomControl as an option
    if (options.zoomControl === undefined || options.zoomControl === true) {
      this.#addNavigationControl(options.zoomControlOptions);
    }
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (GoogleMapMouseEvent.includes(eventName)) {
      const wrappedHandler = (mapLibreMapMouseEvent) => {
        const googleMapMouseEvent = {
          domEvent: mapLibreMapMouseEvent.originalEvent,
          latLng: new MigrationLatLng(mapLibreMapMouseEvent.lngLat.lat, mapLibreMapMouseEvent.lngLat.lng),
        };
        handler(googleMapMouseEvent);
      };
      this.#map[listenerType](GoogleToMaplibreEvent[eventName], wrappedHandler);
      return {
        instance: this,
        eventName: eventName,
        handler: wrappedHandler,
      };
    } else if (GoogleMapEvent.includes(eventName)) {
      this.#map[listenerType](GoogleToMaplibreEvent[eventName], handler);
      return {
        instance: this,
        eventName: eventName,
        handler: handler,
      };
    }
  }

  getBounds() {
    const bounds = this.#map.getBounds();

    return new MigrationLatLngBounds({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }

  getCenter() {
    const center = this.#map.getCenter();

    return new MigrationLatLng(center?.lat, center?.lng);
  }

  getDiv() {
    return this.#map.getContainer();
  }

  getHeading() {
    return this.#map.getBearing();
  }

  getMapTypeId() {
    return this.#mapTypeId;
  }

  getTilt() {
    return this.#map.getPitch();
  }

  getZoom() {
    return this.#map.getZoom();
  }

  moveCamera(cameraOptions) {
    const maplibreCameraOptions: CameraOptions = {};

    if (cameraOptions.center) {
      const lnglat = LatLngToLngLat(cameraOptions.center);
      if (lnglat) {
        maplibreCameraOptions.center = lnglat;
      } else {
        console.error("Unrecognized center option", cameraOptions.center);
      }
    }

    if (cameraOptions.heading) {
      maplibreCameraOptions.bearing = cameraOptions.heading;
    }

    if (cameraOptions.tilt) {
      maplibreCameraOptions.pitch = cameraOptions.tilt;
    }

    if (cameraOptions.zoom) {
      maplibreCameraOptions.zoom = cameraOptions.zoom;
    }

    this.#map.jumpTo(maplibreCameraOptions);
  }

  panBy(x, y) {
    this.#map.panBy([x, y]);
  }

  panTo(latLng) {
    const lnglat = LatLngToLngLat(latLng);
    this.#map.panTo(lnglat);
  }

  setCenter(center) {
    const lnglat = LatLngToLngLat(center);
    this.#map.setCenter(lnglat);
  }

  setHeading(heading) {
    this.#map.setBearing(heading);
  }

  #setColorScheme(colorScheme) {
    const googleColorScheme = colorScheme || ColorScheme.LIGHT;

    switch (googleColorScheme) {
      case ColorScheme.LIGHT:
        this.#colorScheme = "Light";
        break;

      case ColorScheme.DARK:
        this.#colorScheme = "Dark";
        break;

      case ColorScheme.FOLLOW_SYSTEM:
        this.#colorScheme = systemIsDarkMode() ? "Dark" : "Light";
        break;
    }
  }

  // not implemented by Google Maps, used as private helper method when setting maxZoom in setOptions
  #setMaxZoom(zoom) {
    this.#map.setMaxZoom(zoom);
  }

  // not implemented by Google Maps, used as private helper method when setting minZoom in setOptions
  #setMinZoom(zoom) {
    this.#map.setMinZoom(zoom);
  }

  setMapTypeId(mapTypeId) {
    // Use ROADMAP type by default
    this.#mapTypeId = mapTypeId || MapTypeId.ROADMAP;

    let styleName;
    switch (this.#mapTypeId) {
      case MapTypeId.HYBRID:
        styleName = "Hybrid";
        break;

      case MapTypeId.ROADMAP:
        styleName = "Standard";
        break;

      case MapTypeId.SATELLITE:
        styleName = "Satellite";
        break;

      case MapTypeId.TERRAIN:
        console.error("Terrain mapTypeId not supported");
        return;
    }

    // Construct our style URL
    const styleUrl = new URL(
      `https://maps.geo.${this._region}.amazonaws.com/v2/styles/${styleName}/descriptor?key=${this._apiKey}`,
    );

    // For Roadmap (Standard) type, we need to append the desired color-scheme as a query param
    // If we appended this for other types, we would get a 4xx error
    if (this.#mapTypeId == MapTypeId.ROADMAP) {
      const params = new URLSearchParams(styleUrl.search);
      params.set("color-scheme", this.#colorScheme);
      styleUrl.search = params.toString();
    }

    this.#styleUrl = styleUrl.toString();

    // On MigrationMap initial construction, #map isn't set yet, so we don't need to reset the style since
    // it will be passed to the MapLibre Map at the end of MigrationMap constructor
    if (this.#map) {
      this.#map.setStyle(this.#styleUrl);
    }
  }

  setOptions(options) {
    if (options.center) {
      const lnglat = LatLngToLngLat(options.center);
      if (lnglat) {
        this.#map.setCenter(lnglat);
      } else {
        console.error("Unrecognized center option", options.center);
      }
    }

    if (options.zoom) {
      this.setZoom(options.zoom);
    }

    // NOTE: colorScheme is intentionally not parsed in setOptions because Google only
    // reads on initial Map construction
    if (options.mapTypeId) {
      this.setMapTypeId(options.mapTypeId);
    }

    if (options.maxZoom) {
      this.#setMaxZoom(options.maxZoom);
    }

    if (options.minZoom) {
      this.#setMinZoom(options.minZoom);
    }

    if (options.heading) {
      this.setHeading(options.heading);
    }

    if (options.tilt) {
      this.setTilt(options.tilt);
    }

    if (options.zoomControl === undefined) {
      // if zoomControl not sent in, check if navControl exists:  navControl exists means map created with zoomControl option
      // set to true or default, navControl not exists means map created without zoomControl option so don't create new navControl
      if (this.#navigationControl !== undefined && options.zoomControlOptions && options.zoomControlOptions.position) {
        this.#addNavigationControl(options.zoomControlOptions);
      }
    } else if (options.zoomControl === true) {
      this.#addNavigationControl(options.zoomControlOptions);
    } else if (options.zoomControl === false) {
      this.#map.removeControl(this.#navigationControl);
    }
  }

  setTilt(tilt) {
    this.#map.setPitch(tilt);
  }

  setZoom(zoom) {
    this.#map.setZoom(zoom);
  }

  fitBounds(bounds, padding?) {
    // This will handle both LatLngBounds | LatLngBoundsLiteral input for us
    const latLngBounds = new MigrationLatLngBounds(bounds);

    if (padding !== undefined) {
      if (typeof padding === "number") {
        this.#map.fitBounds(latLngBounds._getBounds(), { padding: padding });
      } else if (typeof padding === "object") {
        this.#map.fitBounds(latLngBounds._getBounds(), {
          padding: {
            top: padding.top && typeof padding.top === "number" ? padding.top : 0,
            bottom: padding.bottom && typeof padding.bottom === "number" ? padding.bottom : 0,
            left: padding.left && typeof padding.left === "number" ? padding.left : 0,
            right: padding.right && typeof padding.right === "number" ? padding.right : 0,
          },
        });
      } else {
        // google does not error out on invalid padding parameter
        this.#map.fitBounds(latLngBounds._getBounds());
      }
    } else {
      this.#map.fitBounds(latLngBounds._getBounds());
    }
  }

  // helper method for adding a NavigationControl to the map, checks that 'position' option is set,
  // only translates 8 out of 29 positions that Google offers, we will default to bottom-right for
  // positions that MapLibre does not offer
  #addNavigationControl(zoomControlOptions) {
    // remove old navControl so we don't have multiple
    if (this.#navigationControl) {
      this.#map.removeControl(this.#navigationControl);
    }
    // add new navControl
    if (
      zoomControlOptions &&
      zoomControlOptions.position &&
      zoomControlOptions.position in GoogleToMaplibreControlPosition
    ) {
      this.#navigationControl = new NavigationControl();
      this.#map.addControl(this.#navigationControl, GoogleToMaplibreControlPosition[zoomControlOptions.position]);
    } else {
      this.#navigationControl = new NavigationControl();
      this.#map.addControl(this.#navigationControl, "bottom-right");
    }
  }

  // Internal method for migration logic that needs to access the underlying MapLibre map
  _getMap() {
    return this.#map;
  }

  // Internal method for manually setting the private #map property (used for mocking the map in unit testing)
  _setMap(map) {
    this.#map = map;
  }
}

export { MigrationMap };
