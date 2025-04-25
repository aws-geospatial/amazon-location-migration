// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  buildAmazonLocationMaplibreGeocoder,
  PlacesGeocoderOptions,
} from "@aws/amazon-location-for-maplibre-gl-geocoder";

import {
  GetPlaceCommand as GetPlaceCommandV1,
  GetPlaceRequest as GetPlaceRequestV1,
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForTextRequest,
} from "@aws-sdk/client-location";

import {
  GeoPlacesClient,
  GetPlaceCommand,
  GetPlaceRequest,
  GetPlaceResponse,
  OpeningHours,
  SearchTextCommand,
  SearchTextRequest,
  SearchTextResultItem,
  SuggestAdditionalFeature,
  SuggestCommand,
  SuggestRequest,
  TimeZone,
} from "@aws-sdk/client-geo-places";

import parsePhoneNumber from "libphonenumber-js";

import { OpenLocationCode } from "open-location-code";

import {
  AddListenerResponse,
  LatLngBoundsLike,
  LatLngLike,
  LatLngToLngLat,
  MigrationCircle,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
} from "./common";
import { convertAmazonPlaceTypeToGoogle } from "./places/index";

interface AutocompletePrediction {
  description: string;
  place_id: string;
}

// FIXME: Temporarily add QueryAutocompletePrediction as a possible type until getPlacePredictions has been
// re-implemented using the new Autocomplete API
interface AutocompleteResponse {
  predictions: AutocompletePrediction[] | QueryAutocompletePrediction[];
}

interface PredictionSubstring {
  length: number;
  offset: number;
}

interface PredictionTerm {
  offset: number;
  value: string;
}

interface QueryAutocompletePrediction {
  description: string;
  matched_substrings: PredictionSubstring[];
  place_id?: string;
  reference?: string;
  terms: PredictionTerm[];
}

interface PlaceOptions {
  id: string;
  requestedLanguage?: string | null;
  requestedRegion?: string | null;
}

interface FetchFieldsRequest {
  fields: string[];
}

interface SearchByTextRequest {
  fields: string[];
  includedType?: string;
  isOpenNow?: boolean;
  language?: string;
  locationBias?: MigrationLatLng | google.maps.LatLngLiteral | MigrationLatLngBounds | google.maps.LatLngBoundsLiteral;
  locationRestriction?: MigrationLatLngBounds | google.maps.LatLngBoundsLiteral;
  maxResultCount?: number;
  minRating?: number;
  query?: string;
  region?: string;
  textQuery?: string;
  useStrictTypeFiltering?: boolean;
}

interface TextSearchRequest {
  bounds?: LatLngBoundsLike;
  language?: string | null;
  location?: LatLngLike;
  query?: string;
  radius?: number;
  region?: string | null;
  type?: string;
}

interface GeocoderAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceGeometry {
  location?: MigrationLatLng;
  viewport?: MigrationLatLngBounds;
}

interface PlaceOpeningHours {
  isOpen(date?: Date): boolean | undefined;
  open_now?: boolean;
  periods?: PlaceOpeningHoursPeriod[];
  weekday_text?: string[];
}

interface PlaceOpeningHoursPeriod {
  close?: PlaceOpeningHoursTime;
  open: PlaceOpeningHoursTime;
}

interface PlaceOpeningHoursTime {
  day: number;
  hours: number;
  minutes: number;
  nextDate?: number;
  time: string;
}

interface PlacePlusCode {
  compound_code?: string;
  global_code: string;
}

interface PlaceResult {
  address_components?: GeocoderAddressComponent[];
  adr_address?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  geometry?: PlaceGeometry;
  html_attributions?: string[];
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  international_phone_number?: string;
  name?: string;
  opening_hours?: PlaceOpeningHours;
  place_id?: string;
  plus_code?: PlacePlusCode;
  price_level?: number;
  reference?: string;
  types?: string[];
  url?: string;
  utc_offset?: number;
  utc_offset_minutes?: number;
  vicinity?: string;
  website?: string;
}

