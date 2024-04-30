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
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";

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
