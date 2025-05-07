// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  MigrationAutocomplete,
  MigrationAutocompleteService,
  MigrationPlace,
  MigrationPlacesService,
  MigrationSearchBox,
} from "../src/places";
import {
  convertAmazonPlaceTypeToGoogle,
  convertGooglePlaceTypeToAmazon,
  getAllAmazonPlaceTypesFromGoogle,
} from "../src/places/index";
import { MigrationCircle, MigrationLatLng, MigrationLatLngBounds, PlacesServiceStatus } from "../src/common";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

// Set a fake system time so that any logic that creates a new Date.now (e.g. new Date())
// will be deterministic
jest.useFakeTimers().setSystemTime(new Date("2024-01-01T10:00:00.000Z"));

// Austin, TX :)
const testPlaceLabel = "Austin, TX, USA";
const testLat = 30.268193;
const testLng = -97.7457518;

const testPlaceWithAddressLabel = "1337 Cool Place Road, Austin, TX, USA";

const clientErrorQuery = "THIS_WILL_CAUSE_A_CLIENT_ERROR";

const mockedClientSendV1 = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof SearchPlaceIndexForTextCommand) {
      if (command.input.Text == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Results: [
            {
              Place: {
                Label: testPlaceLabel,
                Geometry: {
                  Point: [testLng, testLat],
                },
                TimeZone: {
                  Name: "CST",
                  Offset: -18000,
                },
                Categories: ["City"],
              },
              PlaceId: "KEEP_AUSTIN_WEIRD",
            },
          ],
        });
      }
    } else if (command instanceof SearchPlaceIndexForSuggestionsCommand) {
      if (command.input.Text == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Results: [
            {
              Text: "cool places near austin",
            },
            {
              PlaceId: "COOL_PLACE_1",
              Text: "123 cool place way, austin, tx",
            },
          ],
        });
      }
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-location", () => ({
  ...jest.requireActual("@aws-sdk/client-location"),
  LocationClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedClientSendV1,
    };
  }),
}));
import {
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForTextCommand,
} from "@aws-sdk/client-location";

const mockedClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof AutocompleteCommand) {
      if (command.input.QueryText == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          ResultItems: [
            {
              Highlights: {
                Title: [
                  {
                    StartIndex: 0,
                    EndIndex: 3,
                  },
                ],
                Address: {
                  Label: [
                    {
                      StartIndex: 0,
                      EndIndex: 3,
                    },
                  ],
                },
              },
              Address: {
                Label: "123 Cool Place Way, Austin, TX, United States",
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
                  Name: "Travis",
                },
                Locality: "Austin",
                District: "Fun",
                PostalCode: "78704-1144",
                Street: "Cool Place Way",
                StreetComponents: [
                  {
                    BaseName: "Cool Place",
                    Type: "Way",
                    TypePlacement: "AfterBaseName",
                    TypeSeparator: " ",
                    Language: "en",
                  },
                ],
                AddressNumber: "123",
              },
              Distance: 1337,
              FoodTypes: [
                {
                  LocalizedName: "Burgers",
                  Primary: true,
                },
              ],
              PlaceId: "COOL_PLACE_1",
              PlaceType: "PointOfInterest",
              Position: [testLng, testLat],
              Title: "123 Cool Place Way",
            },
          ],
        });
      }
    } else if (command instanceof GetPlaceCommand) {
      if (command.input.PlaceId === undefined || command.input.PlaceId === clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
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
              Name: "Cool SubRegion",
            },
            Locality: "Austin",
            District: "Cool District",
            PostalCode: "78704",
            Street: "Cool Place Road",
            AddressNumber: "1337",
          },
          Categories: [
            {
              Name: "Aquarium",
              LocalizedName: "Aquarium",
              Id: "aquarium",
              Primary: true,
            },
          ],
          Contacts: {
            Phones: [
              {
                Value: "+15121234567",
              },
            ],
            Websites: [
              {
                Value: "https://coolwebsite.com",
              },
            ],
          },
          MapView: [0, 1, 2, 3],
          OpeningHours: [
            {
              Display: ["Mon-Sun: 08:30 - 13:37"],
              OpenNow: true,
              Components: [
                {
                  OpenTime: "T083000",
                  OpenDuration: "PT05H07M",
                  Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
                },
              ],
            },
          ],
          PlaceId: "KEEP_AUSTIN_WEIRD",
          PlaceType: "PointOfInterest",
          Position: [testLng, testLat],
          TimeZone: {
            Name: "America/Chicago",
            Offset: "-05:00",
            OffsetSeconds: -18000,
          },
          Title: "1337 Cool Place Road",
        });
      }
    } else if (command instanceof SuggestCommand) {
      if (command.input.QueryText == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          ResultItems: [
            {
              Highlights: {
                Title: [
                  {
                    StartIndex: 0,
                    EndIndex: 3,
                  },
                ],
              },
              Query: {
                QueryId: "cool_query_id",
                QueryType: "Chain",
              },
              SuggestResultItemType: "Query",
              Title: "cool places near austin",
            },
            {
              Highlights: {
                Title: [
                  {
                    StartIndex: 0,
                    EndIndex: 3,
                  },
                ],
                Address: {
                  Label: [
                    {
                      StartIndex: 0,
                      EndIndex: 3,
                    },
                  ],
                },
              },
              Place: {
                Address: {
                  Label: "123 Cool Place Way, Austin, TX, United States",
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
                    Name: "Travis",
                  },
                  Locality: "Austin",
                  District: "Fun",
                  PostalCode: "78704-1144",
                  Street: "Cool Place Way",
                  StreetComponents: [
                    {
                      BaseName: "Cool Place",
                      Type: "Way",
                      TypePlacement: "AfterBaseName",
                      TypeSeparator: " ",
                      Language: "en",
                    },
                  ],
                  AddressNumber: "123",
                },
                Distance: 1337,
                FoodTypes: [
                  {
                    LocalizedName: "Burgers",
                    Primary: true,
                  },
                ],
                PlaceId: "COOL_PLACE_1",
                PlaceType: "PointOfInterest",
                Position: [testLng, testLat],
              },
              SuggestResultItemType: "Place",
              Title: "123 Cool Place Way",
            },
          ],
        });
      }
    } else if (command instanceof SearchNearbyCommand) {
      if (command.input.Language == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          ResultItems: [
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
                  Name: "Cool SubRegion",
                },
                Locality: "Austin",
                District: "Cool District",
                PostalCode: "78704",
                Street: "Cool Place Road",
                AddressNumber: "1337",
              },
              Categories: [
                {
                  Name: "Aquarium",
                  LocalizedName: "Aquarium",
                  Id: "aquarium",
                  Primary: true,
                },
              ],
              Contacts: {
                Phones: [
                  {
                    Value: "+15121234567",
                  },
                ],
                Websites: [
                  {
                    Value: "https://coolwebsite.com",
                  },
                ],
              },
              MapView: [0, 1, 2, 3],
              OpeningHours: [
                {
                  Display: ["Mon-Sun: 08:30 - 13:37"],
                  OpenNow: false,
                  Components: [
                    {
                      OpenTime: "T083000",
                      OpenDuration: "PT05H07M",
                      Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
                    },
                  ],
                },
              ],
              PlaceId: "KEEP_AUSTIN_WEIRD",
              PlaceType: "PointOfInterest",
              Position: [testLng, testLat],
              TimeZone: {
                Name: "America/Chicago",
                Offset: "-05:00",
                OffsetSeconds: -18000,
              },
              Title: "1337 Cool Place Road",
            },
          ],
        });
      }
    } else if (command instanceof SearchTextCommand) {
      if (command.input.QueryText == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          ResultItems: [
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
                  Name: "Cool SubRegion",
                },
                Locality: "Austin",
                District: "Cool District",
                PostalCode: "78704",
                Street: "Cool Place Road",
                AddressNumber: "1337",
              },
              Categories: [
                {
                  Name: "Aquarium",
                  LocalizedName: "Aquarium",
                  Id: "aquarium",
                  Primary: true,
                },
              ],
              Contacts: {
                Phones: [
                  {
                    Value: "+15121234567",
                  },
                ],
                Websites: [
                  {
                    Value: "https://coolwebsite.com",
                  },
                ],
              },
              MapView: [0, 1, 2, 3],
              OpeningHours: [
                {
                  Display: ["Mon-Sun: 08:30 - 13:37"],
                  OpenNow: true,
                  Components: [
                    {
                      OpenTime: "T083000",
                      OpenDuration: "PT05H07M",
                      Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
                    },
                  ],
                },
              ],
              PlaceId: "KEEP_AUSTIN_WEIRD",
              PlaceType: "PointOfInterest",
              Position: [testLng, testLat],
              TimeZone: {
                Name: "America/Chicago",
                Offset: "-05:00",
                OffsetSeconds: -18000,
              },
              Title: "1337 Cool Place Road",
            },
          ],
        });
      }
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-geo-places", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-places"),
  GeoPlacesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedClientSend,
    };
  }),
}));
import {
  AutocompleteCommand,
  AutocompleteRequest,
  GeoPlacesClient,
  GetPlaceCommand,
  SuggestCommand,
  SuggestRequest,
  SearchNearbyCommand,
  SearchNearbyRequest,
  SearchTextCommand,
  SearchTextRequest,
  GetPlaceRequest,
} from "@aws-sdk/client-geo-places";

