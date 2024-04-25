// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker } from "maplibre-gl";
import { LatLngToLngLat } from "./googleCommon";

class MigrationMarker {
  #marker: Marker;

  constructor(options) {
    this.#marker = new Marker();

    if (typeof options.draggable !== "undefined") {
      this.setDraggable(options.draggable);
    }

    if (typeof options.gmpDraggable !== "undefined") {
      this.setDraggable(options.gmpDraggable);
    }

    if (options.position) {
      this.setPosition(options.position);
    }

    if (options.opacity) {
      this.setOpacity(options.opacity);
    }

    if (options.map) {
      this.setMap(options.map);
    }
  }

  setDraggable(draggable) {
    this.#marker.setDraggable(draggable);
  }

  setPosition(position) {
    const lnglat = LatLngToLngLat(position);
    this.#marker.setLngLat(lnglat);
  }

  setOpacity(opacity) {
    this.#marker.setOpacity(opacity);
  }

  setMap(map) {
    if (map) {
      this.#marker.addTo(map._getMap());
    } else {
      this.#marker.remove();
    }
  }

  remove() {
    this.#marker.remove();
  }
}

export { MigrationMarker };
