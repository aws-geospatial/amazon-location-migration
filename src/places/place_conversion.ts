// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetPlaceResponse, SearchTextResultItem } from "@aws-sdk/client-geo-places";

import parsePhoneNumber from "libphonenumber-js";

import { OpenLocationCode } from "open-location-code";

import { MigrationLatLng, MigrationLatLngBounds } from "../common";
import { AddressComponent, PlusCode } from "./defines";
import { convertAmazonPlaceTypeToGoogle } from "./place_types";
import { convertAmazonOpeningHoursToGoogle } from "./opening_hours";

// We keep our own interface of this to remain backwards comaptabile
// with older Google Maps APIs (e.g. the reference field was removed in later versions after being deprecated)
interface PlaceResult {
  address_components?: google.maps.GeocoderAddressComponent[];
  adr_address?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  geometry?: google.maps.places.PlaceGeometry;
  html_attributions?: string[];
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  international_phone_number?: string;
  name?: string;
  opening_hours?: google.maps.places.PlaceOpeningHours;
  place_id?: string;
  plus_code?: google.maps.places.PlacePlusCode;
  price_level?: number;
  reference?: string;
  types?: string[];
  url?: string;
  utc_offset?: number;
  utc_offset_minutes?: number;
  vicinity?: string;
  website?: string;
}

const convertGeocoderAddressComponentToAddressComponent = (
  addressComponents: google.maps.GeocoderAddressComponent[] | null,
): AddressComponent[] => {
  if (!addressComponents) {
    return [];
  }

  return addressComponents.map((addressComponent): AddressComponent => {
    return {
      longText: addressComponent.long_name,
      shortText: addressComponent.short_name,
      types: addressComponent.types,
    };
  });
};

const convertPlacePlusCodeToPlusCode = (plusCode: google.maps.places.PlacePlusCode | null): PlusCode | null => {
  if (!plusCode) {
    return null;
  }

  return {
    compoundCode: plusCode.compound_code,
    globalCode: plusCode.global_code,
  };
};

const convertAmazonCategoriesToGoogle = (place: GetPlaceResponse | SearchTextResultItem) => {
  let googleTypes = [];
  switch (place.PlaceType) {
    case "Country":
      googleTypes = ["country", "political"];
      break;

    case "Region":
      googleTypes = ["administrative_area_level_1", "political"];
      break;

    case "SubRegion":
      googleTypes = ["administrative_area_level_2", "political"];
      break;

    case "Locality":
      googleTypes = ["locality", "political"];
      break;

    case "PostalCode":
      googleTypes = ["postal_code"];
      break;

    case "District":
      googleTypes = ["neighborhood", "political"];
      break;

    case "Street":
      googleTypes = ["route"];
      break;

    case "PointAddress":
      googleTypes = ["premise"];
      break;

    case "PointOfInterest":
      if (place.Categories) {
        googleTypes = ["point_of_interest"];

        place.Categories.forEach((category) => {
          const googleType = convertAmazonPlaceTypeToGoogle(category.Id);
          if (googleType) {
            googleTypes.push(googleType);
          }
        });
      }
      break;
  }

  return googleTypes;
};

