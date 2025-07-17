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
let placesService, directionsService, mainDirectionRenderer, geocoder;
let alternativeDirectionsRenderers = [];
let predictionItems = [];
let markers = [];
let searchBarAutocomplete, originAutocomplete, destinationAutocomplete;
let currentPlaces = [];
let currentDisplayedPlace;
let inDirectionsMode = false;
let travelMode;
let currentTravelMode;

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

  // Set up panel collapse/expand functionality
  const searchPanel = document.getElementById("search-panel-container");
  const collapseButton = document.getElementById("collapse-panel-button");
  const expandButton = document.getElementById("expand-panel-button");

  if (collapseButton && expandButton) {
    collapseButton.addEventListener("click", function () {
      searchPanel.classList.remove("expanded");
      searchPanel.classList.add("collapsed");
      expandButton.classList.remove("hidden");
    });

    expandButton.addEventListener("click", function () {
      searchPanel.classList.remove("collapsed");
      searchPanel.classList.add("expanded");
      expandButton.classList.add("hidden");
    });
  }

  const { Autocomplete, AutocompleteService, PlacesService, PlacesServiceStatus, SearchBox } =
    await google.maps.importLibrary("places");
  placesService = new PlacesService(map);
  const autocompleteService = new AutocompleteService();

  // Setup the directions service + renderer, and attach it to our map
  const { DirectionsRenderer, DirectionsService, TravelMode } = await google.maps.importLibrary("routes");
  travelMode = TravelMode;
  currentTravelMode = travelMode.DRIVING; // Initialize currentTravelMode with DRIVING
  directionsService = new DirectionsService();

  // Setup our directions renderers
  // Google can show at most 3 different possible routes, so we have 3 alternate route
  // renderers as well as the main directions renderer
  mainDirectionRenderer = new DirectionsRenderer({
    map,
    polylineOptions: {
      strokeColor: "#0D4AFF",
      strokeOpacity: 0.6,
      strokeWeight: 8,
    },
  });

  // For the 3 alternate route renderers, we have a slightly lower opacity and we don't
  // need to render the markers, since the main directions renderer will handle that
  for (let i = 0; i < 3; i++) {
    alternativeDirectionsRenderers.push(
      new DirectionsRenderer({
        map,
        polylineOptions: {
          strokeColor: "#73B9FF",
          strokeOpacity: 0.5,
          strokeWeight: 8,
        },
        suppressMarkers: true,
      }),
    );
  }

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
    $("#travel-mode-container").show(); // Show the travel mode container when directions are rendered
    $("#routes-container").show();

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
    $("#routes-container").hide();
    $("#travel-mode-container").hide(); // Hide the travel mode container when directions are closed
    $("#places-container").show();

    // Clear the directions from the map
    alternativeDirectionsRenderers.forEach((renderer) => {
      renderer.setMap(null);
    });
    mainDirectionRenderer.setMap(null);

    inDirectionsMode = false;
  });

  $(".hours-collapsed").click(() => {
    const $hoursExpanded = $("#hours-expanded");
    const $toggleButton = $("#hours-toggle");
    const isExpanded = $hoursExpanded.is(":visible");

    $hoursExpanded.slideToggle(200);
    $toggleButton.html(isExpanded ? "▼" : "▲");
  });

  // Handle travel mode selection
  $(".travel-mode-option").click(function () {
    // Remove active class from all options
    $(".travel-mode-option").removeClass("active");

    // Add active class to the clicked option
    $(this).addClass("active");

    // Get the selected travel mode
    const selectedMode = $(this).data("mode");

    // Update the current travel mode
    if (selectedMode === "DRIVING") {
      currentTravelMode = travelMode.DRIVING;
    } else if (selectedMode === "WALKING") {
      currentTravelMode = travelMode.WALKING;
    }

    // Recalculate the route with the new travel mode
    calculateRoute();
  });
}

function highlightSelectedRoute(selectedIndex) {
  const entries = document.querySelectorAll(".route-entry");
  entries.forEach((el, idx) => {
    el.classList.toggle("selected", idx === selectedIndex);
  });
}

function updateSelectedRouteIndex(index) {
  highlightSelectedRoute(index);
  mainDirectionRenderer.setRouteIndex(index);
}

