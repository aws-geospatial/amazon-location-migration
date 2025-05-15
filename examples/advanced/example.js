// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This an advanced example that makes use of many different Google Maps APIs.
//  - Starts off with a basic map and side panel with SearchBox
//  - User can type in an address or general search query (e.g. whataburger nearby)
//  - Selecting a specific place will place a marker and show details about that place in side panel
//  - Selecting a query will show a list with simple details for each place that matches the query, and place markers for them
//  - Clicking on a place in the list will show the details in the side panel
//  - Clicking on a marker will show the details for that place in the side panel
//  - Clicking on the "Directions" button will give you directions from your current location to that place
//  - Directions panel includes origin and destination Autocomplete entries, which will only accept specific places
//  - Directions will be re-calcalculated if you choose a new origin/destination
//  - Origin/destination can be typed/chosen, or can click on map/marker after clearing the field
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the Amazon Location Migration SDK.

let map;
let userLocation, originLocation, destinationLocation;
let placesService, directionsService, directionsRenderer, geocoder;
let predictionItems = [];
let markers = [];
let searchBarAutocomplete, originAutocomplete, destinationAutocomplete;
let currentPlaces = [];
let currentDisplayedPlace;
let inDirectionsMode = false;
let travelMode;

// navigator.geolocation.getCurrentPosition can sometimes take a long time to return,
// so just cache the new position after receiving it and use it next time
async function getStartingPosition() {
  const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

  // Grab starting position from the currentPosition
  // If it fails (or isn't allowed), use Austin, TX as a fallback
  if (navigator.geolocation) {
    if (localStorage.lastPositionCoords) {
      initMap(JSON.parse(localStorage.lastPositionCoords));
    } else {
      initMap(austinCoords);
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const coords = position.coords;
      localStorage.lastPositionCoords = JSON.stringify({
        lat: coords.latitude,
        lng: coords.longitude,
      });
    });
  } else {
    initMap(austinCoords);
  }
}

async function initMap(center) {
  // Store the user location so it can be used later by the directions
  userLocation = center;

  const { Map } = await google.maps.importLibrary("maps");
  map = new Map(document.getElementById("map"), {
    center: center,
    zoom: 14,
    mapId: "DEMO_MAP_ID",
    mapTypeControl: false, // The map type control overlaps our panel, so don't show by default
  });

  const { Geocoder } = await google.maps.importLibrary("geocoding");
  geocoder = new Geocoder();

  const { Autocomplete, AutocompleteService, PlacesService, PlacesServiceStatus, SearchBox } =
    await google.maps.importLibrary("places");
  placesService = new PlacesService(map);
  const autocompleteService = new AutocompleteService();

  // Setup the directions service + renderer, and attach it to our map
  const { DirectionsRenderer, DirectionsService, TravelMode } = await google.maps.importLibrary("routes");
  travelMode = TravelMode;
  directionsService = new DirectionsService();
  directionsRenderer = new DirectionsRenderer();
  directionsRenderer.setMap(map);

  // Setup seach/query input
  const searchBarInput = document.getElementById("search-bar-input");

  searchBarAutocomplete = new SearchBox(searchBarInput, {
    bounds: map.getBounds(),
  });

  // Setup origin/destination autocomplete fields
  const originInput = document.getElementById("origin-input");
  const destinationInput = document.getElementById("destination-input");

  // We only need the name and geometry for the origin/destination
  // TODO: Need to fix z-index issue with the maplibre geocoder where if one geocoder is beneath the other, the suggestions drop-down gets covered up
  originAutocomplete = new Autocomplete(originInput, {
    bounds: map.getBounds(),
    fields: ["name", "geometry"],
  });
  destinationAutocomplete = new Autocomplete(destinationInput, {
    bounds: map.getBounds(),
    fields: ["name", "geometry"],
  });

  // Update our input field bounds whenever map bounds changes
  map.addListener("zoom_changed", () => {
    searchBarAutocomplete.setBounds(map.getBounds());

    originAutocomplete.setBounds(map.getBounds());
    destinationAutocomplete.setBounds(map.getBounds());
  });
  map.addListener("dragend", () => {
    searchBarAutocomplete.setBounds(map.getBounds());

    originAutocomplete.setBounds(map.getBounds());
    destinationAutocomplete.setBounds(map.getBounds());
  });

  // If we are in directions mode, and the user has cleared out the origin
  // or destination input fields, clicking on the map should choose that
  // clicked location as the empty origin/destination
  map.addListener("click", (mapMouseEvent) => {
    const clickedLatLng = mapMouseEvent.latLng;

    const originInput = $("#origin-input").val();
    const destinationInput = $("#destination-input").val();
    let replacedInput = false;

    // Replace whichever input field is empty, starting with the origin (in case they are both empty)
    if (!originInput) {
      replacedInput = true;
      originLocation = clickedLatLng;
    } else if (!destinationInput) {
      replacedInput = true;
      destinationLocation = clickedLatLng;
    }

    // If one of the inputs was empty, calculate a new route and fill in the empty input field
    if (replacedInput) {
      calculateRoute();

      // Use the geocoder to populate the input field we replaced with an address
      geocoder
        .geocode({
          location: clickedLatLng,
        })
        .then((response) => {
          const results = response.results;
          if (results) {
            const topResult = results[0];
            const address = topResult.formatted_address;

            if (!originInput) {
              $("#origin-input").val(address);
            } else if (!destinationInput) {
              $("#destination-input").val(address);
            }
          }
        });
    }
  });

  // When user selects a single place or query list in SearchBox, show them in the
  // details pane and add marker(s) for the place(s).
  searchBarAutocomplete.addListener("places_changed", () => {
    // Clear out any previous markers before we place new ones for the new prediction(s)
    markers.map((marker) => {
      marker.setMap(null);
    });
    markers = [];

    const newPlaces = searchBarAutocomplete.getPlaces();
    currentPlaces = newPlaces;

    updatePlacesDetails();
  });

  originAutocomplete.addListener("place_changed", () => {
    const place = originAutocomplete.getPlace();

    // Update origin location (LatLng) and then calculate the new route
    originLocation = place.geometry.location;
    calculateRoute();
  });

  destinationAutocomplete.addListener("place_changed", () => {
    const place = destinationAutocomplete.getPlace();

    // Update destination location (LatLng) and then calculate the new route
    destinationLocation = place.geometry.location;
    calculateRoute();
  });

  // If the back to results button is clicked, just call updatePlacesDetails which
  // will show the list results again since currentPlaces will still have the
  // results stored
  $("#back-to-results-button").click(() => {
    updatePlacesDetails();
  });

  $("#details-get-directions").click(() => {
    // Switch to show the directions panel
    $("#places-container").hide();
    $("#directions-container").show();

    inDirectionsMode = true;

    // Use the user's location as the origin by default
    originLocation = userLocation;
    $("#origin-input").val("Your location");

    // Use the place we launched the directions from as the destination
    destinationLocation = currentDisplayedPlace.geometry.location;
    $("#destination-input").val(currentDisplayedPlace.formatted_address);

    calculateRoute();
  });

  $("#close-directions").click(() => {
    // Switch back to the places panel
    $("#directions-container").hide();
    $("#places-container").show();

    // Clear the directions from the map
    directionsRenderer.setMap(null);

    inDirectionsMode = false;
  });
}

