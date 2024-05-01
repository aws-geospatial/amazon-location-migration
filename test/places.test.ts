// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationPlacesService } from "../src/places";
import { PlacesServiceStatus } from "../src/googleCommon";

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
import { GetPlaceCommand, LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";

const placesService = new MigrationPlacesService();
placesService._client = new LocationClient();

afterEach(() => {
  jest.clearAllMocks();
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
