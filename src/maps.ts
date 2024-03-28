// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Map, MapOptions, NavigationControl } from "maplibre-gl";
import { GoogleLatLng } from "./googleCommon";

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
  _styleUrl: string; // This will be populated by the top level module is passed our API key

  constructor(containerElement, options) {
    const maplibreOptions: MapOptions = {
      container: containerElement,
      style: this._styleUrl,
    };

    if (options.center) {
      maplibreOptions.center = [options.center.lng, options.center.lat];
    }
    if (options.zoom) {
      maplibreOptions.zoom = options.zoom;
    }

    this._map = new Map(maplibreOptions);

    if (options.zoomControl === undefined || options.zoomControl) {
      this._map.addControl(new NavigationControl(), "bottom-right");
    }
  }

  getCenter() {
    const center = this._map.getCenter();

    //return new google.maps.LatLng(center.lat, center.lng);
    return GoogleLatLng(center.lat, center.lng);
  }
  setCenter(center) {
    this._map.setCenter([center.lng(), center.lat()]);
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
