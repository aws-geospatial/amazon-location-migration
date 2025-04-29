// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as turf from "@turf/turf";

import { MigrationLatLng } from "./lat_lng";
import { MigrationLatLngBounds } from "./lat_lng_bounds";
import { MigrationMVCObject } from "./mvc_object";
import { MigrationMap } from "../maps";
import { GeoJSONSource } from "maplibre-gl";

export class MigrationCircle extends MigrationMVCObject implements google.maps.Circle {
  center: MigrationLatLng;
  radius: number;
  map: google.maps.Map;
  draggable = false;
  editable = false;
  fillColor = "black";
  fillOpacity = 0.25;
  strokeColor = "black";
  strokeOpacity = 1.0;
  strokeWeight = 3.0;
  visible = true;

  #sourceId: string;
  #fillLayerId: string;
  #lineLayerId: string;

  // Keep a static layer index so we can create unique layer IDs
  // when drawing the circle (if applicable)
  private static layerIndex = 0;

  constructor(
    circleOrCircleOptions?: google.maps.Circle | null | google.maps.CircleLiteral | google.maps.CircleOptions,
  ) {
    super();

    if (circleOrCircleOptions instanceof MigrationCircle) {
      this.setCenter(circleOrCircleOptions.getCenter());
      this.radius = circleOrCircleOptions.getRadius();
    } else if (circleOrCircleOptions) {
      // google.maps.CircleLiteral | google.maps.CircleOptions
      this.setOptions(circleOrCircleOptions as google.maps.CircleOptions);
    }
  }

  getBounds(): google.maps.LatLngBounds | null {
    if (!this.center || !this.radius) {
      return null;
    }

    // Google's radius is stored in meters, but turf.circle expects kilometers
    const radiusInKm = this.radius / 1000;

    const centerArray = [this.center.lng(), this.center.lat()];
    const circle = turf.circle(centerArray, radiusInKm);
    const bbox = turf.bbox(circle);

    return new MigrationLatLngBounds({
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3],
    });
  }

  getCenter(): google.maps.LatLng | null {
    return this.center;
  }

  getDraggable(): boolean {
    return this.draggable;
  }

  getEditable(): boolean {
    return this.editable;
  }

  getMap(): google.maps.Map | null {
    return this.map;
  }

  getRadius(): number {
    return this.radius;
  }

  getVisible(): boolean {
    return this.visible;
  }

  setCenter(center: google.maps.LatLng | null | google.maps.LatLngLiteral): void {
    this.center = new MigrationLatLng(center);

    this.#drawCircle();
  }

  setDraggable(draggable: boolean): void {
    this.draggable = draggable;
  }

  setEditable(editable: boolean): void {
    this.editable = editable;
  }

  setMap(map: google.maps.Map | null): void {
    // If we had a valid map and are now setting to null,
    // remove our source and layers from the previous map
    if (this.map && map == null) {
      const migrationMap = this.map as unknown as MigrationMap;
      const maplibreMap = migrationMap._getMap();

      if (maplibreMap.getLayer(this.#fillLayerId)) {
        maplibreMap.removeLayer(this.#fillLayerId);
      }
      if (maplibreMap.getLayer(this.#lineLayerId)) {
        maplibreMap.removeLayer(this.#lineLayerId);
      }
      if (maplibreMap.getSource(this.#sourceId)) {
        maplibreMap.removeSource(this.#sourceId);
      }

      this.#fillLayerId = "";
      this.#lineLayerId = "";
      this.#sourceId = "";
    }

    this.map = map;

    this.#drawCircle();
  }

  setOptions(options: google.maps.CircleOptions | null): void {
    if (options == null) {
      return;
    }

    if (options?.center != null) {
      this.setCenter(options.center);
    }

    if (options?.draggable != null) {
      this.setDraggable(options.draggable);
    }

    if (options?.editable != null) {
      this.setEditable(options.editable);
    }

    if (options?.fillColor != null) {
      this.fillColor = options.fillColor;
    }

    if (options?.fillOpacity != null) {
      this.fillOpacity = options.fillOpacity;
    }

    if (options?.radius != null) {
      this.setRadius(options.radius);
    }

    if (options?.strokeColor != null) {
      this.strokeColor = options.strokeColor;
    }

    if (options?.strokeOpacity != null) {
      this.strokeOpacity = options.strokeOpacity;
    }

    if (options?.strokeWeight != null) {
      this.strokeWeight = options.strokeWeight;
    }

    if (options?.visible != null) {
      this.setVisible(options.visible);
    }

    // Handle map option last, so if multiple options are set on Circle creation,
    // it will only trigger the draw call once at the end.
    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  setRadius(radius: number): void {
    this.radius = radius;

    this.#drawCircle();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;

    this.#drawCircle();
  }

  #getVisibilityProperty(): "visible" | "none" {
    return this.visible ? "visible" : "none";
  }

  // Handle drawing the circle on the map, if one was specified
  #drawCircle(): void {
    if (!this.map) {
      return;
    }

    // TODO: If we can clean up the listener logic in MigrationMap, then it can implement google.maps.Map
    // and then we won't need to do this intermediate unknown cast
    const migrationMap = this.map as unknown as MigrationMap;
    const maplibreMap = migrationMap._getMap();

    // If we try to add layers before the map's style has loaded, it will throw an error, so
    // if it is still being loaded then queue our circle drawing until the map load event is fired
    if (!maplibreMap.isStyleLoaded()) {
      maplibreMap.on("load", () => {
        this.#drawCircle();
      });

      return;
    }

    // Google's radius is stored in meters, but turf.circle expects kilometers
    const radiusInKm = this.radius / 1000;

    const centerArray = [this.center.lng(), this.center.lat()];
    const circle = turf.circle(centerArray, radiusInKm);

    // If we've already created the source and layers, just update them dynamically
    // instead of re-creating them every time
    const circleSource = maplibreMap.getSource(this.#sourceId) as GeoJSONSource;
    if (circleSource) {
      circleSource.setData(circle);

      maplibreMap.setLayoutProperty(this.#fillLayerId, "visibility", this.#getVisibilityProperty());
      maplibreMap.setLayoutProperty(this.#lineLayerId, "visibility", this.#getVisibilityProperty());

      return;
    }

    // Setup our source and layer ids with a unique suffix
    this.#sourceId = "circle-source-" + MigrationCircle.layerIndex;
    this.#fillLayerId = "circle-fill-" + MigrationCircle.layerIndex;
    this.#lineLayerId = "circle-line-" + MigrationCircle.layerIndex;

    // Add the circle data as a GeoJSON source
    maplibreMap.addSource(this.#sourceId, {
      type: "geojson",
      data: circle,
    });

    // Add the circle fill layer
    maplibreMap.addLayer({
      id: this.#fillLayerId,
      type: "fill",
      source: this.#sourceId,
      layout: {
        visibility: this.#getVisibilityProperty(),
      },
      paint: {
        "fill-color": this.fillColor,
        "fill-opacity": this.fillOpacity,
      },
    });

    // Add the circle line layer
    maplibreMap.addLayer({
      id: this.#lineLayerId,
      type: "line",
      source: this.#sourceId,
      layout: {
        visibility: this.#getVisibilityProperty(),
      },
      paint: {
        "line-color": this.strokeColor,
        "line-opacity": this.strokeOpacity,
        "line-width": this.strokeWeight,
      },
    });

    // Increment our static layer index to keep them unique
    MigrationCircle.layerIndex++;
  }
}
