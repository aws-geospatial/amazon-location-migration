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

// Polyline options constants
const POLYLINE_OPTIONS = {
  MAIN: {
    strokeColor: "#0D4AFF", // Dark blue
    strokeOpacity: 0.6,
    strokeWeight: 8,
  },
  ALTERNATE: {
    strokeColor: "#73B9FF", // Light blue
    strokeOpacity: 0.5,
    strokeWeight: 8,
  },
  TRANSPARENT: {
    strokeColor: "#00000000", // Used for main route when travel mode is set to walking
  },
};

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
let currentRoutes;
let routeCircleMarkers = [];
let lastUpdateZoom;

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

// Function to update route markers based on current zoom level and route length
function updateRouteMarkers(response) {
  if (
    !map ||
    !currentTravelMode ||
    currentTravelMode !== travelMode.WALKING ||
    !response ||
    !response.routes ||
    response.routes.length === 0
  ) {
    return;
  }

  // Clear existing markers
  clearRouteMarkers();

  // Get the path points for the currently selected route
  const routeIndex = mainDirectionRenderer.getRouteIndex();
  const pathPoints = response.routes[routeIndex].overview_path;
  const totalPoints = pathPoints.length;

  // Helper function to calculate distance between two points using Haversine formula
  function calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (point1.lat() * Math.PI) / 180;
    const lat2 = (point2.lat() * Math.PI) / 180;
    const deltaLat = ((point2.lat() - point1.lat()) * Math.PI) / 180;
    const deltaLng = ((point2.lng() - point1.lng()) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Helper function to interpolate between two points
  function interpolatePoint(point1, point2, fraction) {
    const lat = point1.lat() + (point2.lat() - point1.lat()) * fraction;
    const lng = point1.lng() + (point2.lng() - point1.lng()) * fraction;
    return new google.maps.LatLng(lat, lng);
  }

  // Calculate total route distance and cumulative distances
  let totalDistance = 0;
  const cumulativeDistances = [0];

  for (let i = 1; i < totalPoints; i++) {
    const segmentDistance = calculateDistance(pathPoints[i - 1], pathPoints[i]);
    totalDistance += segmentDistance;
    cumulativeDistances.push(totalDistance);
  }

  // Determine marker spacing based on current zoom level and route length
  const currentZoom = map.getZoom();

  // Calculate zoom factor using exponential function
  // - Uses 1.9 as base: each zoom level increase multiplies markers by ~1.9x
  // - Reference point is zoom level 13 (where zoomFactor = 1.0)
  // - At zoom 15: ~3.6x more markers; at zoom 10: ~85% fewer markers
  const zoomFactor = Math.pow(1.9, currentZoom - 13);

  // Calculate base marker count using a power function of route length
  // - Convert total distance from meters to kilometers
  // - Use exponent 0.95 (nearly linear) for balanced scaling:
  //   * Short routes get proportionally more markers per km
  //   * Long routes get slightly fewer markers per km to avoid excessive density
  const routeLengthKm = totalDistance / 1000;
  const scalingFactor = 10; // Controls how quickly marker count increases with distance
  const exponent = 0.95; // Controls the growth curve (1.0 = linear, 0.5 = square root)
  const baseMarkerCount = Math.round(scalingFactor * Math.pow(routeLengthKm, exponent));

  // Apply zoom factor to get final marker count
  const markerCount = Math.round(baseMarkerCount * zoomFactor);

  // Calculate the distance between markers in meters
  const markerSpacing = totalDistance / markerCount;

  // Place markers at regular distance intervals along the route
  for (let distance = 0; distance <= totalDistance; distance += markerSpacing) {
    // Find the segment that contains this distance point
    // This loop identifies which path segment the current distance falls within
    let segmentIndex = 0;
    while (segmentIndex < cumulativeDistances.length - 1 && cumulativeDistances[segmentIndex + 1] < distance) {
      segmentIndex++;
    }

    // Skip if we've reached the end of the path
    if (segmentIndex >= totalPoints - 1) continue;

    // Get the start and end points of the identified segment
    const segmentStart = pathPoints[segmentIndex];
    const segmentEnd = pathPoints[segmentIndex + 1];

    // Calculate how far along the segment this marker should be placed (0.0 = start, 1.0 = end)
    const segmentLength = cumulativeDistances[segmentIndex + 1] - cumulativeDistances[segmentIndex];
    const fraction = segmentLength > 0 ? (distance - cumulativeDistances[segmentIndex]) / segmentLength : 0;

    // Calculate the exact position by interpolating between segment start and end points
    const position = interpolatePoint(segmentStart, segmentEnd, fraction);

    // Create and store the blue dot marker at this position
    const marker = createSVGCircleMarker(position, map);
    routeCircleMarkers.push(marker);
  }

  // Ensure there's always a marker at the destination point
  // This guarantees the end of the route is marked even if it falls between spacing intervals
  const lastMarker = createSVGCircleMarker(pathPoints[totalPoints - 1], map);
  routeCircleMarkers.push(lastMarker);
}

// Helper function to clear existing route markers
function clearRouteMarkers() {
  if (routeCircleMarkers && routeCircleMarkers.length > 0) {
    routeCircleMarkers.forEach((marker) => marker.setMap(null));
    routeCircleMarkers = [];
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

  // Add a listener for zoom changes to update markers when needed
  map.addListener("zoom_changed", () => {
    const newZoom = map.getZoom();

    // If we have an active route with walking mode, update the markers
    if (
      currentTravelMode === travelMode.WALKING &&
      mainDirectionRenderer.getDirections() &&
      mainDirectionRenderer.getDirections().routes &&
      mainDirectionRenderer.getDirections().routes.length > 0 &&
      mainDirectionRenderer.getMap() // Ensure that the directions are being rendered
    ) {
      // Initialize the zoom tracking if it doesn't exist
      if (lastUpdateZoom === undefined) {
        lastUpdateZoom = newZoom;
      }

      // Calculate cumulative change since last marker update
      const cumulativeChange = Math.abs(newZoom - lastUpdateZoom);

      // Update markers if cumulative change exceeds threshold
      if (cumulativeChange >= 0.1) {
        updateRouteMarkers(mainDirectionRenderer.getDirections());

        // Reset the lastUpdateZoom to current zoom after updating markers
        lastUpdateZoom = newZoom;
      }
    }
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
    polylineOptions: POLYLINE_OPTIONS.MAIN,
  });

  // For the 3 alternate route renderers, we have a slightly lower opacity and we don't
  // need to render the markers, since the main directions renderer will handle that
  for (let i = 0; i < 3; i++) {
    alternativeDirectionsRenderers.push(
      new DirectionsRenderer({
        map,
        polylineOptions: POLYLINE_OPTIONS.ALTERNATE,
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
    $("#travel-mode-container").show(); // Show the travel mode container

    inDirectionsMode = true;

    // Use the user's location as the origin by default
    originLocation = userLocation;
    $("#origin-input").val("Your location");

    // Use the place we launched the directions from as the destination
    destinationLocation = currentDisplayedPlace.geometry.location;
    $("#destination-input").val(currentDisplayedPlace.formatted_address);

    calculateRoute(() => {
      $("#routes-container").show(); // Don't show container until route information is retrieved
    });
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

    // Clear any circle markers
    clearRouteMarkers();

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

      // Clear any circle markers when switching to driving mode
      clearRouteMarkers();
    } else if (selectedMode === "WALKING") {
      currentTravelMode = travelMode.WALKING;
    }

    // Recalculate the route with the new travel mode
    calculateRoute();

    // Update the main route appearance based on the selected mode
    updateMainRouteAppearance(currentTravelMode);
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

  // Store the previous route index before changing it
  const previousIndex = mainDirectionRenderer.getRouteIndex();

  // Update the route index
  mainDirectionRenderer.setRouteIndex(index);

  // If in walking mode, update the transparency of alternative renderers
  // and redraw the circle markers for the newly selected route
  if (currentTravelMode === travelMode.WALKING) {
    // Update the polyline visibility for all renderers
    alternativeDirectionsRenderers.forEach((renderer, i) => {
      if (i === index) {
        // Make the selected route's alternative renderer transparent
        renderer.setOptions({
          polylineOptions: POLYLINE_OPTIONS.TRANSPARENT,
        });
      } else {
        // Keep other alternate routes visible
        renderer.setOptions({
          polylineOptions: POLYLINE_OPTIONS.ALTERNATE,
        });
      }

      // Force re-render by getting and setting the route index again for all renderers
      renderer.setRouteIndex(renderer.getRouteIndex());
    });

    // Only redraw markers if the route index has changed
    if (previousIndex !== index) {
      // Clear existing markers
      clearRouteMarkers();

      // Create new markers for the selected route
      updateRouteMarkers(mainDirectionRenderer.getDirections());
    }
  }

  displayRouteSteps(index);
}

function getManeuverIcon(maneuver) {
  switch (maneuver) {
    case "turn-left":
    case "turn-slight-left":
    case "turn-sharp-left":
    case "fork-left":
      return "⬅️";
    case "turn-right":
    case "turn-slight-right":
    case "turn-sharp-right":
    case "fork-right":
      return "➡️";
    case "straight":
    case "continue":
      return "⬆️";
    case "keep-left":
      return "↙️";
    case "keep-right":
      return "↘️";
    case "fork-left":
    case "ramp-left":
      return "↖️";
    case "fork-right":
    case "ramp-right":
      return "↗️";
    case "uturn-left":
    case "uturn-right":
      return "↩️";
    case "merge":
      return "🔀";
    case "roundabout-left":
    case "roundabout-right":
      return "🛞";
    default:
      return " ";
  }
}

function displayRouteSteps(routeIndex) {
  const stepsContainer = document.getElementById("route-steps");

  // Clear the previous route steps
  stepsContainer.innerHTML = "";

  const route = currentRoutes[routeIndex];
  const leg = route.legs[0];
  const steps = leg.steps;

  steps.forEach((step, index) => {
    const maneuver = step.maneuver || "";
    const icon = getManeuverIcon(maneuver);

    const stepDiv = document.createElement("div");
    stepDiv.className = "step-entry";
    stepDiv.innerHTML = `
      <div class="step-line">
        <span class="step-icon">${icon}</span>
        <span class="step-text">${step.instructions}</span>
      </div>
      <div class="step-meta">${step.distance.text} • ${step.duration.text}</div>
    `;
    stepsContainer.appendChild(stepDiv);
  });
}

function displayAlternateRoutes(directionsResult) {
  const routes = directionsResult.routes;
  const container = document.getElementById("alternate-routes");

  // Store the current routes so we can lookup the steps later if the route is changed
  currentRoutes = routes;

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
  updateSelectedRouteIndex(0);
}

function calculateRoute(callback) {
  directionsService
    .route({
      origin: originLocation,
      destination: destinationLocation,
      travelMode: currentTravelMode,
      provideRouteAlternatives: true,
    })
    .then((response) => {
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

      // Update the alterative route renderers first
      alternativeDirectionsRenderers.forEach((renderer, index) => {
        renderer.setDirections(response);
        renderer.setRouteIndex(index);
      });

      // Update the main directions renderer last so it will be rendered on top
      mainDirectionRenderer.setDirections(response);
      mainDirectionRenderer.setRouteIndex(0);

      // If walking mode, create circle markers along the path
      if (currentTravelMode === travelMode.WALKING) {
        // Initialize the zoom tracking for adaptive marker placement
        lastUpdateZoom = map.getZoom();

        // Use the updateRouteMarkers function to place markers
        updateRouteMarkers(response);
      }

      // Display all alternate routes available in the display container
      displayAlternateRoutes(response);

      // Execute the callback if provided
      if (typeof callback === "function") {
        callback();
      }
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

// Function to create a single SVG circle marker for a coordinate
function createSVGCircleMarker(coordinate, map) {
  const blueDotImg = {
    url: "../images/blue_dot.png",
  };

  const marker = new google.maps.Marker({
    position: coordinate,
    map: map,
    icon: blueDotImg,
  });

  return marker;
}

// Function to update the main route appearance based on travel mode
function updateMainRouteAppearance(currentMode) {
  if (currentMode === travelMode.WALKING) {
    // For walking mode, hide the main polyline so only the circle markers are visible
    mainDirectionRenderer.setOptions({
      polylineOptions: POLYLINE_OPTIONS.TRANSPARENT,
    });

    // For walking mode, make all alternative routes light blue except for the selected route which should be transparent
    alternativeDirectionsRenderers.forEach((renderer, index) => {
      if (index === mainDirectionRenderer.getRouteIndex()) {
        // Make the selected route's alternative renderer transparent
        renderer.setOptions({
          polylineOptions: POLYLINE_OPTIONS.TRANSPARENT,
        });
      } else {
        // Keep other alternate routes visible with light blue color
        renderer.setOptions({
          polylineOptions: POLYLINE_OPTIONS.ALTERNATE,
          suppressMarkers: true,
        });
      }
    });
  } else {
    // Driving style (regular blue)
    mainDirectionRenderer.setOptions({
      polylineOptions: POLYLINE_OPTIONS.MAIN,
      suppressMarkers: false,
    });

    // Reset alternate routes to light blue
    alternativeDirectionsRenderers.forEach((renderer) => {
      renderer.setOptions({
        polylineOptions: POLYLINE_OPTIONS.ALTERNATE,
        suppressMarkers: true,
      });
    });
  }
}

// Hide the details by default and hide the directions container
$("#directions-container").hide();
$("#travel-mode-container").hide(); // Initially hide the travel mode container
updatePlacesDetails();

// Get our starting position -> initMap
getStartingPosition();
