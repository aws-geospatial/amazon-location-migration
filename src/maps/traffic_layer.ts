// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Traffic } from "@aws-sdk/client-geo-maps";
import { MigrationMap } from "../maps";

class MigrationTrafficLayer {
  #map: MigrationMap;

  constructor(options?) {
    this.setOptions(options);
  }

  getMap() {
    return this.#map;
  }

  setMap(map) {
    // Clear out the traffic on the current map (if one was assigned) before setting to null
    if (this.#map && !map) {
      this.#map._setTraffic(null);
    }

    this.#map = map;

    if (map) {
      map._setTraffic(Traffic.ALL);
    }
  }

  setOptions(options) {
    if (!options) {
      return;
    }

    // Need to use 'in' because null and undefined are valid inputs
    if ("map" in options) {
      this.setMap(options.map);
    }
  }
}

export { MigrationTrafficLayer };
