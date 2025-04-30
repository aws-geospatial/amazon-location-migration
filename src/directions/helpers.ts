// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationLatLng, PlacesServiceStatus } from "../common";
import { MigrationPlacesService } from "../places";

import { UnitSystem } from "./defines";

const KILOMETERS_TO_MILES_CONSTANT = 0.621371;

export interface ParseOrFindLocationResponse {
  locationLatLng: MigrationLatLng;
  position: [number, number];
}

export function parseOrFindLocations(
  locationInputs: (string | google.maps.LatLng | MigrationLatLng | google.maps.LatLngLiteral | google.maps.Place)[],
  placesService: MigrationPlacesService,
  findPlaceFromQueryFields: string[],
) {
  const locations = [];
  for (const locationInput of locationInputs) {
    locations.push(parseOrFindLocation(locationInput, placesService, findPlaceFromQueryFields));
  }
  return Promise.all(locations);
}

export function parseOrFindLocation(
  locationInput,
  placesService: MigrationPlacesService,
  findPlaceFromQueryFields: string[],
) {
  // The locationInput can be either a string to be geocoded, a Place, LatLng or LatLngLiteral
  // For query or placeId, we will need to perform a request to figure out the location.
  // Otherwise, for LatLng|LatLngLiteral we can just parse it.
  return new Promise((resolve, reject) => {
    // For a query, we use findPlaceFromQuery to retrieve the location
    if (typeof locationInput === "string" || typeof locationInput?.query === "string") {
      const query = locationInput?.query || locationInput;

      const findPlaceFromQueryRequest = {
        query: query,
        fields: findPlaceFromQueryFields,
      };

      placesService.findPlaceFromQuery(findPlaceFromQueryRequest, (results, status) => {
        if (status === PlacesServiceStatus.OK && results.length) {
          const locationLatLng = results[0].geometry.location;
          const position = [locationLatLng.lng(), locationLatLng.lat()];

          resolve({
            locationLatLng: locationLatLng,
            position: position,
            place_id: results[0].place_id,
            types: results[0].types,
            formatted_address: results[0].formatted_address,
          });
        } else {
          reject({});
        }
      });
    } else if (typeof locationInput?.placeId === "string") {
      // For a Place object with placeId, we use getDetails to retrieve the location
      const getDetailsRequest = {
        placeId: locationInput.placeId,
      };

      placesService.getDetails(getDetailsRequest, function (result, status) {
        if (status === PlacesServiceStatus.OK) {
          const locationLatLng = result.geometry.location;
          const position = [locationLatLng.lng(), locationLatLng.lat()];

          resolve({
            locationLatLng: locationLatLng,
            position: position,
            place_id: locationInput?.placeId,
            types: result.types,
            formatted_address: result.formatted_address,
          });
        } else {
          reject({});
        }
      });
    } else {
      // Otherwise, it's a LatLng|LatLngLiteral (explicitly or as Place.location)
      const latLngOrLiteral = locationInput?.location || locationInput;
      const latLng = new MigrationLatLng(latLngOrLiteral);

      resolve({
        locationLatLng: latLng,
        position: [latLng.lng(), latLng.lat()],
      });
    }
  });
}

export function formatSecondsAsGoogleDurationText(seconds) {
  // convert seconds to days, hours, and minutes, rounding up to whole minutes
  const days = Math.floor(seconds / 86400); // 1 day = 86400 seconds
  const remainingSeconds = seconds % 86400;
  const hours = Math.floor(remainingSeconds / 3600);
  const remainingMinuteSeconds = remainingSeconds % 3600;
  const minutes = Math.ceil(remainingMinuteSeconds / 60);

  // take care of the "1 day", "1 hour", or "1 min" edge case
  const dayString = days > 0 ? `${days === 1 ? `${days} day` : `${days} days`}` : "";
  const hourString = hours > 0 ? `${hours === 1 ? `${hours} hour` : `${hours} hours`}` : "";
  const minuteString = minutes > 0 ? `${minutes === 1 ? `${minutes} min` : `${minutes} mins`}` : "";

  // return day, hour, and minute strings only if they are set
  const parts = [dayString, hourString, minuteString].filter((str) => str !== "");
  return parts.join(" ");
}

export function convertKilometersToGoogleDistanceText(kilometers, options) {
  return "unitSystem" in options && options.unitSystem == UnitSystem.IMPERIAL
    ? kilometers * KILOMETERS_TO_MILES_CONSTANT + " mi"
    : kilometers + " km";
}
