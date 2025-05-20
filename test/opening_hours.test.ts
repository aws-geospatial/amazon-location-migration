// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { convertAmazonOpeningHoursToGoogle, convertPlaceOpeningHoursToOpeningHours } from "../src/places";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

beforeAll(() => {
  jest.useFakeTimers();
});

// Set a fake system time so that any logic that creates a new Date.now (e.g. new Date())
// will be deterministic
beforeEach(() => {
  jest.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
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

test("should handle opening hours that go past midnight", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: [
        "Mon: 00:00 - 01:00, 17:00 - 24:00",
        "Tue-Fri: 00:00 - 02:00, 17:00 - 24:00",
        "Sat: 00:00 - 02:00, 20:00 - 24:00",
        "Sun: 00:00 - 02:00, 19:00 - 24:00",
      ],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T170000",
          OpenDuration: "PT09H00M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR",
        },
        {
          OpenTime: "T200000",
          OpenDuration: "PT06H00M",
          Recurrence: "FREQ:DAILY;BYDAY:SA",
        },
        {
          OpenTime: "T190000",
          OpenDuration: "PT06H00M",
          Recurrence: "FREQ:DAILY;BYDAY:SU",
        },
      ],
    },
  ]);

  const periods = openingHours!.periods;
  expect(periods).toHaveLength(7);

  expect(periods).toStrictEqual([
    {
      open: {
        day: 0,
        hours: 19,
        minutes: 0,
        time: "1900",
      },
      close: {
        day: 1,
        hours: 1,
        minutes: 0,
        time: "0100",
      },
    },
    {
      open: {
        day: 1,
        hours: 17,
        minutes: 0,
        time: "1700",
      },
      close: {
        day: 2,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
    {
      open: {
        day: 2,
        hours: 17,
        minutes: 0,
        time: "1700",
      },
      close: {
        day: 3,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
    {
      open: {
        day: 3,
        hours: 17,
        minutes: 0,
        time: "1700",
      },
      close: {
        day: 4,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
    {
      open: {
        day: 4,
        hours: 17,
        minutes: 0,
        time: "1700",
      },
      close: {
        day: 5,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
    {
      open: {
        day: 5,
        hours: 17,
        minutes: 0,
        time: "1700",
      },
      close: {
        day: 6,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
    {
      open: {
        day: 6,
        hours: 20,
        minutes: 0,
        time: "2000",
      },
      close: {
        day: 0,
        hours: 2,
        minutes: 0,
        time: "0200",
      },
    },
  ]);

  expect(openingHours?.weekday_text).toStrictEqual([
    "Monday: 5:00 PM - 2:00 AM",
    "Tuesday: 5:00 PM - 2:00 AM",
    "Wednesday: 5:00 PM - 2:00 AM",
    "Thursday: 5:00 PM - 2:00 AM",
    "Friday: 5:00 PM - 2:00 AM",
    "Saturday: 8:00 PM - 2:00 AM",
    "Sunday: 7:00 PM - 1:00 AM",
  ]);
});

test("should handle place with multiple opening hours on a single day", () => {
  const openingHours = convertAmazonOpeningHoursToGoogle([
    {
      Display: [
        "Mon, Tue, Thu: 09:00 - 18:00",
        "Wed: 09:00 - 12:30, 14:00 - 18:00",
        "Fri: 09:00 - 17:00",
        "Sat: 09:00 - 16:00",
      ],
      OpenNow: true,
      Components: [
        {
          OpenTime: "T090000",
          OpenDuration: "PT09H00M",
          Recurrence: "FREQ:DAILY;BYDAY:MO,TU,TH",
        },
        {
          OpenTime: "T090000",
          OpenDuration: "PT03H30M",
          Recurrence: "FREQ:DAILY;BYDAY:WE",
        },
        {
          OpenTime: "T140000",
          OpenDuration: "PT04H00M",
          Recurrence: "FREQ:DAILY;BYDAY:WE",
        },
        {
          OpenTime: "T090000",
          OpenDuration: "PT08H00M",
          Recurrence: "FREQ:DAILY;BYDAY:FR",
        },
        {
          OpenTime: "T090000",
          OpenDuration: "PT07H00M",
          Recurrence: "FREQ:DAILY;BYDAY:SA",
        },
      ],
    },
  ]);

  const periods = openingHours!.periods;

  expect(periods).toHaveLength(7);
  expect(periods).toStrictEqual([
    {
      close: {
        day: 1,
        time: "1800",
        hours: 18,
        minutes: 0,
      },
      open: {
        day: 1,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
    {
      close: {
        day: 2,
        time: "1800",
        hours: 18,
        minutes: 0,
      },
      open: {
        day: 2,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
    {
      close: {
        day: 3,
        time: "1230",
        hours: 12,
        minutes: 30,
      },
      open: {
        day: 3,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
    {
      close: {
        day: 3,
        time: "1800",
        hours: 18,
        minutes: 0,
      },
      open: {
        day: 3,
        time: "1400",
        hours: 14,
        minutes: 0,
      },
    },
    {
      close: {
        day: 4,
        time: "1800",
        hours: 18,
        minutes: 0,
      },
      open: {
        day: 4,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
    {
      close: {
        day: 5,
        time: "1700",
        hours: 17,
        minutes: 0,
      },
      open: {
        day: 5,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
    {
      close: {
        day: 6,
        time: "1600",
        hours: 16,
        minutes: 0,
      },
      open: {
        day: 6,
        time: "0900",
        hours: 9,
        minutes: 0,
      },
    },
  ]);

  expect(openingHours?.weekday_text).toStrictEqual([
    "Monday: 9:00 AM - 6:00 PM",
    "Tuesday: 9:00 AM - 6:00 PM",
    "Wednesday: 9:00 AM - 12:30 PM, 2:00 - 6:00 PM",
    "Thursday: 9:00 AM - 6:00 PM",
    "Friday: 9:00 AM - 5:00 PM",
    "Saturday: 9:00 AM - 4:00 PM",
    "Sunday: Closed",
  ]);
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
