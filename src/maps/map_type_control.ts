// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IControl, Map } from "maplibre-gl";

import { MapTypeId } from "../common";

export class MapTypeControl implements IControl {
  _container: HTMLElement; // Use _ prefix for private container so that we can query it in the unit tests
  #map: Map;
  #mapTypeIds: string[];
  #mapTypeChanged: (mapTypeId: string) => void;

  constructor(mapTypeIds: string[] | null, mapTypeChanged: (mapTypeId: string) => void) {
    this.#mapTypeIds = mapTypeIds || [MapTypeId.SATELLITE, MapTypeId.ROADMAP];

    this.#mapTypeIds = this.#mapTypeIds.filter(
      (mapTypeId) => mapTypeId == MapTypeId.ROADMAP || mapTypeId == MapTypeId.SATELLITE,
    );
    this.#mapTypeChanged = mapTypeChanged;
  }

  onAdd(map: Map): HTMLElement {
    this.#map = map;

    // Create container for our buttons that match the other maplibre ctrl class style
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this.#mapTypeIds.forEach((type) => {
      const button = document.createElement("button");
      button.setAttribute("style", "width: 100%; padding-left: 15px; padding-right: 15px");

      // Create an inner span to hold the actual text so that it will get consistent styling
      // compared to the other maplibre controls
      const innerSpan = document.createElement("span");
      innerSpan.className = "maplibregl-map";
      innerSpan.setAttribute("style", "font-size: 18px;");
      innerSpan.textContent = type == MapTypeId.ROADMAP ? "Map" : "Satellite";
      button.appendChild(innerSpan);

      // Listen for button clicks so we can trigger the mapTypeChanged callback
      button.addEventListener("click", () => this.#mapTypeChanged(type));

      this._container.appendChild(button);
    });

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this.#map = null;
  }
}
