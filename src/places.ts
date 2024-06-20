// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  buildAmazonLocationMaplibreGeocoder,
  PlacesGeocoderOptions,
} from "@aws/amazon-location-for-maplibre-gl-geocoder";

import {
  GetPlaceCommand,
  GetPlaceRequest,
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForSuggestionsRequest,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForTextRequest,
} from "@aws-sdk/client-location";

import {
  LatLngToLngLat,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
  QueryAutocompletePrediction,
} from "./googleCommon";

interface AutocompletePrediction {
  description: string;
  place_id: string;
}

interface AutocompleteResponse {
  predictions: AutocompletePrediction[];
}

const convertAmazonPlaceToGoogle = (placeObject, fields, includeDetailFields) => {
  const place = placeObject.Place;
  const googlePlace = {};

  // For findPlaceFromQuery, the fields are required.
  // But for getDetails, they are optional, and if they aren't specified
  // then it is the same as requesting all fields.
  let includeAllFields = false;
  if (!fields || fields.includes("ALL")) {
    includeAllFields = true;
  }

  if (includeAllFields || fields.includes("formatted_address")) {
    googlePlace["formatted_address"] = place.Label;
  }

  if (includeAllFields || fields.includes("geometry") || fields.includes("geometry.location")) {
    const point = place.Geometry.Point;
    googlePlace["geometry"] = {
      location: new MigrationLatLng(point[1], point[0]),
    };
  }

  if (includeAllFields || fields.includes("name")) {
    googlePlace["name"] = place.Label.split(",")[0];
  }

  if (includeAllFields || fields.includes("place_id")) {
    googlePlace["place_id"] = placeObject.PlaceId;
  }

  if (includeAllFields || fields.includes("reference")) {
    googlePlace["reference"] = placeObject.PlaceId;
  }

  // Handle additional fields for getDetails request
  if (includeDetailFields) {
    // Our time zone offset is given in seconds, but Google's uses minutes
    // Google's utc_offset field is deprecated in favor of utc_offset_minutes,
    // but they still support it so we support both
    let timeZoneOffsetInMinutes;
    if (place.TimeZone) {
      timeZoneOffsetInMinutes = place.TimeZone.Offset / 60;
    }
    if (includeAllFields || fields.includes("utc_offset")) {
      googlePlace["utc_offset"] = timeZoneOffsetInMinutes;
    }
    if (includeAllFields || fields.includes("utc_offset_minutes")) {
      googlePlace["utc_offset_minutes"] = timeZoneOffsetInMinutes;
    }

    // vicinity is in the format of "AddressNumber Street, Municipality",
    // but street number or name might not be there depending on what was
    // searched for (e.g. just a city name)
    if (includeAllFields || fields.includes("vicinity")) {
      let vicinity = place.Municipality;
      if (place.Street) {
        vicinity = `${place.Street}, ${vicinity}`;
      }
      if (place.AddressNumber) {
        vicinity = `${place.AddressNumber} ${vicinity}`;
      }
      googlePlace["vicinity"] = vicinity;
    }
  }

  return googlePlace;
};

class MigrationPlacesService {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name

