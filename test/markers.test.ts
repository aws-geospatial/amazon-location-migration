// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap, MigrationMarker } from "../src/maps";
import { MigrationLatLng, MigrationPoint, MigrationSize } from "../src/common";

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
    rotation: 45,
    scale: 2,
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
  path.setAttribute("stroke-opacity", "1");
  svg.appendChild(path);
  svg.setAttribute("transform", "rotate(45) scale(2)");
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with icon scaledSize", () => {
  const iconWithSize = {
    url: "../images/red_dot.png",
    scaledSize: { width: 32, height: 32 },
  };
  new MigrationMarker({
    icon: iconWithSize,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = iconWithSize.url;
  expectedImage.style.width = "32px";
  expectedImage.style.height = "32px";
  imageContainer.appendChild(expectedImage);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with icon anchor", () => {
  const iconWithAnchor = {
    url: "../images/red_dot.png",
    anchor: { x: 16, y: 32 },
  };
  new MigrationMarker({
    icon: iconWithAnchor,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = iconWithAnchor.url;
  imageContainer.appendChild(expectedImage);
  // When anchor is provided without scaledSize, offset is undefined
  // (would be calculated after image loads, but not set during construction)
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with icon scaledSize and anchor", () => {
  const iconWithSizeAndAnchor = {
    url: "../images/red_dot.png",
    scaledSize: { width: 32, height: 64 },
    anchor: { x: 16, y: 64 },
  };
  new MigrationMarker({
    icon: iconWithSizeAndAnchor,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = iconWithSizeAndAnchor.url;
  expectedImage.style.width = "32px";
  expectedImage.style.height = "64px";
  imageContainer.appendChild(expectedImage);
  // Offset calculation: center - anchor = (16, 32) - (16, 64) = (0, -32)
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
    offset: [0, -32],
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with MigrationSize and MigrationPoint", () => {
  const iconWithClasses = {
    url: "../images/marker.png",
    scaledSize: new MigrationSize(40, 64),
    anchor: new MigrationPoint(20, 64),
  };
  new MigrationMarker({
    icon: iconWithClasses,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const expectedImage = new Image();
  expectedImage.src = iconWithClasses.url;
  expectedImage.style.width = "40px";
  expectedImage.style.height = "64px";
  imageContainer.appendChild(expectedImage);
  // Offset calculation: center - anchor = (20, 32) - (20, 64) = (0, -32)
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
    offset: [0, -32],
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with symbol with default attributes", () => {
  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
  };
  new MigrationMarker({
    icon: svgMarker,
  });

  const imageContainer = document.createElement("div");
  imageContainer.className = "non-default-legacy-marker";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 25 L 25 25 L 12.5 0 Z");
  path.setAttribute("fill", "black");
  path.setAttribute("fill-opacity", "0");
  path.setAttribute("stroke", "black");
  path.setAttribute("stroke-width", "1");
  path.setAttribute("stroke-opacity", "1");
  svg.appendChild(path);
  imageContainer.appendChild(svg);
  const expectedMaplibreOptions: MarkerOptions = {
    element: imageContainer,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should handle svg load event for symbol marker", () => {
  // Create a mock path element with getBBox
  const mockPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  mockPath.getBBox = jest.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 25,
    height: 25,
  });

  // Create a mock SVG element
  const mockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  mockSvg.querySelector = jest.fn().mockReturnValue(mockPath);
  mockSvg.setAttribute = jest.fn();

  // Mock the marker's _element
  const mockMarkerElement = {
    querySelector: jest.fn().mockReturnValue(mockSvg),
  };

  // Mock the Marker constructor
  const mockMarkerInstance = {
    _element: mockMarkerElement,
  };
  const OriginalMarker = Marker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = jest.fn().mockImplementation(() => mockMarkerInstance);

  const svgMarker = {
    path: "M 0 25 L 25 25 L 12.5 0 Z",
  };

  new MigrationMarker({
    icon: svgMarker,
  });

  // Find the SVG element that was created and trigger its load event
  const createdSvg = document.querySelector("svg");
  if (createdSvg) {
    const loadEvent = new Event("load");
    createdSvg.dispatchEvent(loadEvent);

    expect(mockSvg.setAttribute).toHaveBeenCalledWith("viewBox", "0 0 25 25");
    expect(mockSvg.setAttribute).toHaveBeenCalledWith("width", "25");
    expect(mockSvg.setAttribute).toHaveBeenCalledWith("height", "25");
  }

  // Restore original Marker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = OriginalMarker;
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

test("should call setVisible from marker to false", () => {
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

test("should setVisible from marker to true", () => {
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

test("should call setOptions from marker with visible", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: false,
      },
    }),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setOptions({
    visible: false,
  });

  expect(testMarker._getMarker().getElement().style.visibility).toBe("hidden");
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

test("should call handler with translated MouseEvent after drag", () => {
  // mock marker so that we can mock on so that we can mock drag
  const mockMarker = {
    on: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("drag", handlerSpy);

  // mock drag
  const mockMapLibreMouseEvent = {
    target: {},
    type: "drag",
  };
  mockMarker.on.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "drag",
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler with translated MouseEvent after dragstart", () => {
  // mock marker so that we can mock on so that we can mock dragstart
  const mockMarker = {
    on: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("dragstart", handlerSpy);

  // mock dragstart
  const mockMapLibreMouseEvent = {
    target: {},
    type: "dragstart",
  };
  mockMarker.on.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "dragstart",
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler with translated MouseEvent after dragend", () => {
  // mock marker so that we can mock on so that we can mock dragend
  const mockMarker = {
    on: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("dragend", handlerSpy);

  // mock dragend
  const mockMapLibreMouseEvent = {
    target: {},
    type: "dragend",
  };
  mockMarker.on.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "dragend",
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler with translated MouseEvent after click", () => {
  // mock element so that we can mock addEventListener so that we can mock click
  const mockElement = {
    addEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("click", handlerSpy);

  // mock click
  const mockMapLibreMouseEvent = {
    target: {},
    type: "click",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "click",
      stopPropagation: expect.any(Function),
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler with translated MouseEvent after dblclick", () => {
  // mock element so that we can mock addEventListener so that we can mock dblclick
  const mockElement = {
    addEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("dblclick", handlerSpy);

  // mock dblclick
  const mockMapLibreMouseEvent = {
    target: {},
    type: "dblclick",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "dblclick",
      stopPropagation: expect.any(Function),
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler with translated MouseEvent after contextmenu", () => {
  // mock element so that we can mock addEventListener so that we can mock contextmenu
  const mockElement = {
    addEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMarker.addListener("contextmenu", handlerSpy);

  // mock contextmenu
  const mockMapLibreMouseEvent = {
    target: {},
    type: "contextmenu",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "contextmenu",
      stopPropagation: expect.any(Function),
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler once and remove listener when listenerType is 'once'", () => {
  // mock element so that we can mock addEventListener and removeEventListener
  const mockElement = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler with 'once' listener type
  const handlerSpy = jest.fn();
  migrationMarker.addListener("click", handlerSpy, "once");

  // mock click
  const mockMapLibreMouseEvent = {
    target: {},
    type: "click",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(mockElement.removeEventListener).toHaveBeenCalledTimes(1);
});

test("should create marker with visible option set to false", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: "visible",
      },
    }),
  };

  // Mock the Marker constructor to return our mock
  const OriginalMarker = Marker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = jest.fn().mockImplementation(() => mockMarker);

  const testMarker = new MigrationMarker({
    visible: false,
  });

  expect(testMarker).not.toBeNull();
  expect(mockMarker.getElement().style.visibility).toBe("hidden");

  // Restore original Marker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = OriginalMarker;
});

test("should create marker with visible option set to true", () => {
  const mockMarker = {
    getElement: jest.fn().mockReturnValue({
      style: {
        visibility: "hidden",
      },
    }),
  };

  // Mock the Marker constructor to return our mock
  const OriginalMarker = Marker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = jest.fn().mockImplementation(() => mockMarker);

  const testMarker = new MigrationMarker({
    visible: true,
  });

  expect(testMarker).not.toBeNull();
  expect(mockMarker.getElement().style.visibility).toBe("visible");

  // Restore original Marker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Marker as any) = OriginalMarker;
});

test("should create label with all optional parameters", () => {
  const testMarker = new MigrationMarker({});

  const label = testMarker._createLabel(true, "Test Label", "custom-class", "red", "Arial", "16px", "bold");

  expect(label.textContent).toBe("Test Label");
  expect(label.className).toBe("custom-class");
  expect(label.style.color).toBe("red");
  expect(label.style.fontFamily).toBe("Arial");
  expect(label.style.fontSize).toBe("16px");
  expect(label.style.fontWeight).toBe("bold");
  expect(label.style.top).toBe("35%");
});

test("should create label with fontSize without px suffix", () => {
  const testMarker = new MigrationMarker({});

  const label = testMarker._createLabel(false, "Test Label", undefined, undefined, undefined, "20");

  expect(label.style.fontSize).toBe("20px");
  expect(label.style.top).toBe("50%");
});

test("should create label with default values when optional parameters are undefined", () => {
  const testMarker = new MigrationMarker({});

  const label = testMarker._createLabel(true, "Test Label");

  expect(label.textContent).toBe("Test Label");
  expect(label.className).toBe("");
  expect(label.style.color).toBe("black");
  expect(label.style.fontSize).toBe("14px");
});

test("should set and get icon with string URL", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    setOffset: jest.fn(),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const iconUrl = "../images/marker.png";
  testMarker.setIcon(iconUrl);

  expect(mockElement.classList.contains("non-default-legacy-marker")).toBe(true);
  expect(mockElement.querySelector("img")).not.toBeNull();
  expect(mockElement.querySelector("img").src).toContain("marker.png");
});

test("should set icon with object containing url, scaledSize, and anchor", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    setOffset: jest.fn(),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  const icon = {
    url: "../images/marker.png",
    scaledSize: new MigrationSize(40, 60),
    anchor: new MigrationPoint(20, 60),
  };
  testMarker.setIcon(icon);

  expect(mockElement.classList.contains("non-default-legacy-marker")).toBe(true);
  const img = mockElement.querySelector("img");
  expect(img).not.toBeNull();
  expect(img.style.width).toBe("40px");
  expect(img.style.height).toBe("60px");
  // Offset calculation: center - anchor = (20, 30) - (20, 60) = (0, -30)
  expect(mockMarker.setOffset).toHaveBeenCalledWith([0, -30]);
});

test("should reset icon to default when passed null", () => {
  const mockElement = document.createElement("div");
  mockElement.classList.add("non-default-legacy-marker");
  mockElement.innerHTML = "<img src='test.png' />";
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setIcon(null);

  expect(mockElement.classList.contains("non-default-legacy-marker")).toBe(false);
  expect(mockElement.innerHTML).toBe("");
});

test("should set and get zIndex", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setZIndex(1000);
  expect(mockElement.style.zIndex).toBe("1000");
  expect(testMarker.getZIndex()).toBe(1000);
});

test("should clear zIndex when passed null", () => {
  const mockElement = document.createElement("div");
  mockElement.style.zIndex = "500";
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setZIndex(null);
  expect(mockElement.style.zIndex).toBe("");
  expect(testMarker.getZIndex()).toBeUndefined();
});

test("should set and get title", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setTitle("Test Marker");
  expect(mockElement.getAttribute("title")).toBe("Test Marker");
  expect(testMarker.getTitle()).toBe("Test Marker");
});

test("should remove title when passed null", () => {
  const mockElement = document.createElement("div");
  mockElement.setAttribute("title", "Old Title");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setTitle(null);
  expect(mockElement.getAttribute("title")).toBeNull();
  expect(testMarker.getTitle()).toBeUndefined();
});

test("should set and get cursor", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setCursor("pointer");
  expect(mockElement.style.cursor).toBe("pointer");
  expect(testMarker.getCursor()).toBe("pointer");
});

test("should clear cursor when passed null", () => {
  const mockElement = document.createElement("div");
  mockElement.style.cursor = "pointer";
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  testMarker.setCursor(null);
  expect(mockElement.style.cursor).toBe("");
  expect(testMarker.getCursor()).toBeUndefined();
});

test("should set and get clickable", () => {
  const mockElement = document.createElement("div");
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  expect(testMarker.getClickable()).toBe(true);

  testMarker.setClickable(false);
  expect(mockElement.style.pointerEvents).toBe("none");
  expect(testMarker.getClickable()).toBe(false);

  testMarker.setClickable(true);
  expect(mockElement.style.pointerEvents).toBe("");
  expect(testMarker.getClickable()).toBe(true);
});

test("should get map", () => {
  const mockMap = { test: "map" };
  const mockMarker = {
    _map: mockMap,
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  expect(testMarker.getMap()).toBe(mockMap);
});

test("should return null when map is not set", () => {
  const mockMarker = {
    _map: null,
  };
  const testMarker = new MigrationMarker({});
  testMarker._setMarker(mockMarker);

  expect(testMarker.getMap()).toBeNull();
});

test("should set and get label as string", () => {
  const testMarker = new MigrationMarker({});

  testMarker.setLabel("Test Label");
  expect(testMarker.getLabel()).toBe("Test Label");
});

test("should set and get label as object", () => {
  const testMarker = new MigrationMarker({});

  const labelObject = {
    text: "Label Text",
    color: "red",
    fontSize: "16px",
  };
  testMarker.setLabel(labelObject);
  expect(testMarker.getLabel()).toEqual(labelObject);
});

test("should clear label when passed null", () => {
  const testMarker = new MigrationMarker({});

  testMarker.setLabel("Test Label");
  testMarker.setLabel(null);
  expect(testMarker.getLabel()).toBeUndefined();
});

test("should log error when setAnimation is called", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  const testMarker = new MigrationMarker({});

  testMarker.setAnimation(1); // google.maps.Animation.BOUNCE

  expect(consoleErrorSpy).toHaveBeenCalledWith("setAnimation is not supported");
  consoleErrorSpy.mockRestore();
});

test("should log error and return undefined when getAnimation is called", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  const testMarker = new MigrationMarker({});

  const result = testMarker.getAnimation();

  expect(consoleErrorSpy).toHaveBeenCalledWith("getAnimation is not supported");
  expect(result).toBeUndefined();
  consoleErrorSpy.mockRestore();
});

test("should log error when setShape is called", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  const testMarker = new MigrationMarker({});

  testMarker.setShape({ type: "circle", coords: [1, 1, 1] });

  expect(consoleErrorSpy).toHaveBeenCalledWith("setShape is not supported");
  consoleErrorSpy.mockRestore();
});

test("should log error and return undefined when getShape is called", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  const testMarker = new MigrationMarker({});

  const result = testMarker.getShape();

  expect(consoleErrorSpy).toHaveBeenCalledWith("getShape is not supported");
  expect(result).toBeUndefined();
  consoleErrorSpy.mockRestore();
});
