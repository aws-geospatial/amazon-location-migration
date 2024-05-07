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

  // A marker that sets the icon property to the URL of an image and has a label
  const yellowSquareImg = "../images/yellow_square.png";
  new google.maps.Marker({
    position: { lat: 30.225, lng: -97.75 },
    map,
    icon: yellowSquareImg,
    label: "x",
  });

  // A marker that sets the icon property to an svg symbol: https://developers.google.com/maps/documentation/javascript/symbols#add_to_marker
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
    fillColor: "red",
    fillOpacity: 0.6,
    strokeWeight: 2,
    strokeColor: "green",
    rotation: 0,
  };
  new google.maps.Marker({
    position: { lat: 30.25, lng: -97.85 },
    map,
    icon: svgMarker,
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

  // An advanced marker with a custom inline SVG: https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers#inline-svg
  const parser = new DOMParser();
  const pinSvgString =
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="28" fill="#7837FF"></rect><path d="M46.0675 22.1319L44.0601 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.9402 33.2201L9.93262 33.8723" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 47.0046V44.8933" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 9V11.1113" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 43.3597L37.9186 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 12.6442L18.0816 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.93262 22.1319L11.9402 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M46.0676 33.8724L44.0601 33.2201" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 12.6442L37.9186 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 43.3597L18.0816 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M28 39L26.8725 37.9904C24.9292 36.226 23.325 34.7026 22.06 33.4202C20.795 32.1378 19.7867 30.9918 19.035 29.9823C18.2833 28.9727 17.7562 28.0587 17.4537 27.2401C17.1512 26.4216 17 25.5939 17 24.7572C17 23.1201 17.5546 21.7513 18.6638 20.6508C19.7729 19.5502 21.1433 19 22.775 19C23.82 19 24.7871 19.2456 25.6762 19.7367C26.5654 20.2278 27.34 20.9372 28 21.8649C28.77 20.8827 29.5858 20.1596 30.4475 19.6958C31.3092 19.2319 32.235 19 33.225 19C34.8567 19 36.2271 19.5502 37.3362 20.6508C38.4454 21.7513 39 23.1201 39 24.7572C39 25.5939 38.8488 26.4216 38.5463 27.2401C38.2438 28.0587 37.7167 28.9727 36.965 29.9823C36.2133 30.9918 35.205 32.1378 33.94 33.4202C32.675 34.7026 31.0708 36.226 29.1275 37.9904L28 39Z" fill="#FF7878"></path></svg>';
  const pinSvg = parser.parseFromString(pinSvgString, "image/svg+xml").documentElement;

  new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: 30.25, lng: -97.65 },
    content: pinSvg,
  });

  // When map is clicked, a default marker with a label is added: https://developers.google.com/maps/documentation/javascript/examples/marker-labels
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let labelIndex = 0;
  let currOpacity = 1;
  map.addListener("click", (mapMouseEvent) => {
    new google.maps.Marker({
      position: mapMouseEvent.latLng,
      label: labels[labelIndex++ % labels.length],
      opacity: (currOpacity -= 0.1),
      draggable: true,
      map: map,
    });
  });
}
