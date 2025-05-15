// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoPlacesClient,
  GeocodeCommand,
  GeocodeRequest,
  ReverseGeocodeCommand,
  ReverseGeocodeRequest,
} from "@aws-sdk/client-geo-places";

import { GeocoderStatus, LatLngToLngLat, PlacesServiceStatus, MigrationLatLngBounds } from "./common";
import { convertAmazonPlaceToGoogle, MigrationPlacesService } from "./places";

class MigrationGeocoder {
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our location client
  // This will be populated by the top level module
  // that already has a MigrationPlacesService
  _placesService: MigrationPlacesService;

  geocode(request: google.maps.GeocoderRequest, callback?): Promise<google.maps.GeocoderResponse> {
    const bounds = request.bounds;
    const language = request.language;
    const location = request.location;
    const address = request.address;
    const placeId = request.placeId;

    // These are the only fields we want to return for the GeocoderResult
    const fields = ["formatted_address", "geometry", "place_id"];

    if (location) {
      const lngLat = LatLngToLngLat(location);
      const input: ReverseGeocodeRequest = {
        QueryPosition: lngLat,
        AdditionalFeatures: ["TimeZone"], // "TimeZone" is needed for place's time zone
      };

      if (language) {
        input.Language = language;
      }

      return new Promise((resolve, reject) => {
        const command = new ReverseGeocodeCommand(input);

        this._client
          .send(command)
          .then((response) => {
            const googleResults = [];

            const results = response.ResultItems;
            if (results.length !== 0) {
              results.forEach(function (place) {
                const newPlace = convertAmazonPlaceToGoogle(place, fields, false);

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
      const input: GeocodeRequest = {
        QueryText: address,
        AdditionalFeatures: ["TimeZone"], // "TimeZone" is needed for place's time zone
      };

      if (bounds) {
        const latLngBounds = new MigrationLatLngBounds(bounds);
        const boundsCenter = latLngBounds.getCenter();
        input.BiasPosition = LatLngToLngLat(boundsCenter);
      }

      if (language) {
        input.Language = language;
      }

      return new Promise((resolve, reject) => {
        const command = new GeocodeCommand(input);

        this._client
          .send(command)
          .then((response) => {
            const googleResults = [];

            const results = response.ResultItems;
            if (results.length !== 0) {
              results.forEach(function (place) {
                const newPlace = convertAmazonPlaceToGoogle(place, fields, false);

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
    }
  }
}

export { MigrationGeocoder };
