// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationLatLng } from "../common/lat_lng";
import { MigrationMVCObject } from "../common/mvc_object";
import { MigrationMap } from "./map";
import { GeoJSONSource } from "maplibre-gl";

export class MigrationPolyline extends MigrationMVCObject implements google.maps.Polyline {
  path: google.maps.LatLng[] = [];
  map: google.maps.Map | null = null;
  draggable = false;
  editable = false;
  geodesic = false;
  strokeColor = "black";
  strokeOpacity = 1.0;
  strokeWeight = 3.0;
  visible = true;
  clickable = true;
  zIndex = 0;

  #sourceId: string = "";
  #layerId: string = "";
  #loadHandlerRegistered: boolean = false;
  #skipStyleCheck: boolean = false;

  // Keep a static layer index so we can create unique layer IDs
  private static layerIndex = 0;

  constructor(opts?: google.maps.PolylineOptions | null) {
    super();

    if (opts) {
      this.setOptions(opts);
    }
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

  getPath(): google.maps.MVCArray<google.maps.LatLng> {
    // Return the path array with MVCArray-like behavior
    // Cast to unknown first to avoid type overlap issues
    const path = this.path;
    const mvcArray = {
      ...path,
      clear: () => {
        path.length = 0;
        this.#drawPolyline();
      },
      getArray: () => path,
      getAt: (i: number) => path[i],
      getLength: () => path.length,
      insertAt: (i: number, elem: google.maps.LatLng) => {
        path.splice(i, 0, elem);
        this.#drawPolyline();
      },
      pop: () => {
        const result = path.pop();
        this.#drawPolyline();
        return result;
      },
      push: (elem: google.maps.LatLng) => {
        const result = path.push(elem);
        this.#drawPolyline();
        return result;
      },
      removeAt: (i: number) => {
        const result = path.splice(i, 1)[0];
        this.#drawPolyline();
        return result;
      },
      setAt: (i: number, elem: google.maps.LatLng) => {
        path[i] = elem;
        this.#drawPolyline();
      },
    };
    return mvcArray as unknown as google.maps.MVCArray<google.maps.LatLng>;
  }

  getVisible(): boolean {
    return this.visible;
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

      if (maplibreMap.getLayer(this.#layerId)) {
        maplibreMap.removeLayer(this.#layerId);
      }
      if (maplibreMap.getSource(this.#sourceId)) {
        maplibreMap.removeSource(this.#sourceId);
      }

      this.#layerId = "";
      this.#sourceId = "";
    }

    this.map = map;

    this.#drawPolyline();
  }

  setOptions(options: google.maps.PolylineOptions | null): void {
    if (options == null) {
      return;
    }

    if (options.clickable != null) {
      this.clickable = options.clickable;
    }

    if (options.draggable != null) {
      this.setDraggable(options.draggable);
    }

    if (options.editable != null) {
      this.setEditable(options.editable);
    }

    if (options.geodesic != null) {
      this.geodesic = options.geodesic;
    }

    if (options.strokeColor != null) {
      this.strokeColor = options.strokeColor;
    }

    if (options.strokeOpacity != null) {
      this.strokeOpacity = options.strokeOpacity;
    }

    if (options.strokeWeight != null) {
      this.strokeWeight = options.strokeWeight;
    }

    if (options.visible != null) {
      this.setVisible(options.visible);
    }

    if (options.zIndex != null) {
      this.zIndex = options.zIndex;
    }

    if (options.path != null) {
      this.setPath(options.path);
    }

    // Handle map option last, so if multiple options are set on Polyline creation,
    // it will only trigger the draw call once at the end.
    if ("map" in options) {
      this.setMap(options.map);
    }
  }

  setPath(
    path:
      | google.maps.MVCArray<google.maps.LatLng>
      | (google.maps.LatLng | google.maps.LatLngLiteral)[]
      | null,
  ): void {
    if (!path) {
      this.path = [];
    } else if (Array.isArray(path)) {
      this.path = path.map((p) => (p instanceof MigrationLatLng ? p : new MigrationLatLng(p)));
    } else {
      // MVCArray
      this.path = path.getArray().map((p) => (p instanceof MigrationLatLng ? p : new MigrationLatLng(p)));
    }

    this.#drawPolyline();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.#drawPolyline();
  }

  #getVisibilityProperty(): "visible" | "none" {
    return this.visible ? "visible" : "none";
  }

  // Handle drawing the polyline on the map, if one was specified
  #drawPolyline(): void {
    if (!this.map || !this.path || this.path.length === 0) {
      return;
    }

    const migrationMap = this.map as unknown as MigrationMap;
    const maplibreMap = migrationMap._getMap();

    // Assign source and layer IDs if not already assigned
    // This needs to happen before checking style load so IDs are available when handler fires
    // IMPORTANT: Only assign IDs once per polyline instance - reuse same IDs even if map reloads
    if (!this.#sourceId) {
      this.#sourceId = "polyline-source-" + MigrationPolyline.layerIndex;
      this.#layerId = "polyline-layer-" + MigrationPolyline.layerIndex;
      MigrationPolyline.layerIndex++;
    }

    // Convert path to GeoJSON LineString coordinates
    const coordinates = this.path.map((latLng) => [latLng.lng(), latLng.lat()]);

    const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
    };

    // First check if source and layer already exist
    const polylineSource = maplibreMap.getSource(this.#sourceId) as GeoJSONSource;
    const layerExists = maplibreMap.getLayer(this.#layerId);

    if (polylineSource && layerExists) {
      // Source and layer exist - just update them
      polylineSource.setData(lineString);
      maplibreMap.setLayoutProperty(this.#layerId, "visibility", this.#getVisibilityProperty());
      return;
    }

    // Source or layer don't exist - need to create them
    // But first check if style is loaded
    if (!this.#skipStyleCheck && !maplibreMap.isStyleLoaded()) {
      // Only register one load handler per polyline to avoid infinite loops
      if (!this.#loadHandlerRegistered) {
        this.#loadHandlerRegistered = true;
        // Use 'style.load' instead of 'load' - style.load fires when the style is fully loaded
        maplibreMap.once("style.load", () => {
          // Reset the flag and skip the style check for this call since we know style just loaded
          this.#loadHandlerRegistered = false;
          this.#skipStyleCheck = true;
          this.#drawPolyline();
          this.#skipStyleCheck = false;
        });
      }

      return;
    }

    // Clear the handler flag since we're about to create the source/layer
    this.#loadHandlerRegistered = false;

    // Remove old layer if it exists without a source (cleanup)
    if (layerExists && !polylineSource) {
      maplibreMap.removeLayer(this.#layerId);
    }

    // Add the polyline data as a GeoJSON source
    maplibreMap.addSource(this.#sourceId, {
      type: "geojson",
      data: lineString,
    });

    // Add the polyline layer
    maplibreMap.addLayer({
      id: this.#layerId,
      type: "line",
      source: this.#sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
        visibility: this.#getVisibilityProperty(),
      },
      paint: {
        "line-color": this.strokeColor,
        "line-opacity": this.strokeOpacity,
        "line-width": this.strokeWeight,
      },
    });
  }
}
