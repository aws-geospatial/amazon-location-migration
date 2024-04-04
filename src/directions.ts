// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";

class MigrationDirectionsRenderer {
  _markers: MigrationMarker[];
  _map: MigrationMap;

  constructor() {
    this._markers = [];
  }

  setMap(map) {
    this._map = map;
  }

  setDirections(directions) {
    // TODO: Currently only support one route for directions
    if (directions.routes.length !== 1) {
      return;
    }

    const maplibreMap = this._map._getMap();

    // First, remove any pre-existing drawn route and its markers
    if (this._markers.length) {
      maplibreMap.removeLayer("route");
      maplibreMap.removeSource("route");

      this._markers.forEach(function (marker) {
        marker.remove();
      });
      this._markers = [];
    }

    const route = directions.routes[0];

    // Adjust the map to fit to the bounds for this route
    this._map.fitBounds(route.bounds);

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[0];

      // leg.geometry is a new field we've added, because Google doesn't provide the polyline
      // for the leg as a whole, only for the individual steps, but our API (currently) only provides
      // a polyline for the entire leg.
      const geometry = leg.geometry;

      // TODO: Detect geometry type instead of just doing LineString
      maplibreMap.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: geometry.LineString,
          },
        },
      });
      maplibreMap.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#73B9FF",
          "line-width": 8,
          "line-opacity": 0.5,
        },
      });

      // Add markers for the start/end locations
      const startLocation = leg.start_location;
      const endLocation = leg.end_location;
      const startMarker = new MigrationMarker({
        position: startLocation,
        map: this._map,
      });
      this._markers.push(startMarker);

      const endMarker = new MigrationMarker({
        position: endLocation,
        map: this._map,
      });
      this._markers.push(endMarker);
    }
  }
}

export { MigrationDirectionsRenderer };