const dayToIndexMap = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const dayIndexToString = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const convertAmazonOpeningHoursToGoogle = (openingHours: OpeningHours[], timeZone?: TimeZone) => {
  if (!openingHours || openingHours.length == 0) {
    return null;
  }

  const openNow = openingHours[0].OpenNow;
  const components = openingHours[0].Components;

  const periods: PlaceOpeningHoursPeriod[] = [];

  let open24Hours = false;
  if (components) {
    // Special-case handling for places that are open 24 hours
    if (
      components.length == 1 &&
      components[0].OpenTime == "T000000" &&
      components[0].OpenDuration == "PT24H00M" &&
      components[0].Recurrence == "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU"
    ) {
      const period: PlaceOpeningHoursPeriod = {
        open: {
          day: 0,
          time: "0000",
          hours: 0,
          minutes: 0,
        },
      };

      periods.push(period);

      // Keep track of this so we can handle special case for generating the weekday_text as well
      open24Hours = true;
    } else {
      components.forEach((component) => {
        // OpenTime is formatted as "THHMMSS"
        const openTime = component.OpenTime;
        const openHoursStr = openTime.substring(1, 3);
        const openMinutesStr = openTime.substring(3, 5);

        // Convert the open hours/minutes to integers so we can calculate the closing time
        const openHours = parseInt(openHoursStr);
        const openMinutes = parseInt(openMinutesStr);

        // OpenDuration is formatted as PT01H23M
        const openDuration = component.OpenDuration;
        let closeHours: number, closeMinutes: number;
        let closeHoursStr: string, closeMinutesStr: string;
        let dayIndexOffset = 0;
        if (openDuration) {
          const durationHoursStr = openDuration.substring(2, 4);
          const durationMinutesStr = openDuration.substring(5, 7);

          // Convert the duration hours/minutes to integers so we can calculate the closing time
          const durationHours = parseInt(durationHoursStr);
          const durationMinutes = parseInt(durationMinutesStr);

          closeHours = openHours + durationHours;
          closeMinutes = openMinutes + durationMinutes;

          // If the duration takes the closing hours past midnight (e.g. a night club/bar that closes at 2 AM),
          // we need to clamp the hours value and keep track of a day index offset for when we set the
          // close period later
          if (closeHours >= 24) {
            closeHours = closeHours % 24;
            dayIndexOffset = 1;
          }
          closeHoursStr = closeHours.toString();
          closeMinutesStr = closeMinutes.toString();
        }

        const recurrence = component.Recurrence;
        const recurrencePrefix = "FREQ:DAILY;BYDAY:";
        const recurrenceParts = recurrence.split(recurrencePrefix);
        if (recurrenceParts.length == 2) {
          const byDay = recurrenceParts[1];
          const days = byDay.split(",");

          const dayIndices = days.map((day) => {
            if (day in dayToIndexMap) {
              return dayToIndexMap[day];
            }
          });

          dayIndices.forEach((dayIndex) => {
            // The time field is formmated as "hhmm", so we need to pad the hours/minutes
            // with a leading '0' for any numbers less than 10
            const openPeriod: PlaceOpeningHoursTime = {
              day: dayIndex,
              hours: openHours,
              minutes: openMinutes,
              time: `${openHoursStr.padStart(2, "0")}${openMinutesStr.padStart(2, "0")}`,
            };

            const period: PlaceOpeningHoursPeriod = {
              open: openPeriod,
            };

            if (openDuration) {
              const closePeriod: PlaceOpeningHoursTime = {
                day: (dayIndex + dayIndexOffset) % 7, // day index needs to wrap around to Sunday (if it was incremented for a Saturday)
                hours: closeHours,
                minutes: closeMinutes,
                time: `${closeHoursStr.padStart(2, "0")}${closeMinutesStr.padStart(2, "0")}`,
              };

              period.close = closePeriod;
            }

            periods.push(period);
          });
        } else {
          console.error(`Unsupported recurrence frequence: ${recurrence}`);
        }
      });
    }
  }

  // Calculate timestamp (as milliseconds since the epoch) for the next time all of the open/close periods will occur
  // This can only be calculated if we have a TimeZone offset for this place
  if (timeZone && typeof timeZone.OffsetSeconds === "number") {
    const currentDateTime = new Date();

    periods.forEach((period) => {
      [period.open, period.close].forEach((openingHoursTime) => {
        if (!openingHoursTime) {
          return;
        }

        const nextDate = new Date();
        const offsetInMinutes = timeZone.OffsetSeconds / 60;
        const timeZoneHoursOffset = offsetInMinutes / 60;
        const timeZoneMinutesOffset = offsetInMinutes % 60;
        nextDate.setUTCHours(openingHoursTime.hours - timeZoneHoursOffset);
        nextDate.setUTCMinutes(openingHoursTime.minutes - timeZoneMinutesOffset);
        nextDate.setSeconds(0); // Reset the seconds

        // Calculate the calendar date (e.g. the 23rd) by using the current date (e.g. the 25th) and then
        // subtracting the day index offset (e.g. current date's index is 2 for Tuesday, and the day we're
        // trying to calculate for is 0 for Sunday)
        const currentDate = nextDate.getDate();
        nextDate.setDate(currentDate - (nextDate.getDay() - openingHoursTime.day));

        // If this date has already passed, then just increment it to next week
        if (currentDateTime > nextDate) {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        openingHoursTime.nextDate = nextDate.getTime();
      });
    });
  }

  // Sort the opening hour periods by the day index, since the components
  // can be parsed out of order
  periods.sort((a, b) => a.open.day - b.open.day);

  // The weekday_text field is an array of user readable strings for the opening hours of each day
  // e.g. Monday: 9:00 AM – 10:00 PM
  const weekdayText = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const period = periods.find((element) => {
      return element.open.day == dayIndex;
    });

    const dayString = dayIndexToString[dayIndex];

    if (open24Hours) {
      weekdayText.push(`${dayString}: Open 24 hours`);
    } else if (period) {
      const openTime = period.open;
      const openHours = openTime.hours;
      const openMinutes = openTime.minutes;
      const openDateTime = new Date();
      openDateTime.setHours(openHours);
      openDateTime.setMinutes(openMinutes);

      // Use the "short" timeStyle so that it omits seconds and doesn't 0-pad
      // the hours to 2 digits
      const openTimeStr = openDateTime.toLocaleTimeString([], { timeStyle: "short" });
      let periodText = `${dayString}: ${openTimeStr}`;

      const closeTime = period.close;
      if (closeTime) {
        const closeHours = closeTime.hours;
        const closeMinutes = closeTime.minutes;
        const closeDateTime = new Date();
        closeDateTime.setHours(closeHours);
        closeDateTime.setMinutes(closeMinutes);

        const closeTimeStr = closeDateTime.toLocaleTimeString([], { timeStyle: "short" });
        periodText += ` - ${closeTimeStr}`;
      }

      // If the times are both AM or both PM, then we only want to show AM/PM on the closing time
      // e.g. 09:00 - 11:00 AM
      const amCount = periodText.match(/AM/g)?.length;
      const pmCount = periodText.match(/PM/g)?.length;
      if (amCount == 2) {
        periodText = periodText.replace("AM ", "");
      } else if (pmCount == 2) {
        periodText = periodText.replace("PM ", "");
      }

      weekdayText.push(periodText);
    } else {
      // If there's no period for the dayIndex, then its closed for that day
      weekdayText.push(`${dayString}: Closed`);
    }
  }

  // Move the first opening hours text (Sunday), to the end of the list
  weekdayText.push(weekdayText.shift());

  const placeOpeningHours: PlaceOpeningHours = {
    open_now: openNow,
    isOpen: (date?: Date) => {
      // If no date was passed in, return if its open now
      if (date == undefined) {
        return openNow;
      }

      // Special-case if the place is open 24 hours
      if (
        periods.length == 1 &&
        periods[0].open.day == 0 &&
        periods[0].open.time == "0000" &&
        periods[0].close == undefined
      ) {
        return true;
      }

      // If time zone is missing or we have no open/close periods, then we return undefined
      if (!timeZone || periods.length == 0) {
        return undefined;
      }

      const dayIndex = date.getUTCDay();
      const fullYear = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const currentDate = date.getUTCDate();
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const openHoursTime = period.open;
        const closeHoursTime = period.close;
        if (!closeHoursTime || !openHoursTime.nextDate || !closeHoursTime.nextDate) {
          continue;
        }

        // Calculate the calendar date (e.g. the 23rd) by using the current date (e.g. the 25th) and then
        // subtracting the day index offset (e.g. current date's index is 2 for Tuesday, and the day we're
        // trying to calculate for is 0 for Sunday)
        const openDateTime = new Date(openHoursTime.nextDate);
        openDateTime.setUTCFullYear(fullYear);
        openDateTime.setUTCMonth(month);
        openDateTime.setUTCDate(currentDate - (dayIndex - openDateTime.getUTCDay()));

        // If this opening date time is after the requested date, then keep looking
        if (openDateTime > date) {
          continue;
        }

        const closeDateTime = new Date(closeHoursTime.nextDate);
        closeDateTime.setUTCFullYear(fullYear);
        closeDateTime.setUTCMonth(month);
        closeDateTime.setUTCDate(currentDate - (dayIndex - closeDateTime.getUTCDay()));

        // If date time falls between open and close, then we found a match
        if (date > openDateTime && date < closeDateTime) {
          return true;
        }
      }

      // The place isn't open if the datetime isn't during one of the open periods
      return false;
    },
    periods: periods,
    weekday_text: weekdayText,
  };

  return placeOpeningHours;
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
  if (!fields || fields.includes("ALL")) {
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

  if (includeAllFields || fields.includes("place_id")) {
    googlePlace.place_id = place.PlaceId;
  }

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
      const addressComponents: GeocoderAddressComponent[] = [];

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

class MigrationPlacesService {
  _clientV1: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
  _client: GeoPlacesClient; // This will be populated by the top level module that creates our location client

  findPlaceFromQuery(request: google.maps.places.FindPlaceFromQueryRequest, callback) {
    const query = request.query;
    const fields = request.fields;
    const locationBias = request.locationBias; // optional
    const language = request.language; // optional

    const input: SearchTextRequest = {
      QueryText: query, // required
      MaxResults: 10, // findPlaceFromQuery usually returns a single result
      AdditionalFeatures: ["Contact", "TimeZone"], // Without this, contact, opening hours, and time zone data will be missing
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
      AdditionalFeatures: ["Contact", "TimeZone"], // Without this, contact, opening hours, and time zone data will be missing
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

  textSearch(request: TextSearchRequest, callback) {
    const query = request.query; // optional
    const locationBias = request.location; // optional
    const radius = request.radius; // optional
    const bounds = request.bounds; // optional
    const language = request.language; // optional
    const region = request.region; // optional

    const input: SearchTextRequest = {
      QueryText: query, // required
      AdditionalFeatures: ["Contact", "TimeZone"], // Without this, contact, opening hours, and time zone data will be missing
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

class MigrationPlace {
  static _client: LocationClient; // This will be populated by the top level module that creates our location client
  static _placeIndexName: string; // This will be populated by the top level module that is passed our place index name

  displayName?: string | null;
  formattedAddress?: string | null;
  id: string;
  location?: MigrationLatLng | null;
  requestedLanguage?: string | null;
  requestedRegion?: string | null;
  utcOffsetMinutes?: number | null;

  constructor(options: PlaceOptions) {
    this.id = options.id;

    if (options.requestedLanguage) {
      this.requestedLanguage = options.requestedLanguage;
    }
  }

  fetchFields(options: FetchFieldsRequest): Promise<{ place: MigrationPlace }> {
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

  public static searchByText(request: SearchByTextRequest): Promise<{ places: MigrationPlace[] }> {
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

class MigrationAutocompleteService {
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
            const terms: PredictionTerm[] = [];
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

class MigrationAutocomplete {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
  #maplibreGeocoder;
  #bounds: MigrationLatLngBounds | undefined;
  #strictBounds = false;
  #fields;
  #place;

  constructor(inputField: HTMLInputElement, opts?) {
    // Same base geocoder options as SearchBox, except we add omitSuggestionsWithoutPlaceId
    // so that we only get results with a PlaceId
    const maplibreGeocoderOptions: PlacesGeocoderOptions = {
      enableAll: true,
      omitSuggestionsWithoutPlaceId: true,
    };

    if (inputField.placeholder) {
      maplibreGeocoderOptions.placeholder = inputField.placeholder;
    }

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(
      this._client,
      this._placeIndexName,
      maplibreGeocoderOptions,
    );

    const geocoder = this.#maplibreGeocoder.getPlacesGeocoder();
    geocoder.addTo(inputField.parentElement);

    if (inputField.className) {
      geocoder.container.className = `${inputField.className} ${geocoder.container.className}`;
    }

    if (inputField.id) {
      geocoder._inputEl.id = inputField.id;
    }

    inputField.remove();

    if (opts) {
      this.setOptions(opts);
    }
  }

  getBounds() {
    return this.#bounds;
  }

  getFields() {
    return this.#fields;
  }

  getPlace() {
    return this.#place;
  }

  setBounds(bounds) {
    this.#bounds = new MigrationLatLngBounds(bounds);

    // Google's setBounds is used to bias, but the geocoder's bounds is a firm restriction, so
    // if strictBounds isn't specified, then we use the center of the input bounds to bias
    if (this.#strictBounds) {
      const southWest = this.#bounds.getSouthWest();
      const northEast = this.#bounds.getNorthEast();
      const boundingBox = {
        longitudeSW: southWest.lng(),
        latitudeSW: southWest.lat(),
        longitudeNE: northEast.lng(),
        latitudeNE: northEast.lat(),
      };

      this.#maplibreGeocoder.setBoundingBox(boundingBox);
    } else {
      const center = this.#bounds.getCenter();
      this.#maplibreGeocoder.setBiasPosition({
        latitude: center.lat(),
        longitude: center.lng(),
      });
    }
  }

  setFields(fields) {
    this.#fields = fields;
  }

  setOptions(options) {
    // Read in strictBounds option first since it will determine how
    // the bounds option is consumed
    if (typeof options.strictBounds === "boolean") {
      this.#strictBounds = options.strictBounds;
    }

    if (options.bounds) {
      this.setBounds(options.bounds);
    }

    if (options.fields) {
      this.#fields = options.fields;
    }
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "place_changed") {
      // This event is triggered if the user selects either a place from the retrieved suggestions
      const resultsWrappedHandler = (results) => {
        if (results.place) {
          // The fields could be set later, so we need to query again before converting the place
          const fields = this.#fields || ["ALL"];

          this.#place = convertAmazonPlaceToGoogleV1(results.place.properties, fields, true);

          // When the user picks a prediction, the geocoder displays the updated results
          // by default (e.g. drops down the single chosen prediction).
          // Google's widget does not do this, so in order to force the
          // results to collapse, we need to focus and then unfocus the input element.
          const inputElement = this.#maplibreGeocoder.getPlacesGeocoder()._inputEl as HTMLInputElement;
          inputElement.focus();
          inputElement.blur();

          handler();
          if (listenerType == "once") {
            this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
            this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          }
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("results", resultsWrappedHandler);

      // This event is triggered if the user re-selects the single place that had been previously selected
      // from the list of suggestions
      const resultWrappedHandler = (result) => {
        // The fields could be set later, so we need to query again before converting the place
        const fields = this.#fields || ["ALL"];

        this.#place = convertAmazonPlaceToGoogleV1(result.result.properties, fields, true);

        handler();
        if (listenerType == "once") {
          this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("result", resultWrappedHandler);

      return {
        instance: this,
        eventName: eventName,
        resultHandler: resultWrappedHandler,
        resultsHandler: resultsWrappedHandler,
      };
    }
  }

  _getMaplibreGeocoder() {
    return this.#maplibreGeocoder;
  }

  _setMapLibreGeocoder(geocoder) {
    this.#maplibreGeocoder = geocoder;
  }
}

class MigrationSearchBox {
  _client: LocationClient; // This will be populated by the top level module that creates our location client
  _placeIndexName: string; // This will be populated by the top level module that is passed our place index name
  #maplibreGeocoder;
  #bounds: MigrationLatLngBounds | undefined;
  #places;

  constructor(inputField: HTMLInputElement, opts?) {
    const maplibreGeocoderOptions: PlacesGeocoderOptions = {
      enableAll: true,
    };

    if (inputField.placeholder) {
      maplibreGeocoderOptions.placeholder = inputField.placeholder;
    }

    this.#maplibreGeocoder = buildAmazonLocationMaplibreGeocoder(
      this._client,
      this._placeIndexName,
      maplibreGeocoderOptions,
    );

    if (opts?.bounds) {
      this.setBounds(opts.bounds);
    }

    const geocoder = this.#maplibreGeocoder.getPlacesGeocoder();
    geocoder.addTo(inputField.parentElement);

    if (inputField.className) {
      geocoder.container.className = `${inputField.className} ${geocoder.container.className}`;
    }

    if (inputField.id) {
      geocoder._inputEl.id = inputField.id;
    }

    inputField.remove();
  }

  getBounds() {
    return this.#bounds;
  }

  setBounds(bounds) {
    this.#bounds = new MigrationLatLngBounds(bounds);

    // TODO: Google's setBounds is used to bias, but the geocoder's bounds is a firm restriction, so
    // for now we use the center of the input bounds to bias
    const center = this.#bounds.getCenter();
    this.#maplibreGeocoder.setBiasPosition({
      latitude: center.lat(),
      longitude: center.lng(),
    });
  }

  getPlaces() {
    return this.#places;
  }

  addListener(eventName, handler, listenerType = "on"): AddListenerResponse {
    if (eventName == "places_changed") {
      // This event is triggered if the user selects either a place or query suggestion
      // from the retrieved suggestions
      const resultsWrappedHandler = (results) => {
        if (results.place || results.features?.length) {
          if (results.place) {
            this.#places = [convertAmazonPlaceToGoogleV1(results.place.properties, ["ALL"], true)];
          } else {
            this.#places = results.features.map((result) => {
              return convertAmazonPlaceToGoogleV1(result.properties, ["ALL"], true);
            });
          }

          // When the user picks a prediction, the geocoder displays the updated results
          // by default (e.g. drops down the single chosen prediction, or a list of the results
          // for the query string). Google's widget does not do this, so in order to force the
          // results to collapse, we need to focus and then unfocus the input element.
          const inputElement = this.#maplibreGeocoder.getPlacesGeocoder()._inputEl as HTMLInputElement;
          inputElement.focus();
          inputElement.blur();

          handler();
          if (listenerType == "once") {
            this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
            this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          }
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("results", resultsWrappedHandler);

      // This event is triggered if the user selects a place from a list of query suggestions
      const resultWrappedHandler = (result) => {
        this.#places = [convertAmazonPlaceToGoogleV1(result.result.properties, ["ALL"], true)];

        handler();
        if (listenerType == "once") {
          this.#maplibreGeocoder.getPlacesGeocoder().off("result", resultWrappedHandler);
          this.#maplibreGeocoder.getPlacesGeocoder().off("results", resultsWrappedHandler);
        }
      };
      this.#maplibreGeocoder.getPlacesGeocoder().on("result", resultWrappedHandler);

      return {
        instance: this,
        eventName: eventName,
        resultHandler: resultWrappedHandler,
        resultsHandler: resultsWrappedHandler,
      };
    }
  }

  _getMaplibreGeocoder() {
    return this.#maplibreGeocoder;
  }

  _setMapLibreGeocoder(geocoder) {
    this.#maplibreGeocoder = geocoder;
  }
}

export {
  MigrationAutocomplete,
  MigrationAutocompleteService,
  MigrationPlace,
  MigrationPlacesService,
  MigrationSearchBox,
  convertAmazonCategoriesToGoogle,
  convertAmazonOpeningHoursToGoogle,
  convertAmazonPlaceToGoogle,
  convertAmazonPlaceToGoogleV1,
  PlaceOpeningHours,
};
