// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { convertAmazonOpeningHoursToGoogle, convertPlaceOpeningHoursToOpeningHours } from "../src/places";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

// Set a fake system time so that any logic that creates a new Date.now (e.g. new Date())
// will be deterministic
jest.useFakeTimers().setSystemTime(new Date("2024-01-01T10:00:00.000Z"));

afterEach(() => {
  jest.clearAllMocks();
});

test("should return null if opening hours is missing or empty", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([]);

  expect(openingHours).toBeNull();
});

test("should log an error if opening hours has an unrecognized recurrence", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon-Sun: 00:00 - 24:00"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T000000",
          OpenDuration: "PT24H00M",
          Recurrence: "UNKNOWN_RECURRENCE:MO,TU,WE,TH,FR,SA,SU",
        },
      ],
    },
  ]);

  expect(openingHours?.periods).toHaveLength(0);
  expect(console.error).toHaveBeenCalledTimes(1);
});

test("should truncate weekday_text AM if open and close times are both AM", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon: 08:00 - 10:26"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T080000",
          OpenDuration: "PT02H26M",
          Recurrence: "FREQ:DAILY;BYDAY:MO",
        },
      ],
    },
  ]);

  expect(openingHours?.weekday_text).toBeDefined();
  if (openingHours?.weekday_text) {
    const weekdayText = openingHours.weekday_text;
    expect(weekdayText[0]).toStrictEqual("Monday: 8:00 - 10:26 AM");
  }
});

test("should truncate weekday_text PM if open and close times are both PM", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon: 13:00 - 13:37"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T130000",
          OpenDuration: "PT00H37M",
          Recurrence: "FREQ:DAILY;BYDAY:MO",
        },
      ],
    },
  ]);

  expect(openingHours?.weekday_text).toBeDefined();
  if (openingHours?.weekday_text) {
    const weekdayText = openingHours.weekday_text;
    expect(weekdayText[0]).toStrictEqual("Monday: 1:00 - 1:37 PM");
  }
});

test("should have closed for weekday_text on days when closed", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon: 08:00 - 10:26"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T080000",
          OpenDuration: "PT02H26M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,TH,SU",
        },
      ],
    },
  ]);

  expect(openingHours?.weekday_text).toBeDefined();
  if (openingHours?.weekday_text) {
    const weekdayText = openingHours.weekday_text;
    expect(weekdayText[0]).toStrictEqual("Monday: 8:00 - 10:26 AM");
    expect(weekdayText[1]).toStrictEqual("Tuesday: 8:00 - 10:26 AM");
    expect(weekdayText[2]).toStrictEqual("Wednesday: Closed");
    expect(weekdayText[3]).toStrictEqual("Thursday: 8:00 - 10:26 AM");
    expect(weekdayText[4]).toStrictEqual("Friday: Closed");
    expect(weekdayText[5]).toStrictEqual("Saturday: Closed");
    expect(weekdayText[6]).toStrictEqual("Sunday: 8:00 - 10:26 AM");
  }
});

test("should handle open 24 hours special-case", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon-Sun: 00:00 - 24:00"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T000000",
          OpenDuration: "PT24H00M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
        },
      ],
    },
  ]);

  expect(openingHours?.periods).toHaveLength(1);
  if (openingHours?.periods) {
    const onlyPeriod = openingHours?.periods[0];
    expect(onlyPeriod.open.day).toStrictEqual(0);
    expect(onlyPeriod.open.hours).toStrictEqual(0);
    expect(onlyPeriod.open.minutes).toStrictEqual(0);
    expect(onlyPeriod.open.time).toStrictEqual("0000");

    expect(onlyPeriod.close).toBeUndefined();
  }

  expect(openingHours?.weekday_text).toBeDefined();
  if (openingHours?.weekday_text) {
    const weekdayText = openingHours.weekday_text;
    expect(weekdayText[0]).toStrictEqual("Monday: Open 24 hours");
    expect(weekdayText[1]).toStrictEqual("Tuesday: Open 24 hours");
    expect(weekdayText[2]).toStrictEqual("Wednesday: Open 24 hours");
    expect(weekdayText[3]).toStrictEqual("Thursday: Open 24 hours");
    expect(weekdayText[4]).toStrictEqual("Friday: Open 24 hours");
    expect(weekdayText[5]).toStrictEqual("Saturday: Open 24 hours");
    expect(weekdayText[6]).toStrictEqual("Sunday: Open 24 hours");
  }
});

test("isOpen should return true if OpenNow is true", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon: 08:00 - 10:26"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T080000",
          OpenDuration: "PT02H26M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,TH,SU",
        },
      ],
    },
  ]);

  expect(openingHours?.isOpen()).toStrictEqual(true);
});

test("isOpen will always be true if the place is open 24 hours", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: ["Mon-Sun: 00:00 - 24:00"],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T000000",
          OpenDuration: "PT24H00M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
        },
      ],
    },
  ]);

  expect(openingHours?.isOpen(new Date("2024-01-01T10:00"))).toStrictEqual(true);
  expect(openingHours?.isOpen(new Date("2024-01-01T15:00"))).toStrictEqual(true);
  expect(openingHours?.isOpen(new Date("2024-01-01T23:00"))).toStrictEqual(true);
});

test("isOpen should be undefined if there are no opening hours periods", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: [],
      OpenNow: true,
      Components: [],
    },
  ]);

  expect(openingHours?.isOpen(new Date("2024-01-01T10:00"))).toBeUndefined();
});

test("isOpen should only return true on the correct day", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle(
    [
      {
        Display: ["Wed: 08:00 - 10:26"],
        OpenNow: true,
        Components: [
          {
            OpenTime: "T080000",
            OpenDuration: "PT02H26M",
            Recurrence: "FREQ:DAILY;BYDAY:WE",
          },
        ],
      },
    ],
    {
      Name: "UTC",
      Offset: "00:00",
      OffsetSeconds: 0,
    },
  );

  const testDate = new Date("2024-07-10T10:00:00.000Z"); // Wednesday
  expect(openingHours?.isOpen(testDate)).toStrictEqual(true);

  const badTestDate = new Date("2024-07-09T10:00:00.000Z"); // Tuesday
  expect(openingHours?.isOpen(badTestDate)).toStrictEqual(false);
});

test("isOpen will return false if duration is missing because there will be no close times", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle(
    [
      {
        Display: ["Wed: 08:00 - 10:26"],
        OpenNow: true,
        Components: [
          {
            OpenTime: "T080000",
            Recurrence: "FREQ:DAILY;BYDAY:WE",
          },
        ],
      },
    ],
    {
      Name: "UTC",
      Offset: "00:00",
      OffsetSeconds: 0,
    },
  );

  const badTestDate = new Date("2024-07-10T10:00:00.000Z"); // Wednesday
  expect(openingHours?.isOpen(badTestDate)).toStrictEqual(false);

  const alsoBadTestDate = new Date("2024-07-09T10:00:00.000Z"); // Tuesday
  expect(openingHours?.isOpen(alsoBadTestDate)).toStrictEqual(false);
});

test("should return null if opening hours is missing or empty for convertPlaceOpeningHoursToOpeningHours", () => {
  const openingHours = convertPlaceOpeningHoursToOpeningHours(null);

  expect(openingHours).toBeNull();
});
