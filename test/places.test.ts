// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  MigrationAutocomplete,
  MigrationAutocompleteService,
  MigrationPlacesService,
  MigrationSearchBox,
} from "../src/places";
import { MigrationLatLng, MigrationLatLngBounds, PlacesServiceStatus } from "../src/googleCommon";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

// Austin, TX :)
const testPlaceLabel = "Austin, TX, USA";
const testLat = 30.268193;
const testLng = -97.7457518;

const testPlaceWithAddressLabel = "1337 Cool Place Road, Austin, TX, USA";

const clientErrorQuery = "THIS_WILL_CAUSE_A_CLIENT_ERROR";

const mockedClientSend = jest.fn((command) => {
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
              },
              PlaceId: "KEEP_AUSTIN_WEIRD",
            },
          ],
        });
      }
    } else if (command instanceof GetPlaceCommand) {
      if (command.input.PlaceId === undefined) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Place: {
            Label: testPlaceWithAddressLabel,
            AddressNumber: "1337",
            Street: "Cool Place Road",
            Geometry: {
              Point: [testLng, testLat],
            },
            TimeZone: {
              Offset: -18000,
            },
            Municipality: "Austin",
          },
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
      send: mockedClientSend,
    };
  }),
}));
import {
  GetPlaceCommand,
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  SearchPlaceIndexForTextCommand,
} from "@aws-sdk/client-location";

const autocompleteService = new MigrationAutocompleteService();
autocompleteService._client = new LocationClient();
const placesService = new MigrationPlacesService();
placesService._client = new LocationClient();
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));

    const returnedLatLng = firstResult.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    expect(firstResult.name).toStrictEqual("Austin");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    expect(firstResult.formatted_address).toBeUndefined();
    expect(firstResult.place_id).toBeUndefined();
    expect(firstResult.reference).toBeUndefined();

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));

    const returnedLatLng = firstResult.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    expect(firstResult.name).toStrictEqual("Austin");
    expect(firstResult.formatted_address).toStrictEqual(testPlaceLabel);
    expect(firstResult.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(firstResult.reference).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

    // Signal the unit test is complete
    done();
  });
});

test("findPlaceFromQuery should translate location bias", (done) => {
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;
    expect(clientInput.BiasPosition[0]).toStrictEqual(biasLng);
    expect(clientInput.BiasPosition[1]).toStrictEqual(biasLat);

    expect(firstResult.name).toStrictEqual("Austin");
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

    const returnedLatLng = result.geometry.location;
    expect(returnedLatLng.lat()).toStrictEqual(testLat);
    expect(returnedLatLng.lng()).toStrictEqual(testLng);
    expect(result.name).toStrictEqual("1337 Cool Place Road");
    expect(result.formatted_address).toStrictEqual(testPlaceWithAddressLabel);
    expect(result.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(result.reference).toStrictEqual("KEEP_AUSTIN_WEIRD");
    expect(result.utc_offset).toStrictEqual(-300);
    expect(result.utc_offset_minutes).toStrictEqual(-300);
    expect(result.vicinity).toStrictEqual("1337 Cool Place Road, Austin");
    expect(status).toStrictEqual(PlacesServiceStatus.OK);

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
    expect(result.reference).toBeUndefined();
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.name).toStrictEqual("Austin");
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(firstResult.name).toStrictEqual("Austin");
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.FilterBBox).toBeUndefined();

    expect(firstResult.name).toStrictEqual("Austin");
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(firstResult.name).toStrictEqual("Austin");
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForTextCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.FilterCountries).toStrictEqual(["us"]);

    expect(firstResult.name).toStrictEqual("Austin");
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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toBeUndefined();
    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toBeUndefined();
    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toStrictEqual([west, south, east, north]);
    expect(clientInput.BiasPosition).toBeUndefined();

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.FilterBBox).toBeUndefined();

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);
    expect(clientInput.Language).toStrictEqual("en");

    expect(results.length).toStrictEqual(2);

    const firstResult = results[0];
    expect(firstResult.description).toStrictEqual("cool places near austin");
    expect(firstResult.place_id).toBeUndefined();

    const secondResult = results[1];
    expect(secondResult.description).toStrictEqual("123 cool place way, austin, tx");
    expect(secondResult.place_id).toStrictEqual("COOL_PLACE_1");

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

test("getPlacePredictions should only return result with place_id", (done) => {
  // The mockedClientSend returns two results: one with a place_id, and one without
  // Since getPlacePredictions and getQueryPredictions both end up being
  // a SearchPlaceIndexForSuggestionsCommand, we need to verify that
  // getPlacePredictions will filter out the result without a place_id
  const request = {
    input: "cool place",
    locationBias: new MigrationLatLng(testLat, testLng),
  };

  autocompleteService.getPlacePredictions(request).then((response) => {
    expect(mockedClientSend).toHaveBeenCalledTimes(1);
    expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
    const clientInput = mockedClientSend.mock.calls[0][0].input;

    expect(clientInput.FilterBBox).toBeUndefined();
    expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

    const predictions = response.predictions;
    expect(predictions.length).toStrictEqual(1);

    const prediction = predictions[0];
    expect(prediction.description).toStrictEqual("123 cool place way, austin, tx");
    expect(prediction.place_id).toStrictEqual("COOL_PLACE_1");

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
      expect(results.length).toStrictEqual(1);

      const firstResult = results[0];
      expect(firstResult.description).toStrictEqual("123 cool place way, austin, tx");
      expect(firstResult.place_id).toStrictEqual("COOL_PLACE_1");

      expect(status).toStrictEqual(PlacesServiceStatus.OK);
    })
    .then((response) => {
      expect(mockedClientSend).toHaveBeenCalledTimes(1);
      expect(mockedClientSend).toHaveBeenCalledWith(expect.any(SearchPlaceIndexForSuggestionsCommand));
      const clientInput = mockedClientSend.mock.calls[0][0].input;

      expect(clientInput.FilterBBox).toBeUndefined();
      expect(clientInput.BiasPosition).toStrictEqual([testLng, testLat]);

      const predictions = response.predictions;
      expect(predictions.length).toStrictEqual(1);

      const prediction = predictions[0];
      expect(prediction.description).toStrictEqual("123 cool place way, austin, tx");
      expect(prediction.place_id).toStrictEqual("COOL_PLACE_1");

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
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {
    bounds: { east: 0, north: 1, south: 2, west: 3 },
  });

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    expect(places.length).toStrictEqual(1);
    expect(mockedClientSend).toHaveBeenCalledTimes(2);

    const place = places[0];

    expect(place.formatted_address).toStrictEqual(testPlaceLabel);
    expect(place.place_id).toStrictEqual("KEEP_AUSTIN_WEIRD");

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
    expect(mockedClientSend).toHaveBeenCalledTimes(1);

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
    expect(mockedClientSend).toHaveBeenCalledTimes(1);

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
