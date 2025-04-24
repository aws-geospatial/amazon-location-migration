// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  SearchPlaceIndexForPositionRequest,
} from "@aws-sdk/client-location";

import {
  GeocoderStatus,
  LatLngLike,
  LatLngBoundsLike,
  LatLngToLngLat,
  MigrationLatLng,
  PlacesServiceStatus,
  MigrationLatLngBounds,
} from "./common";
import { convertAmazonPlaceToGoogleV1, MigrationPlacesService } from "./places";

interface GeocoderRequest {
  address?: string | null;
  bounds?: LatLngBoundsLike | null;
  language?: string | null;
  location?: LatLngLike | null;
  placeId?: string | null;
}

interface GeocoderResponse {
  results: GeocoderResult[];
}

interface GeocoderResult {
  formatted_address: string;
  geometry: GeocoderGeometry;
  place_id: string;
}

interface GeocoderGeometry {
  bounds?: MigrationLatLngBounds;
  location: MigrationLatLng;
}

class MigrationGeocoder {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
  // This will be populated by the top level module
  // that already has a MigrationPlacesService that has
  // been configured with our place index name
  _placesService: MigrationPlacesService;

  geocode(request: GeocoderRequest, callback?): Promise<GeocoderResponse> {
    const bounds = request.bounds;
    const language = request.language;
    const location = request.location;
    const address = request.address;
    const placeId = request.placeId;

    // These are the only fields we want to return for the GeocoderResult
    const fields = ["formatted_address", "geometry", "place_id"];

    if (location) {
      const lngLat = LatLngToLngLat(location);
      const input: SearchPlaceIndexForPositionRequest = {
        IndexName: this._placeIndexName, // required
        Position: lngLat,
      };

      if (language) {
        input.Language = language;
      }

      return new Promise((resolve, reject) => {
        const command = new SearchPlaceIndexForPositionCommand(input);

        this._client
          .send(command)
          .then((response) => {
            const googleResults = [];

            const results = response.Results;
            if (results.length !== 0) {
              results.forEach(function (place) {
                const newPlace = convertAmazonPlaceToGoogleV1(place, fields, false);

                googleResults.push(newPlace);
              });
            }

            if (callback) {
              callback(googleResults, GeocoderStatus.OK);
            }

            resolve({
              results: googleResults,
            });
          })
          .catch((error) => {
            console.error(error);

            if (callback) {
              callback(null, GeocoderStatus.UNKNOWN_ERROR);
            }

            reject({
              status: GeocoderStatus.UNKNOWN_ERROR,
            });
          });
      });
    } else if (placeId) {
      return new Promise((resolve, reject) => {
        const request = {
          placeId: placeId,
          fields: fields,
        };

        this._placesService.getDetails(request, (result, status) => {
          if (status == PlacesServiceStatus.OK) {
            const googleResults = [result];

            if (callback) {
              callback(googleResults, GeocoderStatus.OK);
            }

            resolve({
              results: googleResults,
            });
          } else {
            if (callback) {
              callback(null, GeocoderStatus.UNKNOWN_ERROR);
            }

            reject({
              status: GeocoderStatus.UNKNOWN_ERROR,
            });
          }
        });
      });
    } else if (address) {
      return new Promise((resolve, reject) => {
        const request: google.maps.places.FindPlaceFromQueryRequest = {
          query: address,
          fields: fields,
        };

        // TODO: findPlaceFromQuery only supports a locationBias instead of a bounds, so if bounds
        // was specified we will just use the center to act as a locationBias
        if (bounds) {
          const latLngBounds = new MigrationLatLngBounds(bounds);
          request.locationBias = latLngBounds.getCenter();
        }

        this._placesService.findPlaceFromQuery(request, (results, status) => {
          if (status == PlacesServiceStatus.OK) {
            if (callback) {
              callback(results, GeocoderStatus.OK);
            }

            resolve({
              results: results,
            });
          } else {
            if (callback) {
              callback(null, GeocoderStatus.UNKNOWN_ERROR);
            }

            reject({
              status: GeocoderStatus.UNKNOWN_ERROR,
            });
          }
        });
      });
    }
  }
}

export { GeocoderRequest, MigrationGeocoder };
