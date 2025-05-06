// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GetPlaceCommand as GetPlaceCommandV1,
  GetPlaceRequest as GetPlaceRequestV1,
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForTextRequest,
} from "@aws-sdk/client-location";

import { GeoPlacesClient, SearchNearbyCommand, SearchNearbyRequest } from "@aws-sdk/client-geo-places";

import {
  LatLngToLngLat,
  MigrationCircle,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
} from "../common";
import { AddressComponent } from "./defines";
import { convertPlaceOpeningHoursToOpeningHours } from "./opening_hours";
import {
  convertAmazonPlaceToGoogle,
  convertGeocoderAddressComponentToAddressComponent,
  convertPlacePlusCodeToPlusCode,
  PlaceResult,
} from "./place_conversion";
import { getAllAmazonPlaceTypesFromGoogle } from "./place_types";

// This helper is for converting an Amazon Place V1 object to a new Google Place class
// TODO: Remove this method once we have migrated away from all V1 client SDK usage
const convertAmazonPlaceToGoogleNewPlaceV1 = (amazonPlaceObject, fields, googlePlace?: MigrationPlace | null) => {
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

// Helper to convert Google's PlaceResult (https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/places-service#PlaceResult)
// for which we have extensive parsing logic to convert from our Amazon Place responses in convertAmazonPlaceToGoogle
// to Google's new Place object (https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place)
const convertGooglePlaceToGoogleNewPlace = (place: PlaceResult, newPlace?: MigrationPlace | null) => {
  // If a newPlace object wasn't passed in, then create a new one
  if (!newPlace) {
    newPlace = new MigrationPlace({
      id: place.place_id,
    });
  }

  // Parse the PlaceResult properties into our Place properties
  newPlace.addressComponents = convertGeocoderAddressComponentToAddressComponent(place.address_components);
  newPlace.adrFormatAddress = place.adr_address;
  newPlace.displayName = place.name;
  newPlace.formattedAddress = place.formatted_address;
  newPlace.internationalPhoneNumber = place.international_phone_number;
  newPlace.location = place.geometry?.location;
  newPlace.nationalPhoneNumber = place.formatted_phone_number;
  newPlace.openingHours = convertPlaceOpeningHoursToOpeningHours(place.opening_hours);
  newPlace.plusCode = convertPlacePlusCodeToPlusCode(place.plus_code);
  newPlace.regularOpeningHours = newPlace.openingHours;
  newPlace.types = place.types;
  newPlace.utcOffsetMinutes = place.utc_offset_minutes;
  newPlace.viewport = place.geometry?.viewport;
  newPlace.websiteURI = place.website;

  return newPlace;
};

export class MigrationPlace implements google.maps.places.Place {
  static _clientV1: LocationClient; // This will be populated by the top level module that creates our location client
  static _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
  static _client: GeoPlacesClient; // This will be populated by the top level module that creates our location client

  accessibilityOptions?: google.maps.places.AccessibilityOptions | null;
  addressComponents?: AddressComponent[];
  adrFormatAddress?: string | null;
  allowsDogs?: boolean | null;
  attributions?: google.maps.places.Attribution[];
  businessStatus?: google.maps.places.BusinessStatus | null;
  displayName?: string | null;
  displayNameLanguageCode?: string | null;
  editorialSummary?: string | null;
  editorialSummaryLanguageCode?: string | null;
  evChargeOptions?: google.maps.places.EVChargeOptions | null;
  formattedAddress?: string | null;
  fuelOptions?: google.maps.places.FuelOptions | null;
  googleMapsURI?: string | null;
  hasCurbsidePickup?: boolean | null;
  hasDelivery?: boolean | null;
  hasDineIn?: boolean | null;
  hasLiveMusic?: boolean | null;
  hasMenuForChildren?: boolean | null;
  hasOutdoorSeating?: boolean | null;
  hasRestroom?: boolean | null;
  hasTakeout?: boolean | null;
  hasWiFi?: boolean | null;
  iconBackgroundColor?: string | null;
  id: string;
  internationalPhoneNumber?: string | null;
  isGoodForChildren?: boolean | null;
  isGoodForGroups?: boolean | null;
  isGoodForWatchingSports?: boolean | null;
  isReservable?: boolean | null;
  location?: google.maps.LatLng | null;
  nationalPhoneNumber?: string | null;
  openingHours?: google.maps.places.OpeningHours | null;
  parkingOptions?: google.maps.places.ParkingOptions | null;
  paymentOptions?: google.maps.places.PaymentOptions | null;
  photos?: google.maps.places.Photo[];
  plusCode?: google.maps.places.PlusCode | null;
  priceLevel?: google.maps.places.PriceLevel | null;
  primaryType?: string | null;
  primaryTypeDisplayName?: string | null;
  primaryTypeDisplayNameLanguageCode?: string | null;
  rating?: number | null;
  regularOpeningHours?: google.maps.places.OpeningHours | null;
  requestedLanguage?: string | null;
  requestedRegion?: string | null;
  reviews?: google.maps.places.Review[];
  servesBeer?: boolean | null;
  servesBreakfast?: boolean | null;
  servesBrunch?: boolean | null;
  servesCocktails?: boolean | null;
  servesCoffee?: boolean | null;
  servesDessert?: boolean | null;
  servesDinner?: boolean | null;
  servesLunch?: boolean | null;
  servesVegetarianFood?: boolean | null;
  servesWine?: boolean | null;
  svgIconMaskURI?: string | null;
  types?: string[];
  userRatingCount?: number | null;
  utcOffsetMinutes?: number | null;
  viewport?: google.maps.LatLngBounds | null;
  websiteURI?: string | null;

  constructor(options: google.maps.places.PlaceOptions) {
    this.id = options.id;

    if (options.requestedLanguage) {
      this.requestedLanguage = options.requestedLanguage;
    }
    if (options.requestedRegion) {
      this.requestedRegion = options.requestedRegion;
    }
  }

  // TODO: Not yet implemented
  getNextOpeningTime(date?: Date): Promise<Date | undefined> {
    return undefined;
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

      MigrationPlace._clientV1
        .send(command)
        .then((response) => {
          const place = response.Place;

          // Pass in this reference so it will get updated, but we also return it as well
          const newPlace = convertAmazonPlaceToGoogleNewPlaceV1({ Place: place, PlaceId: placeId }, fields, this);

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

  // TODO: Not yet implemented
  isOpen(date?: Date): Promise<boolean | undefined> {
    return undefined;
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

      MigrationPlace._clientV1
        .send(command)
        .then((response) => {
          const googlePlaces = [];

          const results = response.Results;
          if (results.length !== 0) {
            results.forEach(function (place) {
              const newPlace = convertAmazonPlaceToGoogleNewPlaceV1(place, fields);

              // Set the requested language/region on the new Place if they had been specified in this search
              if (language) {
                newPlace.requestedLanguage = language;
              }

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

  // https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.searchNearby
  public static searchNearby(
    request: google.maps.places.SearchNearbyRequest,
  ): Promise<{ places: google.maps.places.Place[] }> {
    const locationRestriction = request.locationRestriction; // required
    const fields = request.fields; // required for searchNearby, but not other requests
    const language = request.language; // optional
    const region = request.region; // optional
    const maxResultCount = request.maxResultCount; // optional
    const includedTypes = request.includedTypes; // optional
    const excludedTypes = request.excludedTypes; // optional

    // locationRestriction is google.maps.Circle | google.maps.CircleLiteral
    const circle = new MigrationCircle(locationRestriction);
    const center = circle.getCenter();
    const centerLngLat = LatLngToLngLat(center);
    const radius = circle.getRadius();

    const input: SearchNearbyRequest = {
      QueryPosition: centerLngLat,
      QueryRadius: radius,
      AdditionalFeatures: ["Contact", "TimeZone"], // "Contact" is needed for contact details and opening hours, "TimeZone" is needed for place's time zone
    };

    if (language) {
      input.Language = language;
    }

    if (maxResultCount) {
      input.MaxResults = maxResultCount;
    }

    if (includedTypes) {
      const categories = includedTypes.flatMap((type) => {
        return getAllAmazonPlaceTypesFromGoogle(type);
      });

      input.Filter = {
        IncludeCategories: categories,
      };
    }

    if (excludedTypes) {
      const categories = excludedTypes.flatMap((type) => {
        return getAllAmazonPlaceTypesFromGoogle(type);
      });

      input.Filter = {
        ExcludeCategories: categories,
      };
    }

    return new Promise((resolve, reject) => {
      const command = new SearchNearbyCommand(input);

      MigrationPlace._client
        .send(command)
        .then((response) => {
          const googlePlaces = [];

          const results = response.ResultItems;
          if (results.length !== 0) {
            results.forEach(function (place) {
              // Parse the Amazon Place result to our google PlaceResult
              const googlePlace = convertAmazonPlaceToGoogle(place, fields, true);

              // Then, convert Google PlaceResult to new places Place instance.
              // They are similar, but new places has a concrete Place class with property names that
              // are slightly different (e.g. formattedAddress vs. formatted_address)
              const newPlace = convertGooglePlaceToGoogleNewPlace(googlePlace);

              // Set the requested language/region on the new Place if they had been specified in this search
              if (language) {
                newPlace.requestedLanguage = language;
              }
              if (region) {
                newPlace.requestedRegion = region;
              }

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