function calculateRoute() {
  // Make sure we reattach our directions renderer to the map (if needed),
  // since to clear out the directions (e.g. navigating back to details panel) we
  // have to set the map to null
  if (!directionsRenderer.getMap()) {
    directionsRenderer.setMap(map);
  }

  directionsService
    .route({
      origin: originLocation,
      destination: destinationLocation,
      travelMode: travelMode.DRIVING,
    })
    .then((response) => {
      directionsRenderer.setDirections(response);
    })
    .catch((error) => window.alert("Directions request failed due to " + error));
}

function showPlaceDetail(place) {
  currentDisplayedPlace = place;

  createMarker(place);

  $("#back-to-results-container").hide();
  $("#search-results-container").hide();

  $("#details-name").text(place.name);
  $("#details-formatted-address").text(place.formatted_address);
  $("#search-details-container").show();

  map.setCenter(place.geometry.location);
  map.setZoom(14);
}

async function updatePlacesDetails() {
  const { LatLngBounds } = await google.maps.importLibrary("core");

  if (currentPlaces.length == 1) {
    const place = currentPlaces[0];

    showPlaceDetail(place);
  } else if (currentPlaces.length > 1) {
    $("#search-results-list").empty();

    // Create markers for all search results and add list items for each place
    const resultsBounds = new LatLngBounds();
    currentPlaces.map((result, index) => {
      createMarker(result);

      resultsBounds.extend(result.geometry.location);

      $("#search-results-list").append(
        `<li data-current-place-index=${index}>
          <div class="result-container">
            <span class="results-name">${result.name}</span>
            <span>${result.formatted_address}</span>
          </div>
        </li>`,
      );
    });

    // Adjust the map to fit all the new markers we added
    const paddingInPixels = 50;
    map.fitBounds(resultsBounds, paddingInPixels);

    $("#search-details-container").hide();
    $("#back-to-results-container").hide();

    $("#search-results-container").show();

    $("#search-results-list li").click(function (e) {
      const clickedPlaceIndex = $(this).data("current-place-index");
      showPlaceDetail(currentPlaces[clickedPlaceIndex]);

      // Show the "Back to results" button if we picked a place to get
      // details on from the results list
      $("#back-to-results-container").show();
    });
  } else {
    $("#search-details-container").hide();
    $("#search-results-container").hide();
    $("#back-to-results-container").hide();
  }
}

async function createMarker(place) {
  if (!place.geometry || !place.geometry.location) return;

  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const marker = new AdvancedMarkerElement({
    map,
    position: place.geometry.location,
  });

  // If the user clicks on a marker, show it in the details pane
  marker.addListener("click", () => {
    showPlaceDetail(place);

    // Show the "Back to results" button if clicked on a marker
    // when we had multiple suggestions showing
    if (currentPlaces.length > 1) {
      $("#back-to-results-container").show();
    }
  });

  markers.push(marker);
}

// Hide the details by default and hide the directions container
$("#directions-container").hide();
updatePlacesDetails();

// Get our starting position -> initMap
getStartingPosition();