const convertAmazonPlaceToGoogle = (
  place: GetPlaceResponse | SearchTextResultItem,
  fields,
  includeDetailFields,
): PlaceResult => {
  const googlePlace: PlaceResult = {};

  // For findPlaceFromQuery, the fields are required.
  // But for getDetails, they are optional, and if they aren't specified
  // then it is the same as requesting all fields.
  let includeAllFields = false;
  if (!fields || fields.includes("ALL") || fields.includes("*")) {
    includeAllFields = true;
  }

  if (includeAllFields || fields.includes("formatted_address")) {
    googlePlace.formatted_address = place.Address.Label;
  }

  if (
    includeAllFields ||
    fields.includes("geometry") ||
    fields.includes("geometry.location") ||
    fields.includes("geometry.viewport")
  ) {
    const point = place.Position;
    googlePlace.geometry = {
      location: new MigrationLatLng(point[1], point[0]),
    };

    // Parse the mapView as the viewport, but it's not always available
    if (place.MapView) {
      const mapView = place.MapView;
      const southWest = new MigrationLatLng(mapView[1], mapView[0]);
      const northEast = new MigrationLatLng(mapView[3], mapView[2]);

      googlePlace.geometry.viewport = new MigrationLatLngBounds(southWest, northEast);
    }
  }

  if (includeAllFields || fields.includes("name")) {
    googlePlace.name = place.Title;
  }

  if (includeAllFields || fields.includes("opening_hours")) {
    const openingHours = convertAmazonOpeningHoursToGoogle(place.OpeningHours, place.TimeZone);
    if (openingHours) {
      googlePlace.opening_hours = openingHours;
    }
  }

  // Always include the PlaceId (if it exists)
  googlePlace.place_id = place.PlaceId;

  if (includeAllFields || fields.includes("plus_code")) {
    // Calculate the Open Location Code/plus code https://plus.codes/
    const openLocationCode = new OpenLocationCode();
    const point = place.Position;
    const plusCode = openLocationCode.encode(point[1], point[0]);
    googlePlace.plus_code = {
      global_code: plusCode,
    };

    // If this POI has a locality, we will also included the shortened compound code
    // The compound code has the format: "<SHORT CODE> <LOCALITY>, <REGION>"
    if (place.Address && place.Address.Locality) {
      const locality = place.Address.Locality;

      // Remove the first 4 characters from the full plus code for the compound code
      const shortCode = plusCode.substring(4);

      // In the US, the region (state) is used, otherwise the country name is used
      let region: string;
      if (place.Address.Country.Code2 && place.Address.Country.Code2 == "US") {
        region = place.Address.Region.Name;
      } else {
        region = place.Address.Country.Name;
      }

      const compoundCode = `${shortCode} ${locality}, ${region}`;
      googlePlace.plus_code.compound_code = compoundCode;
    }
  }

  if (includeAllFields || fields.includes("reference")) {
    googlePlace.reference = place.PlaceId;
  }

  // Needed for MigrationDirectionsService.route method's response field "geocoded_waypoints"
  // which needs DirectionsGeocodedWaypoint objects that have property "type" which is the
  // equivalent of Amazon Location's "Categories" property
  if (includeAllFields || fields.includes("types")) {
    googlePlace.types = convertAmazonCategoriesToGoogle(place);
  }

  // Handle additional fields for getDetails request
  if (includeDetailFields) {
    if (includeAllFields || fields.includes("address_components")) {
      const addressComponents: google.maps.GeocoderAddressComponent[] = [];

      if (place.Address?.AddressNumber) {
        const addressNumber = place.Address.AddressNumber;
        addressComponents.push({
          long_name: addressNumber,
          short_name: addressNumber,
          types: ["street_number"],
        });
      }

      if (place.Address?.Street) {
        const streetName = place.Address.Street;
        addressComponents.push({
          long_name: streetName,
          short_name: streetName,
          types: ["route"],
        });
      }

      if (place.Address?.District) {
        const district = place.Address.District;
        addressComponents.push({
          long_name: district,
          short_name: district,
          types: ["neighborhood", "political"],
        });
      }

      if (place.Address?.Locality) {
        const locality = place.Address.Locality;
        addressComponents.push({
          long_name: locality,
          short_name: locality,
          types: ["locality", "political"],
        });
      }

      // If SubRegion is valid, it will have either a Name or Code (or both), so need to handle all cases
      if (place.Address?.SubRegion) {
        const subRegion = place.Address.SubRegion;
        addressComponents.push({
          long_name: subRegion.Name ? subRegion.Name : subRegion.Code,
          short_name: subRegion.Code ? subRegion.Code : subRegion.Name,
          types: ["administrative_area_level_2", "political"],
        });
      }

      // If Region is valid, it will have either a Name or Code (or both), so need to handle all cases
      if (place.Address?.Region) {
        const region = place.Address.Region;
        addressComponents.push({
          long_name: region.Name ? region.Name : region.Code,
          short_name: region.Code ? region.Code : region.Name,
          types: ["administrative_area_level_1", "political"],
        });
      }

      // If Country is valid, it will have either a Name or Code2 (or both), so need to handle all cases
      if (place.Address?.Country) {
        const country = place.Address.Country;
        addressComponents.push({
          long_name: country.Name ? country.Name : country.Code2,
          short_name: country.Code2 ? country.Code2 : country.Name,
          types: ["country", "political"],
        });
      }

      if (place.Address?.PostalCode) {
        const postalCode = place.Address.PostalCode;
        addressComponents.push({
          long_name: postalCode,
          short_name: postalCode,
          types: ["postal_code"],
        });
      }

      googlePlace.address_components = addressComponents;
    }

    // Representation of address in adr microformat (https://microformats.org/wiki/adr)
    if (includeAllFields || fields.includes("adr_address")) {
      const adrAddressParts: string[] = [];
      const getAdrSpan = (className, value) => {
        return `<span class="${className}">${value}</span>`;
      };

      if (place.Address?.Street) {
        let streetAddress = place.Address.Street;

        if (place.Address.AddressNumber) {
          streetAddress = `${place.Address.AddressNumber} ${streetAddress}`;
        }

        adrAddressParts.push(getAdrSpan("street-address", streetAddress));
      }

      if (place.Address?.Locality) {
        const locality = place.Address.Locality;

        adrAddressParts.push(getAdrSpan("locality", locality));
      }

      if (place.Address?.Region) {
        const region = place.Address.Region;

        // Prefer region code (if there is one) over the full name
        const regionName = region.Code ? region.Code : region.Name;

        adrAddressParts.push(getAdrSpan("region", regionName));
      }

      if (place.Address?.PostalCode) {
        const postalCode = place.Address.PostalCode;

        adrAddressParts.push(getAdrSpan("postal-code", postalCode));
      }

      if (place.Address?.Country?.Name) {
        let countryName = place.Address.Country.Name;

        // If the country name has a space in it, use the Code3 instead (if there is one)
        // since the adr microformat prefers the shorter representation
        if (countryName.includes(" ") && place.Address.Country.Code3) {
          countryName = place.Address.Country.Code3;
        }

        adrAddressParts.push(getAdrSpan("country-name", countryName));
      }

      googlePlace.adr_address = adrAddressParts.join(", ");
    }

    // Use libphonenumber-js for being able to format the phone number as local vs. international
    if (place.Contacts?.Phones) {
      const phoneNumbers = place.Contacts.Phones;
      if (phoneNumbers.length > 0) {
        const phoneNumberString = phoneNumbers[0].Value;
        const phoneNumber = parsePhoneNumber(phoneNumberString, "US");

        if (includeAllFields || fields.includes("formatted_phone_number")) {
          googlePlace.formatted_phone_number = phoneNumber.formatNational();
        }

        if (includeAllFields || fields.includes("international_phone_number")) {
          googlePlace.international_phone_number = phoneNumber.formatInternational();
        }
      }
    }

    // Our time zone offset is given in seconds, but Google's uses minutes
    // Google's utc_offset field is deprecated in favor of utc_offset_minutes,
    // but they still support it so we support both
    let timeZoneOffsetInMinutes;
    if (place.TimeZone) {
      timeZoneOffsetInMinutes = place.TimeZone.OffsetSeconds / 60;
    }
    if (includeAllFields || fields.includes("utc_offset")) {
      googlePlace.utc_offset = timeZoneOffsetInMinutes;
    }
    if (includeAllFields || fields.includes("utc_offset_minutes")) {
      googlePlace.utc_offset_minutes = timeZoneOffsetInMinutes;
    }

    // vicinity is in the format of "AddressNumber Street, Locality",
    // but street number or name might not be there depending on what was
    // searched for (e.g. just a city name)
    if (includeAllFields || fields.includes("vicinity")) {
      if (place.Address.Locality) {
        let vicinity = place.Address.Locality;
        if (place.Address.Street) {
          vicinity = `${place.Address.Street}, ${vicinity}`;
        }
        if (place.Address.AddressNumber) {
          vicinity = `${place.Address.AddressNumber} ${vicinity}`;
        }
        googlePlace.vicinity = vicinity;
      }
    }

    if (includeAllFields || fields.includes("website")) {
      const websites = place.Contacts?.Websites;

      // Pick the longest website URL, since the first one can often be just the generic
      // website for the chain, instead of that specific location
      if (websites) {
        let website = "";
        websites.forEach((url) => {
          if (url.Value.length > website.length) {
            website = url.Value;
          }
        });

        googlePlace.website = website;
      }
    }
  }

  return googlePlace;
};

