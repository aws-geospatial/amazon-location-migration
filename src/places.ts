// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GetPlaceCommand,
  GetPlaceRequest,
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForSuggestionsRequest,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForTextRequest,
} from "@aws-sdk/client-location";

import { GoogleLatLng, PlacesServiceStatus, QueryAutocompletePrediction } from "./googleCommon";

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
      if (typeof locationBias.lat === "function") {
        input.BiasPosition = [locationBias.lng(), locationBias.lat()];
      } else {
        input.BiasPosition = [locationBias.lng, locationBias.lat];
      }
    }

    const command = new SearchPlaceIndexForTextCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.Results;
        if (results.length !== 0) {
          results.forEach(function (result) {
            const place = result.Place;
            const placeResponse = {};

            // TODO: We might be able to consolidate converting a google Place object to Amazon Location Place object if
            // expected responses have the same format
            fields.forEach(function (item) {
              if (item === "name") {
                placeResponse[item] = place.Label.split(",")[0];
              } else if (item === "geometry") {
                const point = place.Geometry.Point;
                placeResponse[item] = {
                  location: GoogleLatLng(point[1], point[0]),
                };
              }
            });

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

    const input: GetPlaceRequest = {
      IndexName: this._placeIndexName, // required
      PlaceId: placeId, // required
    };

    const command = new GetPlaceCommand(input);
    this._client
      .send(command)
      .then((response) => {
        const place = response.Place;
        const point = place.Geometry.Point;
        const googleResult = {
          formatted_address: place.Label,
          name: place.Label.split(",")[0],
          geometry: {
            location: GoogleLatLng(point[1], point[0]),
          },
          place_id: placeId,
        };

        callback(googleResult, PlacesServiceStatus.OK);
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
    const locationBias = request.locationBias; // optional

    const input: SearchPlaceIndexForSuggestionsRequest = {
      IndexName: this._placeIndexName,
      Text: query, // required
    };

    // TODO: Create helper methods for converting to/from LatLng concrete and literal
    if (locationBias) {
      if (typeof locationBias.lat === "function") {
        input.BiasPosition = [locationBias.lng(), locationBias.lat()];
      } else {
        input.BiasPosition = [locationBias.lng, locationBias.lat];
      }
    }

    const command = new SearchPlaceIndexForSuggestionsCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googlePredictions: QueryAutocompletePrediction[] = [];

        const results = response.Results;
        if (results && results.length !== 0) {
          results.forEach(function (result) {
            if (!result.Text) {
              return;
            }

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
}

export { MigrationAutocompleteService, MigrationPlacesService };