const autocompleteService = new MigrationAutocompleteService();
autocompleteService._client = new GeoPlacesClient();
const placesService = new MigrationPlacesService();
placesService._client = new GeoPlacesClient();
MigrationPlace._client = new GeoPlacesClient();
MigrationSearchBox.prototype._client = new LocationClient();

afterEach(() => {
  jest.clearAllMocks();

  // Clear out the DOM of the body, since we add elements to it
  document.body.innerHTML = "";
});

test("findPlaceFromQuery should only return the requested fields", (done) => {
  const request = {
    query: "Austin, TX",
    fields: ["name", "geometry"],
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));

    const returnedLatLng = firstResult.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    expect(firstResult.formatted_address).toBeUndefined();
    expect(firstResult.reference).toBeUndefined();
    expect(firstResult.types).toBeUndefined();

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should return all fields when ALL are requested", (done) => {
  const request = {
    query: "Austin, TX",
    fields: ["ALL"],
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));

    const returnedLatLng = firstResult.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formatted_address).toStrictEqual(testPlaceWithAddressLabel);
    expect(firstResult.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(firstResult.reference).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(firstResult.types).toStrictEqual(["point_of_interest", "aquarium"]);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.LatLng", (done) => {
  const biasLat = 0;
  const biasLng = 1;
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: new MigrationLatLng(biasLat, biasLng),
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.BiasPosition?.[0]).toStrictEqual(biasLng);
    expect(clientInput.BiasPosition?.[1]).toStrictEqual(biasLat);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.LatLngLiteral", (done) => {
  const biasLat = 0;
  const biasLng = 1;
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: {
      lat: biasLat,
      lng: biasLng,
    },
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.BiasPosition?.[0]).toStrictEqual(biasLng);
    expect(clientInput.BiasPosition?.[1]).toStrictEqual(biasLat);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.LatLngBounds", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.LatLngBoundsLiteral", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: {
      east: east,
      north: north,
      west: west,
      south: south,
    },
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.Circle", (done) => {
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: new MigrationCircle({
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    }),
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.Filter?.Circle?.Center).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.Circle?.Radius).toStrictEqual(1337);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept locationBias as google.maps.CircleLiteral", (done) => {
  const request = {
    query: "Austin, TX",
    fields: ["name"],
    locationBias: {
      center: {
        lat: testLat,
        lng: testLng,
      },
      radius: 1337,
    },
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.Filter?.Circle?.Center).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.Circle?.Radius).toStrictEqual(1337);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should accept language", (done) => {
  const request = {
    query: "cool places in austin",
    fields: ["name"],
    language: "en",
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should handle client error", (done) => {
  const request = {
    query: clientErrorQuery,
    fields: ["name"],
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    expect(results).toHaveLength(0);
    expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);

    expect(console.error).toHaveBeenCalledTimes(1);

    // Signal the unit test is complete
    done();
  });
});