function displayAlternateRoutes(directionsResult) {
  const routes = directionsResult.routes;
  const container = document.getElementById("routes-container");

  // Clear the previous alternate routes data
  container.innerHTML = "";

  routes.forEach((route, index) => {
    const summary = route.summary;

    // TODO: If we add support for multiple stops in the future, will need to combine the distance/duration for
    // all legs and then calculate the display text
    const leg = route.legs[0];
    const distance = leg.distance.text;
    const duration = leg.duration.text;

    const routeInfo = document.createElement("div");
    routeInfo.className = "route-entry";
    routeInfo.innerHTML = `
      <div class="route-row">
        <div class="summary">via ${summary}</div>
        <div class="details">
          <span>${distance}</span> • <span>${duration}</span>
        </div>
      </div>
    `;

    // Update the selected route index on click
    routeInfo.addEventListener("click", () => {
      updateSelectedRouteIndex(index);
    });

    container.appendChild(routeInfo);
  });

  // Highlight the first route by default
  highlightSelectedRoute(0);
}

function calculateRoute() {
  // Make sure we reattach our directions renderer to the map (if needed),
  // since to clear out the directions (e.g. navigating back to details panel) we
  // have to set the map to null
  alternativeDirectionsRenderers.forEach((renderer) => {
    if (!renderer.getMap()) {
      renderer.setMap(map);
    }
  });
  if (!mainDirectionRenderer.getMap()) {
    mainDirectionRenderer.setMap(map);
  }

  directionsService
    .route({
      origin: originLocation,
      destination: destinationLocation,
      travelMode: currentTravelMode,
      provideRouteAlternatives: true,
    })
    .then((response) => {
      // Update the alterative route renderers first
      alternativeDirectionsRenderers.forEach((renderer, index) => {
        renderer.setDirections(response);
        renderer.setRouteIndex(index);
      });

      // Update the main directions renderer last so it will be rendered on top
      mainDirectionRenderer.setDirections(response);
      mainDirectionRenderer.setRouteIndex(0);

      // Display all alternate routes available in the display container
      displayAlternateRoutes(response);
    })
    .catch((error) => window.alert("Directions request failed due to " + error));
}

function showPlaceDetail(place) {
  currentDisplayedPlace = place;

  createMarker(place);

  // Hide the other containers that occupy the panel
  $("#back-to-results-container").hide();
  $("#search-results-container").hide();

  // Update name
  $("#place-name")
    .text(place.name || "")
    .toggle(!!place.name);

  // Update address
  $("#address-section").toggle(!!place.formatted_address);
  $("#place-address").text(place.formatted_address || "");

  // Update opening hours
  const $hoursSection = $("#hours-section");
  if (place.opening_hours) {
    const $hoursStatus = $("#hours-status");
    const $hoursExpanded = $("#hours-expanded");

    const isOpen = place.opening_hours.isOpen();

    $hoursStatus
      .removeClass("status-open status-closed")
      .addClass(isOpen ? "status-open" : "status-closed")
      .text(isOpen ? "Open now" : "Closed now");

    // Update weekly schedule
    if (place.opening_hours.weekday_text) {
      const currentDay = new Date().getDay();

      const hoursHtml = place.opening_hours.weekday_text
        .map((dayText, index) => {
          const [day, ...hours] = dayText.split(": ");
          const isCurrent = index === (currentDay + 6) % 7;
          return `
                            <div class="hours-day ${isCurrent ? "current" : ""}">
                                <span>${day}</span>
                                <span>${hours.join(": ")}</span>
                            </div>
                        `;
        })
        .join("");

      $hoursExpanded.html(hoursHtml);
    }

    $hoursSection.show();
  } else {
    $hoursSection.hide();
  }

  // Update website
  const $websiteSection = $("#website-section");
  if (place.website) {
    $("#place-website").attr("href", place.website).text(new URL(place.website).host);
    $websiteSection.show();
  } else {
    $websiteSection.hide();
  }

  // Update phone
  const $phoneSection = $("#phone-section");
  if (place.formatted_phone_number) {
    $("#place-phone").attr("href", `tel:${place.formatted_phone_number}`).text(place.formatted_phone_number);
    $phoneSection.show();
  } else {
    $phoneSection.hide();
  }

  // Show the place details panel once we are done updating all the individual fields
  $("#place-details-panel").show();

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

    $("#place-details-panel").hide();
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
    $("#place-details-panel").hide();
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
$("#travel-mode-container").hide(); // Initially hide the travel mode container
updatePlacesDetails();

// Get our starting position -> initMap
getStartingPosition();