// This helper is for converting an Amazon Place object to the legacy Google Places object format
const convertAmazonPlaceToGoogleV1 = (placeObject, fields, includeDetailFields) => {
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

  // Needed for MigrationDirectionsService.route method's response field "geocoded_waypoints"
  // which needs DirectionsGeocodedWaypoint objects that have property "type" which is the
  // equivalent of Amazon Location's "Categories" property
  if ((includeAllFields || fields.includes("types")) && place.Categories != null) {
    googlePlace["types"] = place.Categories;
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

// Since we use convertAmazonPlaceToGoogle to convert the Amazon Place response to
// a Google PlaceResult, we need to map the new Place property fields to the corrresponding
// PlaceResult fields so that the proper fields are parsed/filtered when specified
const newFieldToPlaceResultFieldMapping: { [key: string]: string } = {
  addressComponents: "address_components",
  adrFormatAddress: "adr_address",
  displayName: "name",
  formattedAddress: "formatted_address",
  id: "place_id",
  internationalPhoneNumber: "international_phone_number",
  location: "geometry.location",
  nationalPhoneNumber: "formatted_phone_number",
  openingHours: "opening_hours",
  plusCode: "plus_code",
  regularOpeningHours: "opening_hours",
  types: "types",
  utcOffsetMinutes: "utc_offset_minutes",
  viewport: "geometry.viewport",
  websiteURI: "website",
  "*": "ALL",
};
const convertNewFieldsToPlaceResultFields = (fields: string[] | null): string[] => {
  if (!fields) {
    return [];
  }

  const placeResultFields: string[] = [];
  fields.forEach((field) => {
    if (field in newFieldToPlaceResultFieldMapping) {
      placeResultFields.push(newFieldToPlaceResultFieldMapping[field]);
    } else {
      console.warn("Unsupported field:", field);
    }
  });

  return placeResultFields;
};

export {
  convertAmazonCategoriesToGoogle,
  convertAmazonPlaceToGoogle,
  convertAmazonPlaceToGoogleV1,
  convertGeocoderAddressComponentToAddressComponent,
  convertPlacePlusCodeToPlusCode,
  convertNewFieldsToPlaceResultFields,
  PlaceResult,
};