  findPlaceFromQuery(request, callback) {
    const query = request.query;
    const fields = request.fields;
    const locationBias = request.locationBias; // optional

    const input: SearchPlaceIndexForTextRequest = {
      IndexName: this._placeIndexName,
      Text: query, // required
      MaxResults: 10, // findPlaceFromQuery usually returns a single result
    };

    if (locationBias) {
      const lngLat = LatLngToLngLat(locationBias);
      if (lngLat) {
        input.BiasPosition = lngLat;
      }
    }

    const command = new SearchPlaceIndexForTextCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.Results;
        if (results.length !== 0) {
          results.forEach(function (place) {
            const placeResponse = convertAmazonPlaceToGoogle(place, fields, false);

            googleResults.push(placeResponse);
          });
        }

        callback(googleResults, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback([], PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }

  getDetails(request, callback) {
    const placeId = request.placeId;
    const fields = request.fields; // optional

    const input: GetPlaceRequest = {
      IndexName: this._placeIndexName, // required
      PlaceId: placeId, // required
    };

    const command = new GetPlaceCommand(input);
    this._client
      .send(command)
      .then((response) => {
        const place = response.Place;
        const googlePlace = convertAmazonPlaceToGoogle({ Place: place, PlaceId: placeId }, fields, true);

        callback(googlePlace, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback(null, PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }

  textSearch(request, callback) {
    const query = request.query; // optional
    const locationBias = request.location; // optional
    const bounds = request.bounds; // optional
    const language = request.language; // optional
    const region = request.region; // optional

    const input: SearchPlaceIndexForTextRequest = {
      IndexName: this._placeIndexName,
      Text: query, // required
    };

    // If bounds is specified, then location bias is ignored
    if (bounds) {
      const latLngBounds = new MigrationLatLngBounds(bounds);
      const southWest = latLngBounds.getSouthWest();
      const northEast = latLngBounds.getNorthEast();

      input.FilterBBox = [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()];
    } else if (locationBias) {
      const lngLat = LatLngToLngLat(locationBias);
      if (lngLat) {
        input.BiasPosition = lngLat;
      }
    }

    if (language) {
      input.Language = language;
    }

    if (region) {
      input.FilterCountries = [region];
    }

    const command = new SearchPlaceIndexForTextCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.Results;
        if (results.length !== 0) {
          results.forEach(function (place) {
            // Include all supported fields as in findPlaceFromQuery,
            // but not the additional fields for getDetails
            const placeResponse = convertAmazonPlaceToGoogle(place, ["ALL"], false);

            googleResults.push(placeResponse);
          });
        }

        callback(googleResults, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback([], PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }
}

class MigrationAutocompleteService {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name

  getQueryPredictions(request, callback) {
    const query = request.input;
    const location = request.location; // optional
    const locationBias = request.locationBias; // optional
    const bounds = request.bounds || request.locationRestriction; // optional
    const language = request.language; // optional

    const input: SearchPlaceIndexForSuggestionsRequest = {
      IndexName: this._placeIndexName,
      Text: query, // required
    };

    // Handle location/bounds restrictions. bounds and location have been deprecated, and in some cases
    // have actually been removed (although still mentioned in the documentation as only deprecated).
    //   * locationBias is the top preferred field, and can be MigrationLatLng|LatLngLiteral|MigrationLatLngBounds|LatLngBoundsLiteral
    //   * bounds / locationRestriction is the next preferred field
    //   * location is the final field that is checked
    let inputBounds, inputLocation;
    if (locationBias) {
      // MigrationLatLng|LatLngLiteral
      if (locationBias.lat !== undefined && locationBias.lng !== undefined) {
        inputLocation = new MigrationLatLng(locationBias);
      } /* MigrationLatLngBounds|LatLngBoundsLiteral */ else {
        inputBounds = new MigrationLatLngBounds(locationBias);
      }
    } else if (bounds) {
      inputBounds = new MigrationLatLngBounds(bounds);
    } else if (location) {
      inputLocation = new MigrationLatLng(location);
    }

    // If bounds was found, then location is ignored
    if (inputBounds) {
      const southWest = inputBounds.getSouthWest();
      const northEast = inputBounds.getNorthEast();

      input.FilterBBox = [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()];
    } else if (inputLocation) {
      const lngLat = LatLngToLngLat(inputLocation);
      if (lngLat) {
        input.BiasPosition = lngLat;
      }
    }

    if (language) {
      input.Language = language;
    }

    const command = new SearchPlaceIndexForSuggestionsCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googlePredictions: QueryAutocompletePrediction[] = [];

        const results = response.Results;
        if (results && results.length !== 0) {
          results.forEach(function (result) {
            const prediction: QueryAutocompletePrediction = {
              description: result.Text,
            };

            if (result.PlaceId) {
              prediction.place_id = result.PlaceId;
            }

            googlePredictions.push(prediction);
          });
        }

        callback(googlePredictions, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback([], PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }

  // getPlacePredictions has a similar behavior as getQueryPredictions, except it omits query predictions,
  // so it only returns predictions that have a place_id
  getPlacePredictions(request, callback?): Promise<AutocompleteResponse> {
    return new Promise((resolve) => {
      this.getQueryPredictions(request, (predictions, status) => {
        // Filter out predictions that don't have a place_id
        const filteredPredictions = predictions.filter((prediction) => {
          return prediction.place_id;
        });

        // If a callback was given, invoke it before resolving the promise
        if (callback) {
          callback(filteredPredictions, status);
        }

        resolve({
          predictions: filteredPredictions,
        });
      });
    });
  }
}

class MigrationAutocomplete {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
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

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(
      this._client,
      this._placeIndexName,
      maplibreGeocoderOptions,
    );

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
    if (typeof options?.strictBounds === "boolean") {
      this.#strictBounds = options.strictBounds;
    }

    if (options?.bounds) {
      this.setBounds(options.bounds);
    }

    if (options?.fields) {
      this.#fields = options.fields;
    }
  }

  addListener(eventName, handler) {
    if (eventName == "place_changed") {
      // This event is triggered if the user selects either a place from the retrieved suggestions
      this.#maplibreGeocoder.getPlacesGeocoder().on("results", (results) => {
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
        }
      });

      // This event is triggered if the user re-selects the single place that had been previously selected
      // from the list of suggestions
      this.#maplibreGeocoder.getPlacesGeocoder().on("result", (result) => {
        // The fields could be set later, so we need to query again before converting the place
        const fields = this.#fields || ["ALL"];

        this.#place = convertAmazonPlaceToGoogle(result.result.properties, fields, true);

        handler();
      });
    }
  }

  _getMaplibreGeocoder() {
    return this.#maplibreGeocoder;
  }
}

class MigrationSearchBox {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
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

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(
      this._client,
      this._placeIndexName,
      maplibreGeocoderOptions,
    );

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

  addListener(eventName, handler) {
    if (eventName == "places_changed") {
      // This event is triggered if the user selects either a place or query suggestion
      // from the retrieved suggestions
      this.#maplibreGeocoder.getPlacesGeocoder().on("results", (results) => {
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
        }
      });

      // This event is triggered if the user selects a place from a list of query suggestions
      this.#maplibreGeocoder.getPlacesGeocoder().on("result", (result) => {
        this.#places = [convertAmazonPlaceToGoogle(result.result.properties, ["ALL"], true)];

        handler();
      });
    }
  }

  _getMaplibreGeocoder() {
    return this.#maplibreGeocoder;
  }
}

export { MigrationAutocomplete, MigrationAutocompleteService, MigrationPlacesService, MigrationSearchBox };
