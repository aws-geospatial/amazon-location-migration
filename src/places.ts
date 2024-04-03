// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForSuggestionsRequest,
} from "@aws-sdk/client-location";

import { PlacesServiceStatus, QueryAutocompletePrediction } from "./googleCommon";

class MigrationAutocompleteService {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name

  getQueryPredictions(request, callback) {
    const query = request.input;
    const locationBias = request.locationBias; // optional

    const input: SearchPlaceIndexForSuggestionsRequest = {
      // SearchPlaceIndexForSuggestionsRequest
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

export { MigrationAutocompleteService };
