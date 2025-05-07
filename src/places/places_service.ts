// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GeoPlacesClient,
  GetPlaceCommand,
  GetPlaceRequest,
  SearchNearbyCommand,
  SearchNearbyRequest,
  SearchTextCommand,
  SearchTextRequest,
} from "@aws-sdk/client-geo-places";

import {
  LatLngToLngLat,
  MigrationCircle,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
} from "../common";
import { convertAmazonPlaceToGoogle } from "./place_conversion";
import { getAllAmazonPlaceTypesFromGoogle } from "./place_types";

class MigrationPlacesService {
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our location client

  findPlaceFromQuery(request: google.maps.places.FindPlaceFromQueryRequest, callback) {
    const query = request.query;
    const fields = request.fields;
    const locationBias = request.locationBias; // optional
    const language = request.language; // optional

    const input: SearchTextRequest = {
      QueryText: query, // required
      MaxResults: 10, // findPlaceFromQuery usually returns a single result
      AdditionalFeatures: ["Contact", "TimeZone"], // "Contact" is needed for contact details and opening hours, "TimeZone" is needed for place's time zone
    };

    // Determine the locationBias, which can be passed in as:
    // google.maps.LatLng
    // | google.maps.LatLngLiteral
    // | google.maps.LatLngBounds
    // | google.maps.LatLngBoundsLiteral
    // | google.maps.Circle
    // | google.maps.CircleLiteral
    if (locationBias) {
      if (
        locationBias instanceof MigrationLatLng ||
        (Object.prototype.hasOwnProperty.call(locationBias, "lat") &&
          Object.prototype.hasOwnProperty.call(locationBias, "lng"))
      ) {
        const lngLat = LatLngToLngLat(locationBias);
        if (lngLat) {
          input.BiasPosition = lngLat;
        }
      } else if (
        locationBias instanceof MigrationLatLngBounds ||
        (Object.prototype.hasOwnProperty.call(locationBias, "west") &&
          Object.prototype.hasOwnProperty.call(locationBias, "south") &&
          Object.prototype.hasOwnProperty.call(locationBias, "east") &&
          Object.prototype.hasOwnProperty.call(locationBias, "north"))
      ) {
        const latLngBounds = new MigrationLatLngBounds(
          locationBias as google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral,
        );
        const southWest = latLngBounds.getSouthWest();
        const northEast = latLngBounds.getNorthEast();

        input.Filter = {
          BoundingBox: [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()],
        };
      } else {
        // Last case is google.maps.Circle | google.maps.CircleLiteral
        const circle = new MigrationCircle(locationBias as google.maps.Circle | google.maps.CircleLiteral);

        const lngLat = LatLngToLngLat(circle.getCenter());
        if (lngLat) {
          input.Filter = {
            Circle: {
              Center: lngLat,
              Radius: circle.getRadius(),
            },
          };
        }
      }
    } else {
      // SearchTextCommand expects either a BiasPosition or Filter, so if no locationBias is specified,
      // then we use a world bounding box as a filter.
      // TODO: The default should be IP_BIAS, but this isn't currently supported
      input.Filter = {
        BoundingBox: [-180, -90, 180, 90],
      };
    }

    if (language) {
      input.Language = language;
    }

    const command = new SearchTextCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.ResultItems;
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
      PlaceId: placeId, // required
      AdditionalFeatures: ["Contact", "TimeZone"], // "Contact" is needed for contact details and opening hours, "TimeZone" is needed for place's time zone
    };

