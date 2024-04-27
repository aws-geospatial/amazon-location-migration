// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This is an example that shows different ways to customize markers and advanced markers.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the migration adapter.

function initMap() {
  const austinCoords = { lat: 30.268193, lng: -97.7457518 }; // Austin, TX :)

  const map = new google.maps.Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
    mapId: "DEMO_MAP_ID",
  });

  // A basic marker: https://developers.google.com/maps/documentation/javascript/markers?hl=en#add
  new google.maps.Marker({
    position: austinCoords,
    map,
  });

  // A marker that sets the icon property to an Image object: https://developers.google.com/maps/documentation/javascript/markers?hl=en#complex_icons
  const redDotImg = {
    url: "../images/red_dot.png",
  };
  new google.maps.Marker({
    position: { lat: 30.3, lng: -97.7 },
    map,
    icon: redDotImg,
  });

  // A marker that sets the icon property to the URL of an image: https://developers.google.com/maps/documentation/javascript/markers?hl=en#simple_icons
  const blueHeartImg = "../images/blue_heart.png";
  new google.maps.Marker({
    position: { lat: 30.2, lng: -97.8 },
    map,
    icon: blueHeartImg,
  });

  // An advanced marker with a with a URL pointing to a PNG: https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers?hl=en#custom-graphic-file
  const pinkStarImg = document.createElement("img");
  pinkStarImg.src = "../images/pink_star.png";

  new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: 30.2, lng: -97.7 },
    content: pinkStarImg,
  });

  // An HTML-based advanced marker: https://developers.google.com/maps/documentation/javascript/advanced-markers/html-markers?hl=en#simple_html_marker
  const priceTag = document.createElement("div");
  priceTag.className = "price-tag";
  priceTag.textContent = "$1M";

  new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: 30.3, lng: -97.8 },
    content: priceTag,
  });
}