test("getDetails should return all fields by default", (done) => {
  const request = {
    placeId: "KEEP_AUSTIN_WEIRD",
  };

  placesService.getDetails(request, (result, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

    const returnedLatLng: MigrationLatLng = result.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    const returnedViewport: MigrationLatLngBounds = result.geometry.viewport;
    expect(returnedViewport.toJSON()).toStrictEqual({
      east: 2,
      north: 3,
      west: 0,
      south: 1,
    });
    expect(result.name).toStrictEqual("1337 Cool Place Road");
    expect(result.formatted_address).toStrictEqual(testPlaceWithAddressLabel);
    expect(result.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(result.reference).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(result.plus_code.global_code).toStrictEqual("86247793+7M");
    expect(result.plus_code.compound_code).toStrictEqual("7793+7M Austin, Texas");
    expect(result.adr_address).toStrictEqual(
      '<span class="street-address">1337 Cool Place Road</span>, <span class="locality">Austin</span>, <span class="region">TX</span>, <span class="postal-code">78704</span>, <span class="country-name">USA</span>',
    );
    expect(result.types).toStrictEqual(["point_of_interest", "aquarium"]);
    expect(result.formatted_phone_number).toStrictEqual("(512) 123-4567");
    expect(result.international_phone_number).toStrictEqual("+1 512 123 4567");
    expect(result.utc_offset).toStrictEqual(-300);
    expect(result.utc_offset_minutes).toStrictEqual(-300);
    expect(result.vicinity).toStrictEqual("1337 Cool Place Road, Austin");
    expect(result.website).toStrictEqual("https://coolwebsite.com");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Address components
    const addressComponents = result.address_components;
    expect(addressComponents[0].long_name).toStrictEqual("1337");
    expect(addressComponents[0].short_name).toStrictEqual("1337");
    expect(addressComponents[0].types).toStrictEqual(["street_number"]);
    expect(addressComponents[1].long_name).toStrictEqual("Cool Place Road");
    expect(addressComponents[1].short_name).toStrictEqual("Cool Place Road");
    expect(addressComponents[1].types).toStrictEqual(["route"]);
    expect(addressComponents[2].long_name).toStrictEqual("Cool District");
    expect(addressComponents[2].short_name).toStrictEqual("Cool District");
    expect(addressComponents[2].types).toStrictEqual(["neighborhood", "political"]);
    expect(addressComponents[3].long_name).toStrictEqual("Austin");
    expect(addressComponents[3].short_name).toStrictEqual("Austin");
    expect(addressComponents[3].types).toStrictEqual(["locality", "political"]);
    expect(addressComponents[4].long_name).toStrictEqual("Cool SubRegion");
    expect(addressComponents[4].short_name).toStrictEqual("Cool SubRegion");
    expect(addressComponents[4].types).toStrictEqual(["administrative_area_level_2", "political"]);
    expect(addressComponents[5].long_name).toStrictEqual("Texas");
    expect(addressComponents[5].short_name).toStrictEqual("TX");
    expect(addressComponents[5].types).toStrictEqual(["administrative_area_level_1", "political"]);
    expect(addressComponents[6].long_name).toStrictEqual("United States");
    expect(addressComponents[6].short_name).toStrictEqual("US");
    expect(addressComponents[6].types).toStrictEqual(["country", "political"]);
    expect(addressComponents[7].long_name).toStrictEqual("78704");
    expect(addressComponents[7].short_name).toStrictEqual("78704");
    expect(addressComponents[7].types).toStrictEqual(["postal_code"]);

    // Opening hours
    const openingHours: google.maps.places.PlaceOpeningHours = result.opening_hours;
    const periods = openingHours.periods;

    expect(periods).toBeDefined();
    if (periods) {
      for (let index = 0; index < periods.length; index++) {
        const period = periods[index];

        expect(period.open.day).toStrictEqual(index);
        expect(period.open.hours).toStrictEqual(8);
        expect(period.open.minutes).toStrictEqual(30);
        expect(period.open.time).toStrictEqual("0830");

        expect(period.close?.day).toStrictEqual(index);
        expect(period.close?.hours).toStrictEqual(13);
        expect(period.close?.minutes).toStrictEqual(37);
        expect(period.close?.time).toStrictEqual("1337");
      }
    }

    expect(openingHours).toBeDefined();
    expect(openingHours.weekday_text).toStrictEqual([
      "Monday: 8:30 AM - 1:37 PM",
      "Tuesday: 8:30 AM - 1:37 PM",
      "Wednesday: 8:30 AM - 1:37 PM",
      "Thursday: 8:30 AM - 1:37 PM",
      "Friday: 8:30 AM - 1:37 PM",
      "Saturday: 8:30 AM - 1:37 PM",
      "Sunday: 8:30 AM - 1:37 PM",
    ]);

    // Will test these below in convertAmazonOpeningHoursToGoogle tests because open_now could be different
    // depending on what time the tests are run, since it is calculated based on the current time
    expect(openingHours.isOpen).toBeDefined();
    expect(openingHours.open_now).toBeDefined();

    // Signal the unit test is complete
    done();
  });
});

test("getDetails should only return the requested fields", (done) => {
  const request = {
    placeId: "KEEP_AUSTIN_WEIRD",
    fields: ["name", "vicinity", "place_id"],
  };

  placesService.getDetails(request, (result, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

    expect(result.name).toStrictEqual("1337 Cool Place Road");
    expect(result.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(result.vicinity).toStrictEqual("1337 Cool Place Road, Austin");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    expect(result.geometry).toBeUndefined();
    expect(result.formatted_address).toBeUndefined();
    expect(result.plus_code).toBeUndefined();
    expect(result.adr_address).toBeUndefined();
    expect(result.formatted_phone_number).toBeUndefined();
    expect(result.international_phone_number).toBeUndefined();
    expect(result.address_components).toBeUndefined();
    expect(result.website).toBeUndefined();
    expect(result.opening_hours).toBeUndefined();
    expect(result.reference).toBeUndefined();
    expect(result.types).toBeUndefined();
    expect(result.utc_offset).toBeUndefined();
    expect(result.utc_offset_minutes).toBeUndefined();

    // Signal the unit test is complete
    done();
  });
});

test("getDetails should handle client error", (done) => {
  const request = {
    placeId: undefined,
  };

  placesService.getDetails(request, (result, status) => {
    expect(result).toBeNull();
    expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);

    expect(console.error).toHaveBeenCalledTimes(1);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should use radius if no bounds is set", (done) => {
  const request: google.maps.places.PlaceSearchRequest = {
    location: new MigrationLatLng(testLat, testLng),
    radius: 1337,
    type: "aquarium",
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();

    const returnedLatLng: MigrationLatLng = firstResult.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    const returnedViewport: MigrationLatLngBounds = firstResult.geometry.viewport;
    expect(returnedViewport.toJSON()).toStrictEqual({
      east: 2,
      north: 3,
      west: 0,
      south: 1,
    });
    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formatted_address).toStrictEqual(testPlaceWithAddressLabel);
    expect(firstResult.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(firstResult.reference).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(firstResult.plus_code.global_code).toStrictEqual("86247793+7M");
    expect(firstResult.plus_code.compound_code).toStrictEqual("7793+7M Austin, Texas");
    expect(firstResult.adr_address).toStrictEqual(
      '<span class="street-address">1337 Cool Place Road</span>, <span class="locality">Austin</span>, <span class="region">TX</span>, <span class="postal-code">78704</span>, <span class="country-name">USA</span>',
    );
    expect(firstResult.types).toStrictEqual(["point_of_interest", "aquarium"]);
    expect(firstResult.formatted_phone_number).toStrictEqual("(512) 123-4567");
    expect(firstResult.international_phone_number).toStrictEqual("+1 512 123 4567");
    expect(firstResult.utc_offset).toStrictEqual(-300);
    expect(firstResult.utc_offset_minutes).toStrictEqual(-300);
    expect(firstResult.vicinity).toStrictEqual("1337 Cool Place Road, Austin");
    expect(firstResult.website).toStrictEqual("https://coolwebsite.com");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should accept bounds as a literal", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request: google.maps.places.PlaceSearchRequest = {
    bounds: { east: east, north: north, south: south, west: west },
    type: "aquarium",
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.QueryRadius).toBeUndefined();

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should ignore radius if bounds was also specified", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const testBounds = new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east));
  const request: google.maps.places.PlaceSearchRequest = {
    location: new MigrationLatLng(testLat, testLng),
    radius: 1337,
    type: "aquarium",
    bounds: testBounds,
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    const testBoundsCenter = testBounds.getCenter();
    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.QueryPosition).toStrictEqual([testBoundsCenter.lng(), testBoundsCenter.lat()]);
    expect(clientInput.QueryRadius).toBeUndefined();

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should accept language", (done) => {
  const request: google.maps.places.PlaceSearchRequest = {
    location: new MigrationLatLng(testLat, testLng),
    radius: 1337,
    type: "aquarium",
    language: "en",
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should omit places that are closed if openNow is specified", (done) => {
  const request: google.maps.places.PlaceSearchRequest = {
    location: new MigrationLatLng(testLat, testLng),
    radius: 1337,
    type: "aquarium",
    openNow: true,
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results.length).toStrictEqual(0);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("nearbySearch should handle client error", (done) => {
  const request: google.maps.places.PlaceSearchRequest = {
    language: clientErrorQuery,
  };

  placesService.nearbySearch(request, (results, status) => {
    expect(results).toHaveLength(0);
    expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);

    expect(console.error).toHaveBeenCalledTimes(1);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should ignore location if bounds was also specified", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "cool places in austin",
    bounds: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
    location: new MigrationLatLng(4, 5),
  };

  placesService.textSearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should accept bounds as a literal", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "cool places in austin",
    bounds: { east: east, north: north, south: south, west: west },
  };

  placesService.textSearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should accept location bias if there is no bounds specified", (done) => {
  const request = {
    query: "cool places in austin",
    location: new MigrationLatLng(testLat, testLng),
  };

  placesService.textSearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should bias towards a circle if both location and radius are specified", (done) => {
  const request = {
    query: "cool places in austin",
    location: { lat: testLat, lng: testLng },
    radius: 1337,
  };

  placesService.textSearch(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toStrictEqual({
      Center: [testLng, testLat],
      Radius: 1337,
    });

    expect(results.length).toStrictEqual(1);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should accept language", (done) => {
  const request = {
    query: "cool places in austin",
    location: new MigrationLatLng(testLat, testLng),
    language: "en",
  };

  placesService.textSearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should convert region to countries filter", (done) => {
  const request = {
    query: "cool places in austin",
    location: new MigrationLatLng(testLat, testLng),
    region: "us",
  };

  placesService.textSearch(request, (results, status) => {
    expect(results.length).toStrictEqual(1);
    const firstResult = results[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.IncludeCountries).toStrictEqual(["us"]);

    expect(firstResult.name).toStrictEqual("1337 Cool Place Road");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("textSearch should handle client error", (done) => {
  const request = {
    query: clientErrorQuery,
  };

  placesService.textSearch(request, (results, status) => {
    expect(results).toHaveLength(0);
    expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);

    expect(console.error).toHaveBeenCalledTimes(1);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept locationBias as LatLng", (done) => {
  const request = {
    input: "cool place",
    locationBias: new MigrationLatLng(testLat, testLng),
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const firstTerms = firstResult.terms;
    expect(firstTerms.length).toStrictEqual(1);
    expect(firstTerms[0].offset).toStrictEqual(0);
    expect(firstTerms[0].value).toStrictEqual("cool places near austin");

    const firstMatchedSubstrings = firstResult.matched_substrings;
    expect(firstMatchedSubstrings.length).toStrictEqual(1);
    expect(firstMatchedSubstrings[0].offset).toStrictEqual(0);
    expect(firstMatchedSubstrings[0].length).toStrictEqual(3);

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 Cool Place Way, Austin, TX, United States");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

    const secondTerms = secondResult.terms;
    expect(secondTerms.length).toStrictEqual(4);
    expect(secondTerms[0].offset).toStrictEqual(0);
    expect(secondTerms[0].value).toStrictEqual("123 Cool Place Way");
    expect(secondTerms[1].offset).toStrictEqual(20);
    expect(secondTerms[1].value).toStrictEqual("Austin");
    expect(secondTerms[2].offset).toStrictEqual(28);
    expect(secondTerms[2].value).toStrictEqual("TX");
    expect(secondTerms[3].offset).toStrictEqual(32);
    expect(secondTerms[3].value).toStrictEqual("United States");

    const secondMatchedSubstrings = secondResult.matched_substrings;
    expect(secondMatchedSubstrings.length).toStrictEqual(1);
    expect(secondMatchedSubstrings[0].offset).toStrictEqual(0);
    expect(secondMatchedSubstrings[0].length).toStrictEqual(3);

    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept locationBias as LatLngLiteral", (done) => {
  const request = {
    input: "cool place",
    locationBias: { lat: testLat, lng: testLng },
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept locationBias as LatLngBounds", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    input: "cool place",
    locationBias: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept locationBias as LatLngBoundsLiteral", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    input: "cool place",
    locationBias: { east: east, north: north, south: south, west: west },
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should ignore location if bounds was also specified", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    input: "cool place",
    bounds: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
    location: new MigrationLatLng(4, 5),
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept bounds as a literal", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    input: "cool place",
    bounds: { east: east, north: north, south: south, west: west },
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept location if there is no bounds specified", (done) => {
  const request = {
    input: "cool place",
    location: new MigrationLatLng(testLat, testLng),
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should bias towards a circle if both location and radius are specified", (done) => {
  const request = {
    input: "cool place",
    location: { lat: testLat, lng: testLng },
    radius: 1337,
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toStrictEqual({
      Center: [testLng, testLat],
      Radius: 1337,
    });

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should accept language", (done) => {
  const request = {
    input: "cool place",
    location: new MigrationLatLng(testLat, testLng),
    language: "en",
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SuggestCommand));
    const clientInput: SuggestRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(results.length).toStrictEqual(2);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getQueryPredictions should handle client error", (done) => {
  const request = {
    input: clientErrorQuery,
  };

  autocompleteService.getQueryPredictions(request, (results, status) => {
    expect(results).toHaveLength(0);
    expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);

    expect(console.error).toHaveBeenCalledTimes(1);

    // Signal the unit test is complete
    done();
  });
});

test("getPlacePredictions will also invoke the callback if specified", (done) => {
  const request = {
    input: "cool place",
    locationBias: new MigrationLatLng(testLat, testLng),
  };

  autocompleteService
    .getPlacePredictions(request, (results, status) => {
      expect(results!.length).toStrictEqual(1);

      const firstResult = results![0];
      expect(firstResult.description).toStrictEqual("123 Cool Place Way, Austin, TX, United States");
      expect(firstResult.place_id).toStrictEqual("COOL_PLACE_1");

      expect(status).toStrictEqual(PlacesServiceStatus.OK);
    })
    .then((response) => {
      expect(mockedClientSend).toHaveBeenCalledTimes(1);
      expect(mockedClientSend).toHaveBeenCalledWith(expect.any(AutocompleteCommand));
      const clientInput: AutocompleteRequest = mockedClientSend.mock.calls[0][0].input;

      expect(clientInput.Filter?.BoundingBox).toBeUndefined();
      expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

      const predictions = response.predictions;
      expect(predictions.length).toStrictEqual(1);

      const prediction = predictions[0];
      expect(prediction.description).toStrictEqual("123 Cool Place Way, Austin, TX, United States");
      expect(prediction.place_id).toStrictEqual("COOL_PLACE_1");

      // Signal the unit test is complete
      done();
    });
});

test("getPlacePredictions should accept language", (done) => {
  const request = {
    input: "cool place",
    location: new MigrationLatLng(testLat, testLng),
    language: "fr",
  };

  autocompleteService.getPlacePredictions(request, (results, status) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(AutocompleteCommand));
    const clientInput: AutocompleteRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("fr");

    expect(results!.length).toStrictEqual(1);
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("getPlacePredictions should handle client error", (done) => {
  const request = {
    input: clientErrorQuery,
  };

  autocompleteService
    .getPlacePredictions(request, (results, status) => {
      expect(results).toHaveLength(0);
      expect(status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);
    })
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("SearchBox should have no places before a search is done", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const searchBox = new MigrationSearchBox(inputElement);

  expect(searchBox.getPlaces()).toBeUndefined();
});

test("SearchBox created input element will carry-over placeholder if one was set", () => {
  const inputElement = document.createElement("input");
  inputElement.placeholder = "Test placeholder";
  document.body.appendChild(inputElement);

  const searchBox = new MigrationSearchBox(inputElement);

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder._inputEl.placeholder).toStrictEqual("Test placeholder");
});

test("SearchBox created input element will carry-over id if one was set", () => {
  const inputElement = document.createElement("input");
  inputElement.id = "test-id";
  document.body.appendChild(inputElement);

  const searchBox = new MigrationSearchBox(inputElement);

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder._inputEl.id).toStrictEqual("test-id");
});

test("SearchBox created container should transfer className if specified", () => {
  const inputElement = document.createElement("input");
  inputElement.className = "this-is-a-test";
  document.body.appendChild(inputElement);

  const searchBox = new MigrationSearchBox(inputElement);

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder.container.className).toContain("this-is-a-test");
});

test("SearchBox should be able to set and get the bounds option", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const bounds = new MigrationLatLngBounds({ east: 0, north: 1, south: 2, west: 3 });
  const searchBox = new MigrationSearchBox(inputElement, {
    bounds: bounds,
  });

  const otherBounds = searchBox.getBounds();

  expect(bounds.equals(otherBounds)).toStrictEqual(true);
});

test("SearchBox should return first suggestion result when pressing Enter", (done) => {
  // We need to re-enable real timers for this test because the underlying geocoder widget relies on it
  jest.useRealTimers();

  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {
    bounds: { east: 0, north: 1, south: 2, west: 3 },
  });

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    expect(places.length).toStrictEqual(1);
    expect(mockedClientSendV1).toHaveBeenCalledTimes(2);

    const place = places[0];

    expect(place.formatted_address).toStrictEqual(testPlaceLabel);
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");

    // Once this test is done we re-enable our fake timers
    jest.useFakeTimers();

    done();
  });

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    which: 13,
    keyCode: 13,
  });
  geocoder._inputEl.dispatchEvent(event);
});

test("SearchBox should handle single place result when clicked on", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {
    bounds: { east: 0, north: 1, south: 2, west: 3 },
  });

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    expect(places.length).toStrictEqual(1);
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);

    const place = places[0];

    expect(place.formatted_address).toStrictEqual("1337 Cool Place Road, Austin, TX, USA");
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");

    done();
  });

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  // We have to emulate the user clicking on a single result by triggering
  // the geocoder's event emitter directly
  geocoder._eventEmitter.emit("results", {
    place: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Place: {
          Label: testPlaceWithAddressLabel,
          AddressNumber: "1337",
          Street: "Cool Place Road",
          Geometry: {
            Point: [testLng, testLat],
          },
          Municipality: "Austin",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
      },
    },
  });
});

test("SearchBox should handle user selecting an item from the list after choosing a query string", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {
    bounds: { east: 0, north: 1, south: 2, west: 3 },
  });

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    expect(places.length).toStrictEqual(1);
    expect(mockedClientSendV1).toHaveBeenCalledTimes(1);

    const place = places[0];

    expect(place.formatted_address).toStrictEqual("1337 Cool Place Road, Austin, TX, USA");
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");

    done();
  });

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  // We have to emulate the user clicking on an item from the list
  // after choosing a query string by triggering
  // the geocoder's event emitter directly
  geocoder._eventEmitter.emit("result", {
    result: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Place: {
          Label: testPlaceWithAddressLabel,
          AddressNumber: "1337",
          Street: "Cool Place Road",
          Geometry: {
            Point: [testLng, testLat],
          },
          Municipality: "Austin",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
      },
    },
  });
});