    const command = new GetPlaceCommand(input);
    this._client
      .send(command)
      .then((response) => {
        const googlePlace = convertAmazonPlaceToGoogle(response, fields, true);

        callback(googlePlace, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback(null, PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }

  nearbySearch(request: google.maps.places.PlaceSearchRequest, callback) {
    const bounds = request.bounds; // optional
    const language = request.language; // optional
    let locationBias = request.location; // optional
    const openNow = request.openNow; // optional
    const radius = request.radius; // optional
    const type = request.type; // optional

    // SearchNearbyRequest requires a QueryPosition, so if bounds was specified then we will use
    // its center as the QueryPosition
    let boundingBox;
    if (bounds) {
      const latLngBounds = new MigrationLatLngBounds(bounds);
      const southWest = latLngBounds.getSouthWest();
      const northEast = latLngBounds.getNorthEast();

      locationBias = latLngBounds.getCenter();
      boundingBox = [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()];
    }

    // Convert our location into queryPosition [lng, lat]
    let queryPosition;
    if (locationBias) {
      queryPosition = LatLngToLngLat(locationBias);
    }

    const input: SearchNearbyRequest = {
      QueryPosition: queryPosition,
      AdditionalFeatures: ["Contact"], // Without this, opening hours will be missing
    };

    // If bounds was specified, then the radius will be ignored
    if (boundingBox) {
      input.Filter = {
        BoundingBox: boundingBox,
      };
    } else if (radius) {
      input.QueryRadius = radius; // Radius is in meters for both Amazon and Google
    }

    // For the category place type filter, we use getAllAmazonPlaceTypesFromGoogle because there could be
    // multiple Amazon place type matches for a single Google place type, e.g.
    //      Google          Amazon
    //      ----------      --------------------
    //      campground      campground, campsite
    //      restaurant      restaurant, casual_dining, fine_dining
    if (type) {
      // Create the Filter sub object only if it hadn't been created already from adding a BoundingBox
      input.Filter ??= {};

      input.Filter.IncludeCategories = getAllAmazonPlaceTypesFromGoogle(type);
    }

    if (language) {
      input.Language = language;
    }

    const command = new SearchNearbyCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.ResultItems;
        if (results.length !== 0) {
          results.forEach(function (amazonPlace) {
            // Include all supported fields, including detailed fields
            const place = convertAmazonPlaceToGoogle(amazonPlace, ["ALL"], true);

            // Omit any places that are currently closed if openNow was specified
            if (openNow && place.opening_hours && !place.opening_hours?.open_now) {
              return;
            }

            googleResults.push(place);
          });
        }

        callback(googleResults, PlacesServiceStatus.OK);
      })
      .catch((error) => {
        console.error(error);

        callback([], PlacesServiceStatus.UNKNOWN_ERROR);
      });
  }

  textSearch(request: google.maps.places.TextSearchRequest, callback) {
    const query = request.query; // optional
    const locationBias = request.location; // optional
    const radius = request.radius; // optional
    const bounds = request.bounds; // optional
    const language = request.language; // optional
    const region = request.region; // optional

    const input: SearchTextRequest = {
      QueryText: query, // required
      AdditionalFeatures: ["Contact", "TimeZone"], // "Contact" is needed for contact details and opening hours, "TimeZone" is needed for place's time zone
    };

    // If bounds is specified, then location bias is ignored
    if (bounds) {
      const latLngBounds = new MigrationLatLngBounds(bounds);
      const southWest = latLngBounds.getSouthWest();
      const northEast = latLngBounds.getNorthEast();

      input.Filter = {
        BoundingBox: [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()],
      };
    } else if (locationBias) {
      // If we have a location and a radius, then we will use a circle
      // Otherwise, just the location will be used
      const lngLat = LatLngToLngLat(locationBias);
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
    } else {
      // SearchTextCommand expects either a BiasPosition or Filter, so if no locationBias is specified,
      // then we use a world bounding box as a filter.
      // TODO: The default should be IP_BIAS, but this isn't currently supported
      input.Filter = {
        BoundingBox: [-180, -90, 180, 90],
      };
    }

    if (language) {
      input.Language = language;
    }

    if (region) {
      input.Filter = {
        IncludeCountries: [region],
      };
    }

    const command = new SearchTextCommand(input);

    this._client
      .send(command)
      .then((response) => {
        const googleResults = [];

        const results = response.ResultItems;
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

export { MigrationPlacesService };
