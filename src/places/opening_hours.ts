// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { OpeningHours as AmazonOpeningHours, TimeZone } from "@aws-sdk/client-geo-places";

import { OpeningHours, OpeningHoursPeriod, OpeningHoursPoint } from "./defines";

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

export const convertAmazonOpeningHoursToGoogle = (openingHours: AmazonOpeningHours[], timeZone?: TimeZone) => {
  if (!openingHours || openingHours.length == 0) {
    return null;
  }

  const openNow = openingHours[0].OpenNow;
  const components = openingHours[0].Components;

  const periods: google.maps.places.PlaceOpeningHoursPeriod[] = [];

  let open24Hours = false;
  if (components) {
    // Special-case handling for places that are open 24 hours
    if (
      components.length == 1 &&
      components[0].OpenTime == "T000000" &&
      components[0].OpenDuration == "PT24H00M" &&
      components[0].Recurrence == "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU"
    ) {
      const period: google.maps.places.PlaceOpeningHoursPeriod = {
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
            const openPeriod: google.maps.places.PlaceOpeningHoursTime = {
              day: dayIndex,
              hours: openHours,
              minutes: openMinutes,
              time: `${openHoursStr.padStart(2, "0")}${openMinutesStr.padStart(2, "0")}`,
            };

            const period: google.maps.places.PlaceOpeningHoursPeriod = {
              open: openPeriod,
            };

            if (openDuration) {
              const closePeriod: google.maps.places.PlaceOpeningHoursTime = {
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
    const dayPeriods = periods.filter((element) => {
      return element.open.day == dayIndex;
    });

    const dayString = dayIndexToString[dayIndex];

    if (open24Hours) {
      weekdayText.push(`${dayString}: Open 24 hours`);
    } else if (dayPeriods.length) {
      // Iterate over the periods for a given day. There could be multiple periods for a single day
      //    e.g. restaurants that close for lunch and re-open for dinner, doctor's offices, etc...
      const periodTexts = [];
      dayPeriods.forEach((period) => {
        const openTime = period.open;
        const openHours = openTime.hours;
        const openMinutes = openTime.minutes;
        const openDateTime = new Date();
        openDateTime.setHours(openHours);
        openDateTime.setMinutes(openMinutes);

        // Use the "short" timeStyle so that it omits seconds and doesn't 0-pad
        // the hours to 2 digits
        const openTimeStr = openDateTime.toLocaleTimeString([], { timeStyle: "short" });
        let periodText = openTimeStr;

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

        periodTexts.push(periodText);
      });

      // Join the day periods into a single line, e.g. "Tuesday: 9:00 AM - 12:30 PM, 2:00 - 6:00 PM"
      const dayPeriodText = `${dayString}: ${periodTexts.join(", ")}`;

      weekdayText.push(dayPeriodText);
    } else {
      // If there's no period for the dayIndex, then its closed for that day
      weekdayText.push(`${dayString}: Closed`);
    }
  }

  // Move the first opening hours text (Sunday), to the end of the list
  weekdayText.push(weekdayText.shift());

  const placeOpeningHours: google.maps.places.PlaceOpeningHours = {
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

// Helper to convert Google's original PlaceOpeningHours (https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/places-service#PlaceOpeningHours)
// to their new Places OpeningHours class (https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#OpeningHours)
export const convertPlaceOpeningHoursToOpeningHours = (
  placeOpeningHours: google.maps.places.PlaceOpeningHours | null,
) => {
  if (!placeOpeningHours) {
    return null;
  }

  const openingHours = new OpeningHours();
  openingHours.weekdayDescriptions = placeOpeningHours.weekday_text;

  if (placeOpeningHours.periods) {
    openingHours.periods = placeOpeningHours.periods.map((period) => {
      const newPeriod = new OpeningHoursPeriod();

      // The opening time is required, so it will always be present on a time period
      const open = period.open;
      const openPoint = new OpeningHoursPoint();
      openPoint.day = open.day;
      openPoint.hour = open.hours;
      openPoint.minute = open.minutes;
      newPeriod.open = openPoint;

      // The closing time is optional, so we need to check for it first
      if (period.close) {
        const close = period.close;
        const closePoint = new OpeningHoursPoint();
        closePoint.day = close.day;
        closePoint.hour = close.hours;
        closePoint.minute = close.minutes;
        newPeriod.close = closePoint;
      }

      return newPeriod;
    });
  }

  return openingHours;
};
