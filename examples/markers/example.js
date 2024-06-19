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

  // A basic marker with a label
  new google.maps.Marker({
    position: { lat: 30.325, lng: -97.75 },
    map,
    label: "A",
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
    rotation: 45,
    scale: 1.337,
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
    '<svg xmlns="http://www.w3.org/2000/svg" height="36" width="36" viewBox="0 0 24 24" fill="orange"><circle fill="white" cx="51%" cy="7" r="5" /><path d="M 9.43 14.45 C 7.16 11.81 5 10.81 5 7.81 C 5.181 5.62 6.332 3.627 8.138 2.375 C 12.788 -0.848 19.184 2.171 19.65 7.81 C 19.65 10.73 17.59 11.88 15.37 14.39 C 12.31 17.83 13.4 23.66 12.31 23.66 C 11.27 23.66 12.31 17.83 9.43 14.45 Z M 12.31 3.09 C 10.084 3.09 8.28 4.894 8.28 7.12 C 8.28 9.346 10.084 11.15 12.31 11.15 C 14.536 11.15 16.34 9.346 16.34 7.12 C 16.34 4.894 14.536 3.09 12.31 3.09 Z"/></svg>';
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
