// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This is the same logic from the Autocomplete example. The only difference is that we use the NPM Loader
// pattern in example/Google.js to call initMap instead of the callback from importing the SDKs in browser
//
// This example has a Google Map, with an input box for autocomplete queries.
// The results from the autocomplete queries are used to then trigger a getDetails, from which
// a marker is placed at that location and the map moves to the selected place.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the Amazon Location Migration SDK.

let map;
let placesService;
let predictionItems = [];
let markers = [];

export async function initMap() {
  const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

  const { Map } = await google.maps.importLibrary("maps");
  map = new Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
    mapId: "DEMO_MAP_ID",
  });

  const { AutocompleteService, PlacesService, PlacesServiceStatus } = await google.maps.importLibrary("places");
  placesService = new PlacesService(map);
  const autocompleteService = new AutocompleteService();

  const searchInput = $("#search-input");
  searchInput.autocomplete({
    delay: 50,
    select: function (event, ui) {
      for (let i = 0; i < predictionItems.length; i++) {
        let prediction = predictionItems[i];
        if (prediction.description === ui.item.label) {
          getPredictionInfo(prediction);

          // Clear our cached prediction items after making selection,
          // otherwise when the input widget loses focus it will trigger
          // the change again
          predictionItems = [];
          break;
        }
      }
    },
    source: function (request, response) {
      autocompleteService.getQueryPredictions(
        {
          input: request.term,
          locationBias: map.getCenter(),
        },
        function (predictions, status) {
          if (status != PlacesServiceStatus.OK || !predictions) {
            response([]);
            return;
          }

          // Cache our current prediction items so we can later do a getDetails request
          // using the placeId
          predictionItems = predictions;

          const results = predictions.map((prediction) => prediction.description);

          response(results);
        },
      );
    },
  });

  const input = document.getElementById("search-input");
  input.addEventListener("change", function (event) {
    // If we got this change event, the user pressed Enter without selecting
    // an item from the suggestions drop-down, so just choose the first
    // prediction in the list.
    if (predictionItems.length) {
      const prediction = predictionItems[0];

      // Update the search input field with the full place description from the prediction list
      // and close the prediction list
      searchInput.val(prediction.description);
      searchInput.autocomplete("close");

      getPredictionInfo(prediction);
    }
  });
}

function getPredictionInfo(prediction) {
  // Clear out any previous markers before we place new ones for the new prediction
  markers.map((marker) => {
    marker.setMap(null);
  });
  markers = [];

  // If the prediction has a place_id, then we can do a getDetails
  // Otherwise, the prediction is a query string (e.g. whataburgers in austin)
  // so instead we need to do a textSearch to gather the place results
  if (prediction.place_id) {
    getPlaceDetails(prediction.place_id);
  } else {
    getTextSearch(prediction.description);
  }
}

async function getPlaceDetails(placeId) {
  const { PlacesServiceStatus } = await google.maps.importLibrary("places");

  var request = {
    placeId: placeId,
  };

  placesService.getDetails(request, function (result, status) {
    if (status === PlacesServiceStatus.OK) {
      createMarker(result);
      map.setCenter(result.geometry.location);
      map.setZoom(14);
    }
  });
}

async function getTextSearch(query) {
  var request = {
    query: query,
    location: map.getCenter(),
  };

  const { PlacesServiceStatus } = await google.maps.importLibrary("places");

  const { LatLngBounds } = await google.maps.importLibrary("core");
  const resultsBounds = new LatLngBounds();

  placesService.textSearch(request, function (results, status) {
    if (status === PlacesServiceStatus.OK) {
      results.map((result) => {
        createMarker(result);

        resultsBounds.extend(result.geometry.location);
      });

      // Adjust the map to fit all the new markers we added
      const paddingInPixels = 50;
      map.fitBounds(resultsBounds, paddingInPixels);
    }
  });
}

async function createMarker(place) {
  if (!place.geometry || !place.geometry.location) return;

  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const marker = new AdvancedMarkerElement({
    map,
    position: place.geometry.location,
  });

  createInfoWindow(marker, place);

  markers.push(marker);
}

async function createInfoWindow(marker, place) {
  const infoWindowContainer = document.createElement("div");
  const infoWindowHeader = document.createElement("h2");
  const infoWindowBody = document.createElement("p");
  infoWindowHeader.textContent = place.name;
  infoWindowBody.textContent = place.formatted_address;
  infoWindowContainer.appendChild(infoWindowHeader);
  infoWindowContainer.appendChild(infoWindowBody);

  const infoWindow = new google.maps.InfoWindow({
    content: infoWindowContainer,
    minWidth: 300,
  });

  marker.addListener("click", () => {
    infoWindow.open({
      map,
      anchor: marker,
    });
  });
}
