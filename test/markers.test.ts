// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationMarker } from "../src/markers";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Map, Marker, MarkerOptions } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

afterEach(() => {
  jest.clearAllMocks();
});

test("should set marker options", () => {
  const testMap = new MigrationMap(null, {});
  const testMarker = new MigrationMarker({
    draggable: false,
    gmpDraggable: true,
    position: { lat: testLat, lng: testLng },
    opacity: 0.5,
    map: testMap,
  });

  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setDraggable).toHaveBeenCalledTimes(2);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(false);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(true);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledWith(0.5);
  expect(Marker.prototype.addTo).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.addTo).toHaveBeenCalledWith(expect.any(Map));
});

test("should set visible marker option to false", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: true,
      },
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setVisible(false);

  expect(testMarker).not.toBeNull();
  expect(testMarker._getMarker().getElement().style.visibility).toBe("hidden");
});

test("should set visible marker option to true", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: false,
      },
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setVisible(true);

  expect(testMarker).not.toBeNull();
  expect(testMarker._getMarker().getElement().style.visibility).toBe("visible");
});

test("should set marker with url content", () => {
  const redDotImg = "../images/red_dot.png";
  new MigrationMarker({
    content: redDotImg,
  });

  const expectedImage = new Image();
  expectedImage.src = redDotImg;
  const expectedMaplibreOptions: MarkerOptions = {
    element: expectedImage,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with html content", () => {
  const pinkStarImg = document.createElement("img");
  pinkStarImg.src = "../images/pink_star.png";
  new MigrationMarker({
    content: pinkStarImg,
  });

  const expectedMaplibreOptions: MarkerOptions = {
    element: pinkStarImg,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with url icon", () => {
  const blueHeartImg = "../images/blue_heart.png";
  new MigrationMarker({
    icon: blueHeartImg,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = blueHeartImg;
  imageContainer.appendChild(expectedImage);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with icon object", () => {
  const redDotImg = {
    url: "../images/red_dot.png",
  };
  new MigrationMarker({
    icon: redDotImg,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = redDotImg.url;
  imageContainer.appendChild(expectedImage);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with symbol object", () => {
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
    fillColor: "red",
    fillOpacity: 0.6,
    strokeWeight: 2,
    strokeColor: "green",
    rotation: 0,
  };
  new MigrationMarker({
    icon: svgMarker,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 25 L 25 25 L 12.5 0 Z");
  path.setAttribute("fill", "red");
  path.setAttribute("fill-opacity", "0.6");
  path.setAttribute("stroke", "green");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-opacity", "undefined");
  svg.appendChild(path);
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with symbol object", () => {
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
    fillColor: "red",
    fillOpacity: 0.6,
    strokeWeight: 2,
    strokeColor: "green",
    rotation: 0,
  };
  new MigrationMarker({
    icon: svgMarker,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 25 L 25 25 L 12.5 0 Z");
  path.setAttribute("fill", "red");
  path.setAttribute("fill-opacity", "0.6");
  path.setAttribute("stroke", "green");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-opacity", "undefined");
  svg.appendChild(path);
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with symbol object", () => {
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
    fillColor: "red",
    fillOpacity: 0.6,
    strokeWeight: 2,
    strokeColor: "green",
    rotation: 0,
  };
  new MigrationMarker({
    icon: svgMarker,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 25 L 25 25 L 12.5 0 Z");
  path.setAttribute("fill", "red");
  path.setAttribute("fill-opacity", "0.6");
  path.setAttribute("stroke", "green");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-opacity", "undefined");
  svg.appendChild(path);
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with symbol object", () => {
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
    fillColor: "red",
    fillOpacity: 0.6,
    strokeWeight: 2,
    strokeColor: "green",
    rotation: 0,
  };
  new MigrationMarker({
    icon: svgMarker,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 25 L 25 25 L 12.5 0 Z");
  path.setAttribute("fill", "red");
  path.setAttribute("fill-opacity", "0.6");
  path.setAttribute("stroke", "green");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-opacity", "undefined");
  svg.appendChild(path);
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should call get methods from marker", () => {
  const testMarker = new MigrationMarker({});

  testMarker.getDraggable();
  testMarker.getPosition();

  expect(Marker.prototype.isDraggable).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.getLngLat).toHaveBeenCalledTimes(1);
});

test("should call getIcon from marker with svg", () => {
  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svgPath.setAttribute("d", "");
  svgPath.setAttribute("fill", "");
  svgPath.setAttribute("fill-opacity", "");
  svgPath.setAttribute("stroke", "");
  svgPath.setAttribute("stroke-opacity", "");
  svgPath.setAttribute("stroke-width", "");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      src: null,
      classList: imageContainer.classList,
      querySelector: jest.fn().mockReturnValue({
        querySelector: jest.fn().mockReturnValue(svgPath),
      }),
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const iconResult = testMarker.getIcon();

  expect(iconResult).toStrictEqual({
    fillColor: "",
    fillOpacity: "",
    path: "",
    strokeColor: "",
    strokeOpacity: "",
    strokeWeight: "",
  });
  expect(mockMarker.getElement).toHaveBeenCalledTimes(1);
});

test("should call getIcon from marker with img", () => {
  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      src: null,
      classList: imageContainer.classList,
      querySelector: jest.fn().mockImplementation(
        (selector) =>
          selector === "img" && {
            src: "img_src",
          },
      ),
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const iconResult = testMarker.getIcon();

  expect(iconResult).toBe("img_src");
  expect(mockMarker.getElement).toHaveBeenCalledTimes(1);
});

test("should call getIcon from marker with default marker", () => {
  const imageContainer = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      classList: imageContainer.classList,
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const iconResult = testMarker.getIcon();

  expect(iconResult).toBe(undefined);
  expect(mockMarker.getElement).toHaveBeenCalledTimes(1);
});

test("should call getVisible from marker", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: false,
      },
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const visibleResult = testMarker.getVisible();

  expect(visibleResult).toBe(false);
  expect(mockMarker.getElement).toHaveBeenCalledTimes(1);
});

test("should call getOpacity from marker", () => {
  const mockMarker = {
    _opacity: 0.5,
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const opacityResult = testMarker.getOpacity();

  expect(opacityResult).toBe(0.5);
});

test("should call set methods from marker", () => {
  const testMap = new MigrationMap(null, {});
  const testMarker = new MigrationMarker({});

  testMarker.setDraggable(true);
  testMarker.setPosition({ lat: testLat, lng: testLng });
  testMarker.setOpacity(0.5);
  testMarker.setMap(testMap);

  expect(Marker.prototype.setDraggable).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(true);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledWith(0.5);
  expect(Marker.prototype.addTo).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.addTo).toHaveBeenCalledWith(testMap._getMap());
});

test("should call setOptions from marker", () => {
  const testMap = new MigrationMap(null, {});
  const testMarker = new MigrationMarker({});

  testMarker.setOptions({
    draggable: false,
    position: { lat: testLat, lng: testLng },
    opacity: 0,
    map: testMap,
  });

  expect(Marker.prototype.setDraggable).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(false);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledWith(0);
  expect(Marker.prototype.addTo).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.addTo).toHaveBeenCalledWith(testMap._getMap());
});

test("should call setMap with null and undefined from marker", () => {
  const testMarker = new MigrationMarker({});

  testMarker.setMap(null);
  testMarker.setMap(undefined);

  expect(Marker.prototype.remove).toHaveBeenCalledTimes(2);
});
test("should call remove from marker", () => {
  const testMarker = new MigrationMarker({});

  testMarker.remove();

  expect(Marker.prototype.remove).toHaveBeenCalledTimes(1);
});
