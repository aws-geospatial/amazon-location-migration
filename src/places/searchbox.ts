// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  buildAmazonLocationMaplibreGeocoder,
  PlacesGeocoderOptions,
} from "@aws/amazon-location-for-maplibre-gl-geocoder";

import { GeoPlacesClient } from "@aws-sdk/client-geo-places";

import { AddListenerResponse, MigrationLatLngBounds } from "../common";
import { convertAmazonPlaceToGoogle } from "./place_conversion";

export class MigrationSearchBox {
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our GeoPlaces client
  #maplibreGeocoder;
  #bounds: MigrationLatLngBounds | undefined;
  #places;

  constructor(inputField: HTMLInputElement, opts?) {
    const maplibreGeocoderOptions: PlacesGeocoderOptions = {
      enableAll: true,
    };

    if (inputField.placeholder) {
      maplibreGeocoderOptions.placeholder = inputField.placeholder;
    }

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(this._client, maplibreGeocoderOptions);

    if (opts?.bounds) {
      this.setBounds(opts.bounds);
    }

    const geocoder = this.#maplibreGeocoder.getPlacesGeocoder();
    geocoder.addTo(inputField.parentElement);

    if (inputField.className) {
      geocoder.container.className = `${inputField.className} ${geocoder.container.className}`;
    }

    if (inputField.id) {
      geocoder._inputEl.id = inputField.id;
    }

    inputField.remove();
  }

  getBounds() {
    return this.#bounds;
  }

  setBounds(bounds) {
    this.#bounds = new MigrationLatLngBounds(bounds);

    // TODO: Google's setBounds is used to bias, but the geocoder's bounds is a firm restriction, so
    // for now we use the center of the input bounds to bias
    const center = this.#bounds.getCenter();
    this.#maplibreGeocoder.setBiasPosition({
      latitude: center.lat(),
      longitude: center.lng(),
    });
  }

  getPlaces() {
    return this.#places;
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "places_changed") {
      // This event is triggered if the user selects either a place or query suggestion
      // from the retrieved suggestions
      const resultsWrappedHandler = (results) => {
        if (results.place || results.features?.length) {
          if (results.place) {
            this.#places = [convertAmazonPlaceToGoogle(results.place.properties, ["ALL"], true)];
          } else {
            this.#places = results.features.map((result) => {
              return convertAmazonPlaceToGoogle(result.properties, ["ALL"], true);
            });
          }

          // When the user picks a prediction, the geocoder displays the updated results
          // by default (e.g. drops down the single chosen prediction, or a list of the results
          // for the query string). Google's widget does not do this, so in order to force the
          // results to collapse, we need to focus and then unfocus the input element.
          const inputElement = this.#maplibreGeocoder.getPlacesGeocoder()._inputEl as HTMLInputElement;
          inputElement.focus();
          inputElement.blur();

          handler();
          if (listenerType == "once") {
            this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
            this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          }
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("results", resultsWrappedHandler);

      // This event is triggered if the user selects a place from a list of query suggestions
      const resultWrappedHandler = (result) => {
        this.#places = [convertAmazonPlaceToGoogle(result.result.properties, ["ALL"], true)];

        handler();
        if (listenerType == "once") {
          this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("result", resultWrappedHandler);

      return {
        instance: this,
        eventName: eventName,
        resultHandler: resultWrappedHandler,
        resultsHandler: resultsWrappedHandler,
      };
    }
  }

  _getMaplibreGeocoder() {
    return this.#maplibreGeocoder;
  }

  _setMapLibreGeocoder(geocoder) {
    this.#maplibreGeocoder = geocoder;
  }
}
