// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationLatLng, PlacesServiceStatus } from "../common";
import { MigrationPlacesService } from "../places";
import * as turf from "@turf/turf";
import { UnitSystem } from "./defines";
import { usaGeoJson } from "./country_geojson/usa";
import { myanmarGeoJson } from "./country_geojson/myanmar";
import { liberiaGeoJson } from "./country_geojson/liberia";
import { Position } from "geojson";
import { CalculateRouteMatrixRequest, CalculateRoutesRequest } from "@aws-sdk/client-geo-routes";
import { GeoPlacesClient, ReverseGeocodeCommand, ReverseGeocodeRequest } from "@aws-sdk/client-geo-places";
import { CountryGeoJSON } from "./country_geojson/countryType";

type TurfPolygon = ReturnType<typeof turf.polygon>;

const KILOMETERS_TO_MILES_CONSTANT = 0.621371;
const FEET_TO_MILES_CONSTANT = 5280; // 1 mile is 5,280 feet or 1.60934 kilometres

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

/**
 * Populates avoidance options for Amazon Location Service routes based on Google Maps API request.
 *
 * This function takes a Google Maps Distance Matrix or Directions request and populates the corresponding Amazon
 * Location Service avoidance options in the input object.
 *
 * Avoidance options include:
 *
 * - Toll roads and transponders (if avoidTolls is true)
 * - Ferries (if avoidFerries is true)
 * - Controlled access highways (if avoidHighways is true)
 *
 * The function modifies the input object in-place, adding or updating the Avoid property.
 *
 * @param request - Google Maps API request object (DistanceMatrix or Directions)
 * @param input - Amazon Location Service request object to be populated
 */
export function populateAvoidOptions(
  request: google.maps.DistanceMatrixRequest | google.maps.DirectionsRequest,
  input: CalculateRouteMatrixRequest | CalculateRoutesRequest,
) {
  if (request.avoidTolls) {
    input.Avoid = {
      TollRoads: true,
      TollTransponders: true,
    };
  }

  if (request.avoidFerries) {
    input.Avoid = {
      ...input.Avoid,
      Ferries: true,
    };
  }

  if (request.avoidHighways) {
    input.Avoid = {
      ...input.Avoid,
      ControlledAccessHighways: true,
    };
  }
}

/**
 * Gets formatted addresses for an array of coordinate positions using reverse geocoding.
 *
 * @param client - GeoPlacesClient instance for reverse geocoding
 * @param positions - Array of [longitude, latitude] coordinates
 * @param callback - Function to receive the array of formatted addresses
 */
export function getReverseGeocodedAddresses(
  client: GeoPlacesClient,
  positions: number[][],
  callback: (addresses: string[]) => void,
) {
  if (positions.length === 0) {
    callback([]);
    return;
  }

  const geocodingPromises = positions.map((position) => {
    const request: ReverseGeocodeRequest = {
      QueryPosition: position,
    };
    const command = new ReverseGeocodeCommand(request);

    return client
      .send(command)
      .then((response) => response.ResultItems?.[0]?.Address?.Label || "")
      .catch((error) => {
        console.error("Error reverse geocoding position:", error);
        return "";
      });
  });

  Promise.all(geocodingPromises)
    .then((addresses) => callback(addresses))
    .catch((error) => {
      console.error("Error in reverse geocoding:", error);
      callback(new Array(positions.length).fill(""));
    });
}

/**
 * Creates Turf.js polygons from GeoJSON feature collection, handling both Polygon and MultiPolygon
 *
 * @param geojson - GeoJSON FeatureCollection containing country boundaries
 * @returns Array of Turf.js polygon features
 */
export function createPolygons(geojson: CountryGeoJSON): TurfPolygon[] {
  if (!geojson?.features) return [];

  return geojson.features.reduce((polygons: TurfPolygon[], feature) => {
    try {
      if (feature.geometry.type === "Polygon") {
        polygons.push(turf.polygon(feature.geometry.coordinates as Position[][]));
      } else if (feature.geometry.type === "MultiPolygon") {
        const multiCoords = feature.geometry.coordinates as Position[][][];
        multiCoords.forEach((polygonCoords) => {
          polygons.push(turf.polygon(polygonCoords));
        });
      }
    } catch (error) {
      console.error("Error creating polygon:", error);
    }
    return polygons;
  }, []);
}