test("Autocomplete should have no places before a search is done", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);

  expect(autoComplete.getPlace()).toBeUndefined();
});

test("Autocomplete created input element will carry-over placeholder if one was set", () => {
  const inputElement = document.createElement("input");
  inputElement.placeholder = "Test placeholder";
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder._inputEl.placeholder).toStrictEqual("Test placeholder");
});

test("Autocomplete created input element will carry-over id if one was set", () => {
  const inputElement = document.createElement("input");
  inputElement.id = "test-id";
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder._inputEl.id).toStrictEqual("test-id");
});

test("Autocomplete created container should transfer className if specified", () => {
  const inputElement = document.createElement("input");
  inputElement.className = "this-is-a-test";
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();

  expect(geocoder.container.className).toContain("this-is-a-test");
});

test("Autocomplete should be able to set and get the bounds option", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const bounds = new MigrationLatLngBounds({ east: 0, north: 1, south: 2, west: 3 });
  const autoComplete = new MigrationAutocomplete(inputElement, {
    bounds: bounds,
  });

  const otherBounds = autoComplete.getBounds();

  expect(bounds.equals(otherBounds)).toStrictEqual(true);
});

test("Autocomplete should be able to set bounds through initial options", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const bounds = new MigrationLatLngBounds({ east: 0, north: 1, south: 2, west: 3 });
  const autoComplete = new MigrationAutocomplete(inputElement, {
    bounds: bounds,
    strictBounds: true,
  });

  const otherBounds = autoComplete.getBounds();

  expect(bounds.equals(otherBounds)).toStrictEqual(true);
});

