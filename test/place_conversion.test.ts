// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  convertAmazonCategoriesToGoogle,
  convertAmazonPlaceToGoogle,
  convertGeocoderAddressComponentToAddressComponent,
  convertPlacePlusCodeToPlusCode,
} from "../src/places";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

// Set a fake system time so that any logic that creates a new Date.now (e.g. new Date())
// will be deterministic
jest.useFakeTimers().setSystemTime(new Date("2024-01-01T10:00:00.000Z"));

afterEach(() => {
  jest.clearAllMocks();
});

// Austin, TX :)
const testLat = 30.268193;
const testLng = -97.7457518;
const testPlaceWithAddressLabel = "1337 Cool Place Road, Austin, TX, USA";

test("should convert Country PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "Country",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["country", "political"]);
});

test("should convert Region PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "Region",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["administrative_area_level_1", "political"]);
});

test("should convert SubRegion PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "SubRegion",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["administrative_area_level_2", "political"]);
});

test("should convert Locality PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "Locality",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["locality", "political"]);
});

test("should convert PostalCode PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "PostalCode",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["postal_code"]);
});

test("should convert District PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "District",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["neighborhood", "political"]);
});

test("should convert Street PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "Street",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["route"]);
});

test("should convert PointAddress PlaceType to correct types", () => {
  const googleTypes = convertAmazonCategoriesToGoogle({
    PlaceId: "TEST_PLACE_ID",
    PlaceType: "PointAddress",
    PricingBucket: "",
    Title: "CoolPlace",
  });

  expect(googleTypes).toStrictEqual(["premise"]);
});

test("plus_code for non-us countries should use country name instead of region", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Country: {
          Code2: "FR",
          Code3: "FRA",
          Name: "France",
        },
        Locality: "Cool Place",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["plus_code"],
    false,
  );

  expect(googlePlace.plus_code?.global_code).toStrictEqual("86247793+7M");
  expect(googlePlace.plus_code?.compound_code).toStrictEqual("7793+7M Cool Place, France");
});

test("address_components should be empty if Address is missing from Place", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(0);
});

test("address_components SubRegion should use Code as long_name if no Name is given", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code2: "US",
          Code3: "USA",
          Name: "United States",
        },
        Region: {
          Code: "TX",
          Name: "Texas",
        },
        SubRegion: {
          Code: "Cool Code",
        },
        Locality: "Austin",
        District: "Cool District",
        PostalCode: "78704",
        Street: "Cool Place Road",
        AddressNumber: "1337",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(8);
  if (googlePlace.address_components) {
    expect(googlePlace.address_components[4].long_name).toStrictEqual("Cool Code");
    expect(googlePlace.address_components[4].short_name).toStrictEqual("Cool Code");
  }
});

test("address_components Region should use Code as long_name if no Name is given", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code2: "US",
          Code3: "USA",
          Name: "United States",
        },
        Region: {
          Code: "TX",
        },
        SubRegion: {
          Name: "Cool SubRegion",
        },
        Locality: "Austin",
        District: "Cool District",
        PostalCode: "78704",
        Street: "Cool Place Road",
        AddressNumber: "1337",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(8);
  if (googlePlace.address_components) {
    expect(googlePlace.address_components[5].long_name).toStrictEqual("TX");
    expect(googlePlace.address_components[5].short_name).toStrictEqual("TX");
  }
});

test("address_components Region should use Name as short_name if no Code is given", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code2: "US",
          Code3: "USA",
          Name: "United States",
        },
        Region: {
          Name: "Texas",
        },
        SubRegion: {
          Name: "Cool SubRegion",
        },
        Locality: "Austin",
        District: "Cool District",
        PostalCode: "78704",
        Street: "Cool Place Road",
        AddressNumber: "1337",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(8);
  if (googlePlace.address_components) {
    expect(googlePlace.address_components[5].long_name).toStrictEqual("Texas");
    expect(googlePlace.address_components[5].short_name).toStrictEqual("Texas");
  }
});

test("address_components Country should use Code as long_name if no Name is given", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code2: "US",
        },
        Region: {
          Code: "TX",
        },
        SubRegion: {
          Name: "Cool SubRegion",
        },
        Locality: "Austin",
        District: "Cool District",
        PostalCode: "78704",
        Street: "Cool Place Road",
        AddressNumber: "1337",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(8);
  if (googlePlace.address_components) {
    expect(googlePlace.address_components[6].long_name).toStrictEqual("US");
    expect(googlePlace.address_components[6].short_name).toStrictEqual("US");
  }
});

test("address_components Country should use Name as short_name if no Code2 is given", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Name: "United States",
        },
        Region: {
          Code: "TX",
        },
        SubRegion: {
          Name: "Cool SubRegion",
        },
        Locality: "Austin",
        District: "Cool District",
        PostalCode: "78704",
        Street: "Cool Place Road",
        AddressNumber: "1337",
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["address_components"],
    true,
  );

  expect(googlePlace.address_components).toHaveLength(8);
  if (googlePlace.address_components) {
    expect(googlePlace.address_components[6].long_name).toStrictEqual("United States");
    expect(googlePlace.address_components[6].short_name).toStrictEqual("United States");
  }
});

test("adr_address should be empty if Address is missing from Place", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["adr_address"],
    true,
  );

  expect(googlePlace.adr_address).toStrictEqual("");
});

test("adr_address Region should use Name if Code is missing", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Region: {
          Name: "Texas",
        },
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["adr_address"],
    true,
  );

  expect(googlePlace.adr_address).toStrictEqual('<span class="region">Texas</span>');
});

test("adr_address Country should use Code3 if there is a space in the Name", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code3: "USA",
          Name: "United States",
        },
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["adr_address"],
    true,
  );

  expect(googlePlace.adr_address).toStrictEqual('<span class="country-name">USA</span>');
});

test("vicinity should be empty if Locality is missing", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code3: "USA",
          Name: "United States",
        },
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["vicinity"],
    true,
  );

  expect(googlePlace.vicinity).toBeUndefined();
});

test("website should be empty if Contacts.Websites is missing", () => {
  const googlePlace = convertAmazonPlaceToGoogle(
    {
      Address: {
        Label: testPlaceWithAddressLabel,
        Country: {
          Code3: "USA",
          Name: "United States",
        },
      },
      PlaceId: "TEST_PLACE_ID",
      PlaceType: "PointOfInterest",
      Position: [testLng, testLat],
      PricingBucket: "",
      Title: "CoolPlace",
    },
    ["website"],
    true,
  );

  expect(googlePlace.website).toBeUndefined();
});

test("address component conversion should handle null input", () => {
  const addressComponents = convertGeocoderAddressComponentToAddressComponent(null);
  expect(addressComponents).toHaveLength(0);
});

test("plus code conversion should handle null input", () => {
  const plusCode = convertPlacePlusCodeToPlusCode(null);
  expect(plusCode).toBeNull();
});
