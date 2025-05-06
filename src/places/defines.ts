// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export class AddressComponent {
  longText: string | null;
  shortText: string | null;
  types: string[];
}

export class PlusCode {
  compoundCode: string | null;
  globalCode: string | null;
}

export class OpeningHours {
  periods: OpeningHoursPeriod[];
  weekdayDescriptions: string[];
}

export class OpeningHoursPeriod {
  close: OpeningHoursPoint | null;
  open: OpeningHoursPoint;
}

export class OpeningHoursPoint {
  day: number;
  hour: number;
  minute: number;
}
