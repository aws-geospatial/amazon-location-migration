// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Marker } from "maplibre-gl";

class MigrationMarker {
  _marker: Marker;

  constructor(options) {
    this._marker = new Marker();

    if (options.position) {
      this.setPosition(options.position);
    }

    if (options.map) {
      this.setMap(options.map);
    }
  }

  setPosition(position) {
    this._marker.setLngLat([position.lng(), position.lat()]);
  }

  setMap(map) {
    if (map) {
      this._marker.addTo(map._getMap());
    } else {
      this._marker.remove();
    }
  }

  remove() {
    this._marker.remove();
  }
}

export { MigrationMarker };
