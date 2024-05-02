// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This a basic autocomplete example that has a Google Map, with an input box for autocomplete queries.
// The results from the autocomplete queries are used to then trigger a getDetails, from which
// a marker is placed at that location and the map moves to the selected place.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the migration adapter.

let map;
let placesService;
let predictionItems = [];
let markers = [];

function initMap() {
  const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

  map = new google.maps.Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
  });

  placesService = new google.maps.places.PlacesService(map);
  const autocompleteService = new google.maps.places.AutocompleteService();

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
          if (status != google.maps.places.PlacesServiceStatus.OK || !predictions) {
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

function getPlaceDetails(placeId) {
  var request = {
    placeId: placeId,
  };

  placesService.getDetails(request, function (result, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      createMarker(result);
      map.setCenter(result.geometry.location);
      map.setZoom(14);
    }
  });
}

function getTextSearch(query) {
  var request = {
    query: query,
    location: map.getCenter(),
  };

  const resultsBounds = new google.maps.LatLngBounds();

  placesService.textSearch(request, function (results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
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

function createMarker(place) {
  if (!place.geometry || !place.geometry.location) return;

  const marker = new google.maps.Marker({
    map,
    position: place.geometry.location,
  });

  markers.push(marker);

  // TODO: Add support for re-routing these event listeners to our MapLibre markers
  google.maps.event.addListener(marker, "click", () => {
    console.log("MARKER CLICKED", place.name);
  });
}
