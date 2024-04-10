// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Map, MapOptions, NavigationControl } from "maplibre-gl";
import { GoogleLatLng, GoogleToMaplibreControlPosition, LatLngToLngLat } from "./googleCommon";

/*
  This migration map class is a thin wrapper replacement for google.maps.Map, which
  replaces Google's map with a MapLibre map and routes the appropriate APIs

  map = new google.maps.Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
  });
*/
class MigrationMap {
  _map: Map;
  _styleUrl: string; // This will be populated by the top level module that is passed our API key

  constructor(containerElement, options) {
    const maplibreOptions: MapOptions = {
      container: containerElement,
      style: this._styleUrl,
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

    this._map = new Map(maplibreOptions);

    // Add NavigationControl if zoomControl is true or not passed in (Google by default adds zoom control to map),
    // furthermore, you can specify zoomControlOptions without passing in zoomControl as an option
    if (options.zoomControl === undefined || options.zoomControl === true) {
      // checks that 'position' option is set, only translates 8 out of 29 positions that Google offers,
      // we will default to bottom-right for positions that MapLibre does not offer
      if (
        options.zoomControlOptions &&
        options.zoomControlOptions.position &&
        options.zoomControlOptions.position in GoogleToMaplibreControlPosition
      ) {
        this._map.addControl(
          new NavigationControl(),
          GoogleToMaplibreControlPosition[options.zoomControlOptions.position],
        );
      } else {
        this._map.addControl(new NavigationControl(), "bottom-right");
      }
    }
  }

  getCenter() {
    const center = this._map.getCenter();

    return GoogleLatLng(center?.lat, center?.lng);
  }

  getDiv() {
    return this._map.getContainer();
  }

  getHeading() {
    return this._map.getBearing();
  }

  getTilt() {
    return this._map.getPitch();
  }

  getZoom() {
    return this._map.getZoom();
  }

  setCenter(center) {
    const lnglat = LatLngToLngLat(center);
    this._map.setCenter(lnglat);
  }

  fitBounds(bounds) {
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    this._map.fitBounds([
      [northEast.lng(), northEast.lat()],
      [southWest.lng(), southWest.lat()],
    ]);
  }

  setZoom(zoom) {
    this._map.setZoom(zoom);
  }

  // Internal method for migration logic that needs to access the underlying MapLibre map
  _getMap() {
    return this._map;
  }
}

export { MigrationMap };
