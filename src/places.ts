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

import {
  LatLngToLngLat,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
  QueryAutocompletePrediction,
} from "./googleCommon";

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
    const locationBias = request.locationBias; // optional
    const bounds = request.bounds; // optional

    const input: SearchPlaceIndexForSuggestionsRequest = {
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
}

export { MigrationAutocompleteService, MigrationPlacesService };