test("Autocomplete should use strict bounds when specified", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const bounds = new MigrationLatLngBounds({ east: east, north: north, south: south, west: west });
  const autoComplete = new MigrationAutocomplete(inputElement, {
    bounds: bounds,
    strictBounds: true,
  });

  const geocoder = autoComplete._getMaplibreGeocoder();
  const boundingBox = geocoder.getBoundingBox();

  expect(boundingBox.longitudeSW).toStrictEqual(west);
  expect(boundingBox.latitudeSW).toStrictEqual(south);
  expect(boundingBox.longitudeNE).toStrictEqual(east);
  expect(boundingBox.latitudeNE).toStrictEqual(north);
});

test("Autocomplete should be able to set and get the fields option", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);

  // The fields value should be undefined by default
  expect(autoComplete.getFields()).toBeUndefined();

  autoComplete.setFields(["name", "place_id"]);

  const fields = autoComplete.getFields();
  expect(fields).toStrictEqual(["name", "place_id"]);
});

test("Autocomplete should be able to set fields through initial options", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement, {
    fields: ["name", "formatted_address"],
  });

  const fields = autoComplete.getFields();
  expect(fields).toStrictEqual(["name", "formatted_address"]);
});

test("Autocomplete should handle single place result when clicked on", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const autoComplete = new MigrationAutocomplete(inputElement);

  autoComplete.addListener("place_changed", () => {
    const place = autoComplete.getPlace();

    expect(place).toBeDefined();
    expect(place.formatted_address).toStrictEqual("1337 Cool Place Road, Austin, TX, USA");
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");

    done();
  });

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  // We have to emulate the user clicking on a single result by triggering
  // the geocoder's event emitter directly
  geocoder._eventEmitter.emit("results", {
    place: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Place: {
          Label: testPlaceWithAddressLabel,
          AddressNumber: "1337",
          Street: "Cool Place Road",
          Geometry: {
            Point: [testLng, testLat],
          },
          Municipality: "Austin",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
      },
    },
  });
});

