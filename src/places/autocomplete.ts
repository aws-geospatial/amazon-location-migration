// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  buildAmazonLocationMaplibreGeocoder,
  PlacesGeocoderOptions,
} from "@aws/amazon-location-for-maplibre-gl-geocoder";

import { GeoPlacesClient } from "@aws-sdk/client-geo-places";

import { AddListenerResponse, MigrationLatLngBounds } from "../common";
import { convertAmazonPlaceToGoogle } from "./place_conversion";

export class MigrationAutocomplete {
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our GeoPlaces client
  #maplibreGeocoder;
  #bounds: MigrationLatLngBounds | undefined;
  #strictBounds = false;
  #fields;
  #place;

  constructor(inputField: HTMLInputElement, opts?) {
    // Same base geocoder options as SearchBox, except we add omitSuggestionsWithoutPlaceId
    // so that we only get results with a PlaceId
    const maplibreGeocoderOptions: PlacesGeocoderOptions = {
      enableAll: true,
      omitSuggestionsWithoutPlaceId: true,
    };

    if (inputField.placeholder) {
      maplibreGeocoderOptions.placeholder = inputField.placeholder;
    }

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(this._client, maplibreGeocoderOptions);

    const geocoder = this.#maplibreGeocoder.getPlacesGeocoder();
    geocoder.addTo(inputField.parentElement);

    if (inputField.className) {
      geocoder.container.className = `${inputField.className} ${geocoder.container.className}`;
    }

    if (inputField.id) {
      geocoder._inputEl.id = inputField.id;
    }

    inputField.remove();

    if (opts) {
      this.setOptions(opts);
    }
  }

  getBounds() {
    return this.#bounds;
  }

  getFields() {
    return this.#fields;
  }

  getPlace() {
    return this.#place;
  }

  setBounds(bounds) {
    this.#bounds = new MigrationLatLngBounds(bounds);

    // Google's setBounds is used to bias, but the geocoder's bounds is a firm restriction, so
    // if strictBounds isn't specified, then we use the center of the input bounds to bias
    if (this.#strictBounds) {
      const southWest = this.#bounds.getSouthWest();
      const northEast = this.#bounds.getNorthEast();
      const boundingBox = {
        longitudeSW: southWest.lng(),
        latitudeSW: southWest.lat(),
        longitudeNE: northEast.lng(),
        latitudeNE: northEast.lat(),
      };

      this.#maplibreGeocoder.setBoundingBox(boundingBox);
    } else {
      const center = this.#bounds.getCenter();
      this.#maplibreGeocoder.setBiasPosition({
        latitude: center.lat(),
        longitude: center.lng(),
      });
    }
  }

  setFields(fields) {
    this.#fields = fields;
  }

  setOptions(options) {
    // Read in strictBounds option first since it will determine how
    // the bounds option is consumed
    if (typeof options.strictBounds === "boolean") {
      this.#strictBounds = options.strictBounds;
    }

    if (options.bounds) {
      this.setBounds(options.bounds);
    }

    if (options.fields) {
      this.#fields = options.fields;
    }
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "place_changed") {
      // This event is triggered if the user selects either a place from the retrieved suggestions
      const resultsWrappedHandler = (results) => {
        if (results.place) {
          // The fields could be set later, so we need to query again before converting the place
          const fields = this.#fields || ["ALL"];

          this.#place = convertAmazonPlaceToGoogle(results.place.properties, fields, true);

          // When the user picks a prediction, the geocoder displays the updated results
          // by default (e.g. drops down the single chosen prediction).
          // Google's widget does not do this, so in order to force the
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

      // This event is triggered if the user re-selects the single place that had been previously selected
      // from the list of suggestions
      const resultWrappedHandler = (result) => {
        // The fields could be set later, so we need to query again before converting the place
        const fields = this.#fields || ["ALL"];

        this.#place = convertAmazonPlaceToGoogle(result.result.properties, fields, true);

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
