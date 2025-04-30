// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GetPlaceCommand as GetPlaceCommandV1,
  GetPlaceRequest as GetPlaceRequestV1,
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForTextRequest,
} from "@aws-sdk/client-location";

import { LatLngToLngLat, MigrationLatLng, MigrationLatLngBounds, PlacesServiceStatus } from "../common";

// This helper is for converting an Amazon Place object to a new Google Place class
const convertAmazonPlaceToGoogleNewPlace = (amazonPlaceObject, fields, googlePlace = null) => {
  const place = amazonPlaceObject.Place;

  // If a Google Place object wasn't passed in, then create a new one
  if (!googlePlace) {
    googlePlace = new MigrationPlace({
      id: amazonPlaceObject.PlaceId,
    });
  }

  // fields is required, so the only way to include all is by passing ['*'] or
  // specifying each individual field
  let includeAllFields = false;
  if (fields.includes("*")) {
    includeAllFields = true;
  }

  if (includeAllFields || fields.includes("displayName")) {
    googlePlace.displayName = place.Label.split(",")[0];
  }

  if (includeAllFields || fields.includes("formattedAddress")) {
    googlePlace.formattedAddress = place.Label;
  }

  if (includeAllFields || fields.includes("location")) {
    const point = place.Geometry.Point;
    googlePlace.location = new MigrationLatLng(point[1], point[0]);
  }

  if (includeAllFields || fields.includes("utcOffsetMinutes")) {
    // Our time zone offset is given in seconds, but Google's uses minutes
    let timeZoneOffsetInMinutes;
    if (place.TimeZone) {
      timeZoneOffsetInMinutes = place.TimeZone.Offset / 60;

      googlePlace.utcOffsetMinutes = timeZoneOffsetInMinutes;
    }
  }

  return googlePlace;
};

export class MigrationPlace {
  static _client: LocationClient; // This will be populated by the top level module that creates our location client
  static _placeIndexName: string; // This will be populated by the top level module that is passed our place index name

  displayName?: string | null;
  formattedAddress?: string | null;
  id: string;
  location?: MigrationLatLng | null;
  requestedLanguage?: string | null;
  requestedRegion?: string | null;
  utcOffsetMinutes?: number | null;

  constructor(options: google.maps.places.PlaceOptions) {
    this.id = options.id;

    if (options.requestedLanguage) {
      this.requestedLanguage = options.requestedLanguage;
    }
  }

  fetchFields(options: google.maps.places.FetchFieldsRequest): Promise<{ place: MigrationPlace }> {
    const placeId = this.id;
    const requestedLanguage = this.requestedLanguage;
    const fields = options.fields; // required

    const input: GetPlaceRequestV1 = {
      IndexName: MigrationPlace._placeIndexName, // required
      PlaceId: placeId, // required
    };

    if (requestedLanguage) {
      input.Language = requestedLanguage;
    }

    return new Promise((resolve, reject) => {
      const command = new GetPlaceCommandV1(input);

      MigrationPlace._client
        .send(command)
        .then((response) => {
          const place = response.Place;

          // Pass in this reference so it will get updated, but we also return it as well
          const newPlace = convertAmazonPlaceToGoogleNewPlace({ Place: place, PlaceId: placeId }, fields, this);

          resolve({
            place: newPlace,
          });
        })
        .catch((error) => {
          console.error(error);

          reject({
            status: PlacesServiceStatus.UNKNOWN_ERROR,
          });
        });
    });
  }

  toJSON() {
    const jsonObject = {};

    // Iterating over the properties on our instance like this will only give us
    // back non-null properties, so any fields that weren't requested will be omitted for us
    for (const property in this) {
      const value = this[property];

      // Handle special-case for location property that needs to return its own JSON object
      // Everything else that's a primitive (boolean/string/number) can just return the value as-is
      if (property === "location") {
        jsonObject[property as string] = (value as MigrationLatLng).toJSON();
      } else {
        jsonObject[property as string] = value;
      }
    }

    return jsonObject;
  }

  public static searchByText(request: google.maps.places.SearchByTextRequest): Promise<{ places: MigrationPlace[] }> {
    const query = request.textQuery || request.query; // textQuery is the new preferred field, query is deprecated but still allowed
    const fields = request.fields; // optional
    const locationBias = request.locationBias; // optional
    const bounds = request.locationRestriction; // optional
    const language = request.language; // optional
    const maxResultCount = request.maxResultCount; // optional

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

    if (maxResultCount) {
      input.MaxResults = maxResultCount;
    }

    return new Promise((resolve, reject) => {
      const command = new SearchPlaceIndexForTextCommand(input);

      MigrationPlace._client
        .send(command)
        .then((response) => {
          const googlePlaces = [];

          const results = response.Results;
          if (results.length !== 0) {
            results.forEach(function (place) {
              const newPlace = convertAmazonPlaceToGoogleNewPlace(place, fields);

              googlePlaces.push(newPlace);
            });
          }

          resolve({
            places: googlePlaces,
          });
        })
        .catch((error) => {
          console.error(error);

          reject({
            status: PlacesServiceStatus.UNKNOWN_ERROR,
          });
        });
    });
  }
}
