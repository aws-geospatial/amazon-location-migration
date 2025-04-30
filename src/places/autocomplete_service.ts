// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GeoPlacesClient, SuggestAdditionalFeature, SuggestCommand, SuggestRequest } from "@aws-sdk/client-geo-places";

import { LatLngToLngLat, MigrationLatLng, MigrationLatLngBounds, PlacesServiceStatus } from "../common";

// FIXME: Temporarily add QueryAutocompletePrediction as a possible type until getPlacePredictions has been
// re-implemented using the new Autocomplete API. All of these Autocomplete/Query predicition types can be
// removed once we complete this work.
interface AutocompleteResponse {
  predictions: AutocompletePrediction[] | QueryAutocompletePrediction[];
}
interface AutocompletePrediction {
  description: string;
  place_id: string;
}
interface QueryAutocompletePrediction {
  description: string;
  matched_substrings: google.maps.places.PredictionSubstring[];
  place_id?: string;
  reference?: string;
  terms: google.maps.places.PredictionTerm[];
}

export class MigrationAutocompleteService {
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our location client

  getQueryPredictions(request, callback: (a: QueryAutocompletePrediction[], b: PlacesServiceStatus) => void) {
    const query = request.input;
    const location = request.location; // optional
    const locationBias = request.locationBias; // optional
    const bounds = request.bounds || request.locationRestriction; // optional
    const radius = request.radius; // optional
    const language = request.language; // optional

    const input: SuggestRequest = {
      QueryText: query, // required
      MaxResults: 5, // Google only returns a max of 5 results
      AdditionalFeatures: [SuggestAdditionalFeature.CORE], // Without this, only the ID and Title will be returned
    };

    // Handle location/bounds restrictions. bounds and location have been deprecated, and in some cases
    // have actually been removed (although still mentioned in the documentation as only deprecated).
    //   * locationBias is the top preferred field, and can be MigrationLatLng|LatLngLiteral|MigrationLatLngBounds|LatLngBoundsLiteral
    //   * bounds / locationRestriction is the next preferred field
    //   * location is the final field that is checked
    //   * radius must be paired with a LatLng (locationBias / location) to specify a circle bias
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

      input.Filter = {
        BoundingBox: [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()],
      };
    } else if (inputLocation) {
      // If we have a location and a radius, then we will use a circle
      // Otherwise, just the location will be used
      const lngLat = LatLngToLngLat(inputLocation);
      if (lngLat) {
        if (radius) {
          input.Filter = {
            Circle: {
              Center: lngLat,
              Radius: radius,
            },
          };
        } else {
          input.BiasPosition = lngLat;
        }
      }
    }

    if (language) {
      input.Language = language;
    }

    const command = new SuggestCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googlePredictions: QueryAutocompletePrediction[] = [];

        const results = response.ResultItems;
        if (results && results.length !== 0) {
          results.forEach(function (result) {
            const matchedSubstrings = [];
            const terms: google.maps.places.PredictionTerm[] = [];
            if (result.Query) {
              if (result.Highlights) {
                const highlights = result.Highlights.Title;
                highlights.forEach((highlight) => {
                  matchedSubstrings.push({
                    length: highlight.EndIndex - highlight.StartIndex,
                    offset: highlight.StartIndex,
                  });
                });
              }

              const title = result.Title;
              terms.push({
                offset: 0,
                value: title,
              });
            } else {
              if (result.Highlights?.Address?.Label || result.Highlights?.Title) {
                // Highlights (if present), could be on the address or the title
                const highlights = result.Highlights.Address.Label
                  ? result.Highlights.Address.Label
                  : result.Highlights.Title;
                highlights.forEach((highlight) => {
                  matchedSubstrings.push({
                    length: highlight.EndIndex - highlight.StartIndex,
                    offset: highlight.StartIndex,
                  });
                });
              }

              const description = result.Place.Address.Label;
              let offset = 0;
              for (let index = 0; index < description.length; index++) {
                if (description[index] == ",") {
                  terms.push({
                    offset: offset,
                    value: description.substring(offset, index),
                  });

                  // The label parts are separated by a comma and a space, so advance the index and calculate
                  // the next offset based on that the index will also be incremented after completing this iteration
                  // of the loop
                  index++;
                  offset = index + 1;
                }
              }

              terms.push({
                offset: offset,
                value: description.substring(offset),
              });
            }

            const prediction: QueryAutocompletePrediction = {
              description: result.Query ? result.Title : result.Place.Address.Label,
              matched_substrings: matchedSubstrings,
              terms: terms,
            };

            if (result.Place) {
              const placeId = result.Place.PlaceId;
              prediction.place_id = placeId;
              prediction.reference = placeId;
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