test("Autocomplete should only reply with all fields if none are specified for single result", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const autoComplete = new MigrationAutocomplete(inputElement);

  autoComplete.addListener("place_changed", () => {
    const place = autoComplete.getPlace();

    expect(place).toBeDefined();
    expect(place.formatted_address).toBeDefined();
    expect(place.geometry).toBeDefined();
    expect(place.reference).toBeDefined();
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(place.name).toStrictEqual("1337 Cool Place Road");

    done();
  });

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  // We have to emulate the user clicking on a single result by triggering
  // the geocoder's event emitter directly
  geocoder._eventEmitter.emit("result", {
    result: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Place: {
          Label: testPlaceWithAddressLabel,
          AddressNumber: "1337",
          Street: "Cool Place Road",
          Geometry: {
            Point: [testLng, testLat],
          },
          Municipality: "Austin",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
      },
    },
  });
});

test("Autocomplete should only reply with the fields that are specified", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const autoComplete = new MigrationAutocomplete(inputElement, {
    fields: ["name", "place_id"],
  });

  autoComplete.addListener("place_changed", () => {
    const place = autoComplete.getPlace();

    expect(place).toBeDefined();
    expect(place.formatted_address).toBeUndefined();
    expect(place.geometry).toBeUndefined();
    expect(place.reference).toBeUndefined();
    expect(place.utc_offset).toBeUndefined();
    expect(place.vicinity).toBeUndefined();
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(place.name).toStrictEqual("1337 Cool Place Road");

    done();
  });

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder.setInput("austin");

  // We have to emulate the user clicking on a single result by triggering
  // the geocoder's event emitter directly
  geocoder._eventEmitter.emit("result", {
    result: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Place: {
          Label: testPlaceWithAddressLabel,
          AddressNumber: "1337",
          Street: "Cool Place Road",
          Geometry: {
            Point: [testLng, testLat],
          },
          Municipality: "Austin",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
      },
    },
  });
});

test("searchByText should ignore locationBias if locationRestriction was also specified", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "cool places in austin",
    locationRestriction: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
    locationBias: new MigrationLatLng(4, 5),
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
    expect(firstResult.utcOffsetMinutes).toStrictEqual(-300);

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept bounds as a literal", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    textQuery: "cool places in austin",
    locationRestriction: { east: east, north: north, south: south, west: west },
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept location bias if there is no bounds specified", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLng(testLat, testLng),
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept locationBias as LatLngLiteral", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: {
      lat: testLat,
      lng: testLng,
    },
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept locationBias as LatLngBounds", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLngBounds(new MigrationLatLng(south, west), new MigrationLatLng(north, east)),
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept locationBias as LatLngBoundsLiteral", (done) => {
  const east = 0;
  const north = 1;
  const south = 2;
  const west = 3;
  const request = {
    query: "cool places in austin",
    locationBias: { east: east, north: north, south: south, west: west },
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.BoundingBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();
    expect(clientInput.Filter?.Circle).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept locationBias as Circle", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationCircle({
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    }),
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.Circle?.Center).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.Circle?.Radius).toStrictEqual(1337);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept locationBias as CircleLiteral", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.Filter?.Circle?.Center).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.Circle?.Radius).toStrictEqual(1337);
    expect(clientInput.Filter?.BoundingBox).toBeUndefined();
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should only return the specified fields", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLng(testLat, testLng),
    fields: ["displayName"],
    language: "en",
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formattedAddress).toBeUndefined();

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept language", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLng(testLat, testLng),
    fields: ["*"],
    language: "en",
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.requestedLanguage).toStrictEqual("en");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept maxResultCount", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLng(testLat, testLng),
    fields: ["*"],
    maxResultCount: 4,
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.MaxResults).toStrictEqual(4);

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should accept region", (done) => {
  const request = {
    query: "cool places in austin",
    locationBias: new MigrationLatLng(testLat, testLng),
    fields: ["*"],
    region: "fr",
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    const clientInput: SearchTextRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Filter?.IncludeCountries).toStrictEqual(["fr"]);

    expect(firstResult.requestedRegion).toStrictEqual("fr");

    // Signal the unit test is complete
    done();
  });
});

test("Place object toJSON will return all fields when specified", (done) => {
  const request = {
    query: "cool places in austin",
    fields: ["*"],
    maxResultCount: 4,
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    const jsonObject = firstResult.toJSON();

    expect(jsonObject).toMatchObject({
      id: "KEEP_AUSTIN_WEIRD",
      addressComponents: [
        { longText: "1337", shortText: "1337", types: ["street_number"] },
        {
          longText: "Cool Place Road",
          shortText: "Cool Place Road",
          types: ["route"],
        },
        {
          longText: "Cool District",
          shortText: "Cool District",
          types: ["neighborhood", "political"],
        },
        { longText: "Austin", shortText: "Austin", types: ["locality", "political"] },
        {
          longText: "Cool SubRegion",
          shortText: "Cool SubRegion",
          types: ["administrative_area_level_2", "political"],
        },
        { longText: "Texas", shortText: "TX", types: ["administrative_area_level_1", "political"] },
        { longText: "United States", shortText: "US", types: ["country", "political"] },
        { longText: "78704", shortText: "78704", types: ["postal_code"] },
      ],
      adrFormatAddress:
        '<span class="street-address">1337 Cool Place Road</span>, <span class="locality">Austin</span>, <span class="region">TX</span>, <span class="postal-code">78704</span>, <span class="country-name">USA</span>',
      displayName: "1337 Cool Place Road",
      formattedAddress: "1337 Cool Place Road, Austin, TX, USA",
      internationalPhoneNumber: "+1 512 123 4567",
      location: { lat: testLat, lng: testLng },
      nationalPhoneNumber: "(512) 123-4567",
      openingHours: {
        weekdayDescriptions: [
          "Monday: 8:30 AM - 1:37 PM",
          "Tuesday: 8:30 AM - 1:37 PM",
          "Wednesday: 8:30 AM - 1:37 PM",
          "Thursday: 8:30 AM - 1:37 PM",
          "Friday: 8:30 AM - 1:37 PM",
          "Saturday: 8:30 AM - 1:37 PM",
          "Sunday: 8:30 AM - 1:37 PM",
        ],
        periods: [
          {
            close: {
              day: 0,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 0,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 1,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 1,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 2,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 2,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 3,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 3,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 4,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 4,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 5,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 5,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 6,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 6,
              hour: 8,
              minute: 30,
            },
          },
        ],
      },
      plusCode: { compoundCode: "7793+7M Austin, Texas", globalCode: "86247793+7M" },
      regularOpeningHours: {
        weekdayDescriptions: [
          "Monday: 8:30 AM - 1:37 PM",
          "Tuesday: 8:30 AM - 1:37 PM",
          "Wednesday: 8:30 AM - 1:37 PM",
          "Thursday: 8:30 AM - 1:37 PM",
          "Friday: 8:30 AM - 1:37 PM",
          "Saturday: 8:30 AM - 1:37 PM",
          "Sunday: 8:30 AM - 1:37 PM",
        ],
        periods: [
          {
            close: {
              day: 0,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 0,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 1,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 1,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 2,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 2,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 3,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 3,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 4,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 4,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 5,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 5,
              hour: 8,
              minute: 30,
            },
          },
          {
            close: {
              day: 6,
              hour: 13,
              minute: 37,
            },
            open: {
              day: 6,
              hour: 8,
              minute: 30,
            },
          },
        ],
      },
      types: ["point_of_interest", "aquarium"],
      utcOffsetMinutes: -300,
      viewport: {
        east: 2,
        north: 3,
        west: 0,
        south: 1,
      },
      websiteURI: "https://coolwebsite.com",
    });

    // Signal the unit test is complete
    done();
  });
});

