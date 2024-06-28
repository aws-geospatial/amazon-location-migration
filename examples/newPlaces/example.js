// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This example showcases the new Places API.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the migration adapter.

const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

let map;
let center;

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
    mapId: "DEMO_MAP_ID",
  });

  findPlaces();
  findCity();
}

// This function showcases Place.searchByText
async function findPlaces() {
  const { Place } = await google.maps.importLibrary("places");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const request = {
    textQuery: "Whataburger in Austin",
    fields: ["displayName", "location", "utcOffsetMinutes"],
    locationBias: austinCoords,
    language: "en-US",
    maxResultCount: 15,
  };

  const { places } = await Place.searchByText(request);

  if (places.length) {
    const { LatLngBounds } = await google.maps.importLibrary("core");
    const bounds = new LatLngBounds();

    // Loop through and get all the results.
    places.forEach((place) => {
      const markerView = new AdvancedMarkerElement({
        map,
        position: place.location,
        title: place.displayName,
      });

      bounds.extend(place.location);
    });
    map.fitBounds(bounds);
  } else {
    console.log("No results");
  }
}

// This function showcases Place.fetchFields
async function findCity() {
  const { Place } = await google.maps.importLibrary("places");

  const anotherRequest = {
    textQuery: "austin, tx",
    fields: ["displayName", "location"],
  };

  // Do a searchByText first so that we can get a PlaceId to use for the fetchFields
  const { places } = await Place.searchByText(anotherRequest);

  // Create a Place using the PlaceId
  const firstPlace = places[0];
  const newPlace = new Place({
    id: firstPlace.id,
    requestedLanguage: "fr-CA", // optional
  });

  await newPlace.fetchFields({
    fields: ["formattedAddress", "location"],
  });

  console.log(newPlace.formattedAddress, newPlace.location.toString());
}

initMap();
