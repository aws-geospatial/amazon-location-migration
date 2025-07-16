// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This example demonstrates the waypoint optimization feature
// using cities around Austin, TX.
//
// This is meant to showcase how the Amazon Location Migration SDK
// handles waypoint optimization similar to Google Maps.

function initMap() {
  const austinCoords = { lat: 30.2672, lng: -97.7431 }; // Austin, TX

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 8,
    center: austinCoords,
  });

  directionsRenderer.setMap(map);

  // Set up the Calculate Route button
  document.getElementById("calculate-route").addEventListener("click", function () {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  });

  // Set up the "Use Current Time" button
  document.getElementById("use-current-time").addEventListener("click", function () {
    const now = new Date();
    // Format the date and time for the datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("departure-time").value = formattedDateTime;
  });
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  // Create waypoint array to pass into route call
  const waypoints = [];
  for (let i = 1; i <= 3; i++) {
    const elementValue = document.getElementById("waypoint" + i).value;
    if (elementValue != "-") {
      waypoints.push({
        location: {
          query: elementValue,
        },
        // All waypoints are stopovers by default
        stopover: true,
      });
    }
  }

  // Check if optimization is enabled
  const optimizeWaypoints = document.getElementById("optimize").checked;

  // Get avoidance options
  const avoidTolls = document.getElementById("avoid-tolls").checked;
  const avoidHighways = document.getElementById("avoid-highways").checked;
  const avoidFerries = document.getElementById("avoid-ferries").checked;

  // Get departure time
  const departureTimeInput = document.getElementById("departure-time").value;
  let departureTime = null;
  if (departureTimeInput) {
    departureTime = new Date(departureTimeInput);
  }

  // Prepare driving options if departure time is set
  const drivingOptions = departureTime
    ? {
        departureTime: departureTime,
      }
    : undefined;

  // Make route call
  directionsService
    .route({
      origin: {
        query: document.getElementById("start").value,
      },
      destination: {
        query: document.getElementById("end").value,
      },
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: waypoints,
      optimizeWaypoints: optimizeWaypoints,
      avoidTolls: avoidTolls,
      avoidHighways: avoidHighways,
      avoidFerries: avoidFerries,
      drivingOptions: drivingOptions,
    })
    .then((response) => {
      // Display the optimized order in the UI
      const waypointOrderDiv = document.getElementById("waypoint-order");
      if (response.routes[0].waypoint_order && response.routes[0].waypoint_order.length > 0) {
        const originalWaypoints = waypoints.map((wp) => wp.location.query);
        const optimizedOrder = response.routes[0].waypoint_order.map((index) => {
          // Extract just the city name without the state
          const cityWithState = originalWaypoints[index];
          const cityName = cityWithState.split(",")[0].trim();
          // Capitalize the first letter of each word (/\b\w/g to match the first character (\w) of each word boundary (\b) in all word boundaries (g) in the cityName string)
          return cityName.replace(/\b\w/g, (c) => c.toUpperCase());
        });

        waypointOrderDiv.innerHTML = "Optimized waypoint order: " + optimizedOrder.join(", ");
      } else {
        waypointOrderDiv.innerHTML = "No waypoint optimization performed";
      }

      directionsRenderer.setDirections(response);
    })
    .catch((e) => window.alert("Directions request failed due to " + e));
}