test("Place object toJSON will return only specified fields", (done) => {
  const request = {
    query: "cool places in austin",
    fields: ["displayName"],
    maxResultCount: 4,
  };

  MigrationPlace.searchByText(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    const jsonObject = firstResult.toJSON();

    expect(jsonObject).toMatchObject({
      id: "KEEP_AUSTIN_WEIRD",
      displayName: "1337 Cool Place Road",
    });

    // Signal the unit test is complete
    done();
  });
});

test("searchByText should handle client error", (done) => {
  const request = {
    query: clientErrorQuery,
    fields: ["*"],
  };

  MigrationPlace.searchByText(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("fetchFields should return only specified fields", async () => {
  const newPlace = new MigrationPlace({
    id: "KEEP_AUSTIN_WEIRD",
  });

  // Properties on the newPlace instance should be null before calling fetchFields
  expect(newPlace.displayName).toBeUndefined();
  expect(newPlace.formattedAddress).toBeUndefined();
  expect(newPlace.location).toBeUndefined();

  const { place } = await newPlace.fetchFields({
    fields: ["formattedAddress", "location"],
  });

  expect(mockedClientSend).toHaveBeenCalledTimes(1);
  expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

  // Properties for the requested fields on the newPlace instance should
  // be filled in after calling fetchFields
  expect(newPlace.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
  expect(newPlace.location?.equals(new MigrationLatLng(testLat, testLng))).toStrictEqual(true);

  // Properties for fields that weren't requested should still be null
  expect(newPlace.displayName).toBeUndefined();

  // Properties should be the same on the place object that is returned from the promise
  expect(place.displayName).toBeUndefined();
  expect(place.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
  expect(place.location?.equals(new MigrationLatLng(testLat, testLng))).toStrictEqual(true);
});

test("fetchFields should return all fields if specified", async () => {
  const newPlace = new MigrationPlace({
    id: "KEEP_AUSTIN_WEIRD",
  });

  // Properties on the newPlace instance should be null before calling fetchFields
  expect(newPlace.displayName).toBeUndefined();
  expect(newPlace.formattedAddress).toBeUndefined();
  expect(newPlace.location).toBeUndefined();
  expect(newPlace.utcOffsetMinutes).toBeUndefined();

  const { place } = await newPlace.fetchFields({
    fields: ["*"],
  });

  expect(mockedClientSend).toHaveBeenCalledTimes(1);
  expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

  // Properties for all fields on the newPlace instance should
  // be filled in after calling fetchFields
  expect(newPlace.displayName).toStrictEqual("1337 Cool Place Road");
  expect(newPlace.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
  expect(newPlace.location?.equals(new MigrationLatLng(testLat, testLng))).toStrictEqual(true);
  expect(newPlace.utcOffsetMinutes).toStrictEqual(-300);

  // Properties should be the same on the place object that is returned from the promise
  expect(place.displayName).toStrictEqual("1337 Cool Place Road");
  expect(place.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
  expect(place.location?.equals(new MigrationLatLng(testLat, testLng))).toStrictEqual(true);
  expect(place.utcOffsetMinutes).toStrictEqual(-300);
});

test("fetchFields should pass language if specified", async () => {
  const newPlace = new MigrationPlace({
    id: "KEEP_AUSTIN_WEIRD",
    requestedLanguage: "en",
  });

  await newPlace.fetchFields({
    fields: ["*"],
  });

  expect(mockedClientSend).toHaveBeenCalledTimes(1);
  expect(mockedClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
  const clientInput: GetPlaceRequest = mockedClientSend.mock.calls[0][0].input;

  expect(clientInput.Language).toStrictEqual("en");

  // Properties for all fields on the newPlace instance should
  // be filled in after calling fetchFields
  expect(newPlace.displayName).toStrictEqual("1337 Cool Place Road");
  expect(newPlace.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
  expect(newPlace.location?.equals(new MigrationLatLng(testLat, testLng))).toStrictEqual(true);
  expect(newPlace.utcOffsetMinutes).toStrictEqual(-300);
});

test("fetchFields should handle client error", (done) => {
  const newPlace = new MigrationPlace({
    id: clientErrorQuery,
  });

  newPlace
    .fetchFields({
      fields: ["*"],
    })
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("searchNearby should parse all fields when * is specified", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: new MigrationCircle({
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    }),
    fields: ["*"],
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);

    // Address components
    const addressComponents = firstResult.addressComponents;
    expect(addressComponents![0].longText).toStrictEqual("1337");
    expect(addressComponents![0].shortText).toStrictEqual("1337");
    expect(addressComponents![0].types).toStrictEqual(["street_number"]);
    expect(addressComponents![1].longText).toStrictEqual("Cool Place Road");
    expect(addressComponents![1].shortText).toStrictEqual("Cool Place Road");
    expect(addressComponents![1].types).toStrictEqual(["route"]);
    expect(addressComponents![2].longText).toStrictEqual("Cool District");
    expect(addressComponents![2].shortText).toStrictEqual("Cool District");
    expect(addressComponents![2].types).toStrictEqual(["neighborhood", "political"]);
    expect(addressComponents![3].longText).toStrictEqual("Austin");
    expect(addressComponents![3].shortText).toStrictEqual("Austin");
    expect(addressComponents![3].types).toStrictEqual(["locality", "political"]);
    expect(addressComponents![4].longText).toStrictEqual("Cool SubRegion");
    expect(addressComponents![4].shortText).toStrictEqual("Cool SubRegion");
    expect(addressComponents![4].types).toStrictEqual(["administrative_area_level_2", "political"]);
    expect(addressComponents![5].longText).toStrictEqual("Texas");
    expect(addressComponents![5].shortText).toStrictEqual("TX");
    expect(addressComponents![5].types).toStrictEqual(["administrative_area_level_1", "political"]);
    expect(addressComponents![6].longText).toStrictEqual("United States");
    expect(addressComponents![6].shortText).toStrictEqual("US");
    expect(addressComponents![6].types).toStrictEqual(["country", "political"]);
    expect(addressComponents![7].longText).toStrictEqual("78704");
    expect(addressComponents![7].shortText).toStrictEqual("78704");
    expect(addressComponents![7].types).toStrictEqual(["postal_code"]);

    // Opening hours
    const openingHours = firstResult.regularOpeningHours;
    const periods = openingHours?.periods;
    expect(periods).toBeDefined();
    if (periods) {
      for (let index = 0; index < periods.length; index++) {
        const period = periods[index];

        expect(period.open.day).toStrictEqual(index);
        expect(period.open.hour).toStrictEqual(8);
        expect(period.open.minute).toStrictEqual(30);

        expect(period.close?.day).toStrictEqual(index);
        expect(period.close?.hour).toStrictEqual(13);
      }
    }
    expect(openingHours?.weekdayDescriptions).toStrictEqual([
      "Monday: 8:30 AM - 1:37 PM",
      "Tuesday: 8:30 AM - 1:37 PM",
      "Wednesday: 8:30 AM - 1:37 PM",
      "Thursday: 8:30 AM - 1:37 PM",
      "Friday: 8:30 AM - 1:37 PM",
      "Saturday: 8:30 AM - 1:37 PM",
      "Sunday: 8:30 AM - 1:37 PM",
    ]);
    expect(firstResult.regularOpeningHours).toStrictEqual(firstResult.openingHours);

    expect(firstResult.adrFormatAddress).toStrictEqual(
      '<span class="street-address">1337 Cool Place Road</span>, <span class="locality">Austin</span>, <span class="region">TX</span>, <span class="postal-code">78704</span>, <span class="country-name">USA</span>',
    );
    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);
    expect(firstResult.internationalPhoneNumber).toStrictEqual("+1 512 123 4567");
    expect(firstResult.location?.lat()).toStrictEqual(testLat);
    expect(firstResult.location?.lng()).toStrictEqual(testLng);
    expect(firstResult.nationalPhoneNumber).toStrictEqual("(512) 123-4567");
    expect(firstResult.plusCode?.globalCode).toStrictEqual("86247793+7M");
    expect(firstResult.plusCode?.compoundCode).toStrictEqual("7793+7M Austin, Texas");
    expect(firstResult.types).toStrictEqual(["point_of_interest", "aquarium"]);
    expect(firstResult.utcOffsetMinutes).toStrictEqual(-300);
    const returnedViewport = firstResult.viewport;
    expect(returnedViewport?.toJSON()).toStrictEqual({
      east: 2,
      north: 3,
      west: 0,
      south: 1,
    });
    expect(firstResult.websiteURI).toStrictEqual("https://coolwebsite.com");

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should accept locationRestriction as Circle literal", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);

    expect(firstResult.displayName).toStrictEqual("1337 Cool Place Road");
    expect(firstResult.formattedAddress).toStrictEqual(testPlaceWithAddressLabel);

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should accept language", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    language: "fr",
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);
    expect(clientInput.Language).toStrictEqual("fr");

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should accept maxResultCount", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    maxResultCount: 7,
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);
    expect(clientInput.MaxResults).toStrictEqual(7);

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby results should have requestedRegion if specified", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    region: "fr",
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);
    const firstResult = places[0];

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));

    expect(firstResult.requestedRegion).toStrictEqual("fr");

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should accept includedTypes", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    includedTypes: ["aquarium", "campground"],
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);
    expect(clientInput.Filter?.IncludeCategories).toStrictEqual(["aquarium", "campground", "campsite"]);

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should accept excludedTypes", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    excludedTypes: ["lodging", "zoo"],
  };

  MigrationPlace.searchNearby(request).then((response) => {
    const places = response.places;

    expect(places.length).toStrictEqual(1);

    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchNearbyCommand));
    const clientInput: SearchNearbyRequest = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.QueryPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.QueryRadius).toStrictEqual(1337);
    expect(clientInput.Filter?.ExcludeCategories).toStrictEqual(["lodging", "hotel", "hotel_or_motel", "motel", "zoo"]);

    // Signal the unit test is complete
    done();
  });
});