// Initialize country polygons once
const usaPolygons = createPolygons(usaGeoJson as CountryGeoJSON);
const myanmarPolygons = createPolygons(myanmarGeoJson as CountryGeoJSON);
const liberiaPolygons = createPolygons(liberiaGeoJson as CountryGeoJSON);

/**
 * Determines if a point is within any polygon in the given array
 *
 * @param point - Turf.js point feature
 * @param polygons - Array of Turf.js polygon features
 * @returns Boolean indicating if point is within any polygon
 */
export function isPointInPolygons(point: number[], polygons: TurfPolygon[]): boolean {
  if (!point || polygons.length === 0) return false;
  // Check all polygons for point to be in any of them
  return polygons.some((polygon) => polygon && turf.booleanPointInPolygon(point, polygon));
}

/**
 * Determines the appropriate unit system based on the country of the provided coordinates. Returns UnitSystem.IMPERIAL
 * for addresses in US, Liberia, and Myanmar, and UnitSystem.METRIC for all other countries.
 *
 * @param options - Object containing unitSystem preference
 * @param originPoint - LatLong values as number[] containing location information
 * @returns UnitSystem.IMPERIAL if location is in USA, Myanmar, or Liberia; UnitSystem.METRIC otherwise
 */
export function getUnitSystem(
  options: google.maps.DirectionsRequest | google.maps.DistanceMatrixRequest,
  originPoint: number[],
): UnitSystem {
  if (!options) {
    return UnitSystem.METRIC;
  }

  if (options?.unitSystem !== undefined) {
    return options.unitSystem;
  }

  // We do not need to flip these coordinates since originPoint is already in Lng Lat format
  const flag = isPointInImperialCountry(originPoint);
  return flag ? UnitSystem.IMPERIAL : UnitSystem.METRIC;
}

/**
 * Determines if a point is within any of the imperial unit system countries
 *
 * @param coordinates - [longitude, latitude] array
 * @returns Boolean indicating if point is within an imperial unit system country
 */
export function isPointInImperialCountry(coordinates: number[]): boolean {
  return (
    isPointInPolygons(coordinates, usaPolygons) ||
    isPointInPolygons(coordinates, myanmarPolygons) ||
    isPointInPolygons(coordinates, liberiaPolygons)
  );
}

/**
 * Formats a distance value based on the specified unit system (metric or imperial).
 *
 * Metric formatting rules:
 *
 * 1. < 1 km: Format in meters, rounded to nearest meter ("750 m")
 * 2. 1 km to 999 km: Format in km with one decimal place ("12.5 km", "542.0 km")
 * 3. > = 1000 km: Format in km with no decimal places and thousands separator ("1,234 km")
 *
 * Imperial formatting rules:
 *
 * 1. < 0.1 miles: Format in feet, rounded to nearest foot ("528 ft")
 * 2. 0.1 miles to 999 miles: Format in miles with one decimal place ("0.5 mi", "12.0 mi", "542.0 mi")
 * 3. > = 1000 miles: Format in miles with no decimal places and thousands separator ("1,234 mi")
 *
 * @param meters - The distance in meters
 * @param unitSystem - UnitSystem preference
 * @returns Formatted distance string with unit suffix
 */
export function formatDistanceBasedOnUnitSystem(meters: number, unitSystem: UnitSystem): string {
  const kilometers = meters / 1000;

  if (unitSystem === UnitSystem.IMPERIAL) {
    const miles = kilometers * KILOMETERS_TO_MILES_CONSTANT;
    return formatImperialDistance(miles);
  }
  return formatMetricDistance(kilometers, meters);
}

function formatImperialDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * FEET_TO_MILES_CONSTANT)} ft`;
  if (miles < 1000) return `${numberFormatter.format(miles)} mi`;
  return `${largeNumberFormatter.format(miles)} mi`;
}

function formatMetricDistance(km: number, meters: number): string {
  if (km < 1) return `${Math.round(meters)} m`;
  if (km < 1000) return `${numberFormatter.format(km)} km`;
  return `${largeNumberFormatter.format(km)} km`;
}

// pre-configured formatter for numbers that may have 1 decimal place
export const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// pre-configured formatter for large numbers with thousands separators and no decimals
export const largeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  useGrouping: true,
});
