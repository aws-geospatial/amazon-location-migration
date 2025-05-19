// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This logic is a basic example with a Google Map that can perform route
// requests and then draw driving directions.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the Amazon Location Migration SDK.
//
// This example was adapted from https://developers.google.com/maps/documentation/javascript/examples/directions-simple

function initMap() {
  const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();

  directionsRenderer.addListener("directions_changed", () => {
    const randomPolylineOptions = generateRandomPolylineOptions();
    directionsRenderer.setOptions({
      polylineOptions: randomPolylineOptions,
    });
  });

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: austinCoords,
  });

  directionsRenderer.setMap(map);

  const onChangeHandler = function () {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  };

  document.getElementById("start").addEventListener("change", onChangeHandler);
  document.getElementById("waypoint1").addEventListener("change", onChangeHandler);
  document.getElementById("waypoint2").addEventListener("change", onChangeHandler);
  document.getElementById("waypoint3").addEventListener("change", onChangeHandler);
  document.getElementById("end").addEventListener("change", onChangeHandler);
  document.getElementById("travelMode").addEventListener("change", onChangeHandler);
  document.getElementById("ferries").addEventListener("change", onChangeHandler);
  document.getElementById("highways").addEventListener("change", onChangeHandler);
  document.getElementById("tolls").addEventListener("change", onChangeHandler);
}

function getAvoidOptions() {
  const avoidOptions = [];
  if (document.getElementById("ferries").checked) avoidOptions.push("avoidFerries");
  if (document.getElementById("highways").checked) avoidOptions.push("avoidHighways");
  if (document.getElementById("tolls").checked) avoidOptions.push("avoidTolls");
  return avoidOptions;
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  // create waypoint array to pass into route call
  const waypoints = [];
  for (let i = 1; i <= 3; i++) {
    const elementValue = document.getElementById("waypoint" + i).value;
    if (elementValue !== "-") {
      waypoints.push({
        location: {
          query: elementValue,
        },
      });
    }
  }

  // Get avoid options
  const avoidOptions = getAvoidOptions();

  // Get selected travel mode
  const selectedMode = document.getElementById("travelMode").value;

  // Create the base route options
  const routeOptions = {
    origin: {
      query: document.getElementById("start").value,
    },
    destination: {
      query: document.getElementById("end").value,
    },
    travelMode: google.maps.TravelMode[selectedMode],
    waypoints: waypoints,
  };

  // Add avoid options only if they are present in avoidOptions
  if (avoidOptions.includes("avoidTolls")) {
    routeOptions['avoidTolls'] = true;
  }
  if (avoidOptions.includes("avoidHighways")) {
    routeOptions['avoidHighways'] = true;
  }
  if (avoidOptions.includes("avoidFerries")) {
    routeOptions['avoidFerries'] = true;
  }

  // make route call
  directionsService
    .route(routeOptions)
    .then((response) => {
      directionsRenderer.setDirections(response);
    })
    .catch((e) => window.alert("Directions request failed due to " + e.message));
}
// generates a polyline with a random color, weight, and opacity
function generateRandomPolylineOptions() {
  return {
    strokeColor: generateRandomHexColor(),
    strokeWeight: generateRandomInt(),
    strokeOpacity: generateRandomDouble(),
  };
}

function generateRandomHexColor() {
  const hexValues = "0123456789ABCDEF";
  let hexColor = "#";
  for (let i = 0; i < 6; i++) {
    hexColor += hexValues[Math.floor(Math.random() * 16)];
  }
  return hexColor;
}

function generateRandomDouble() {
  const min = 0.5;
  const max = 1.0;
  return Math.random() * (max - min) + min;
}

function generateRandomInt() {
  return Math.floor(Math.random() * 6) + 5;
}