test("searchNearby should handle client error", (done) => {
  const request: google.maps.places.SearchNearbyRequest = {
    locationRestriction: {
      center: new MigrationLatLng(testLat, testLng),
      radius: 1337,
    },
    fields: ["*"],
    language: clientErrorQuery,
  };

  MigrationPlace.searchNearby(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(PlacesServiceStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("new place should accept language and region", () => {
  const newPlace = new MigrationPlace({
    id: "1234",
    requestedLanguage: "fr",
    requestedRegion: "fr",
  });

  expect(newPlace.requestedLanguage).toStrictEqual("fr");
  expect(newPlace.requestedRegion).toStrictEqual("fr");
});

// TODO: Update this test later once getNextOpeningTime support is added
test("new place getNextOpeningTime returns undefined", () => {
  const newPlace = new MigrationPlace({
    id: "1234",
  });

  const nextOpeningTime = newPlace.getNextOpeningTime();
  expect(nextOpeningTime).toBeUndefined();
});

// TODO: Update this test later once isOpen support is added
test("new place isOpen returns undefined", () => {
  const newPlace = new MigrationPlace({
    id: "1234",
  });

  const isOpen = newPlace.isOpen();
  expect(isOpen).toBeUndefined();
});

test("convertGooglePlaceTypeToAmazon should return corresponding Amazon place type for direct mapping", () => {
  const placeType = convertGooglePlaceTypeToAmazon("aquarium");

  expect(placeType).toStrictEqual("aquarium");
});

test("convertGooglePlaceTypeToAmazon should return corresponding Amazon place type for ambiguous mapping", () => {
  const placeType = convertGooglePlaceTypeToAmazon("airport");

  expect(placeType).toStrictEqual("airport");
});

test("convertGooglePlaceTypeToAmazon should return null if there is no corresponding Amazon place type", () => {
  const placeType = convertGooglePlaceTypeToAmazon("UNKNOWN_PLACE_TYPE");

  expect(placeType).toBeNull();
});

test("getAllAmazonPlaceTypesFromGoogle should return single corresponding Amazon place type for direct mapping", () => {
  const placeTypes = getAllAmazonPlaceTypesFromGoogle("aquarium");

  expect(placeTypes).toStrictEqual(["aquarium"]);
});

test("getAllAmazonPlaceTypesFromGoogle should return all corresponding Amazon place type for ambiguous mapping", () => {
  const placeTypes = getAllAmazonPlaceTypesFromGoogle("airport");

  expect(placeTypes).toStrictEqual(["airport", "airport_cargo", "airport_terminal"]);
});

test("getAllAmazonPlaceTypesFromGoogle should return null if there is no corresponding Amazon place type", () => {
  const placeTypes = getAllAmazonPlaceTypesFromGoogle("UNKNOWN_PLACE_TYPE");

  expect(placeTypes).toBeNull();
});

test("convertAmazonPlaceTypeToGoogle should return corresponding Google place type for direct mapping", () => {
  const placeType = convertAmazonPlaceTypeToGoogle("aquarium");

  expect(placeType).toStrictEqual("aquarium");
});

test("convertAmazonPlaceTypeToGoogle should return corresponding Google place type for ambiguous mapping", () => {
  const placeType = convertAmazonPlaceTypeToGoogle("airport_terminal");

  expect(placeType).toStrictEqual("airport");
});

test("convertAmazonPlaceTypeToGoogle should return null if there is no corresponding Google place type", () => {
  const placeType = convertAmazonPlaceTypeToGoogle("UNKNOWN_PLACE_TYPE");

  expect(placeType).toBeNull();
});
