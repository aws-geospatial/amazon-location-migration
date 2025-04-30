// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationInfoWindow, MigrationMap, MigrationMarker } from "../src/maps";
import { MigrationLatLng } from "../src/common";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Marker, Popup, PopupOptions } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should set infowindow options", () => {
  const label = "testLabel";
  const testInfoWindow = new MigrationInfoWindow({
    maxWidth: 100,
    minWidth: 50,
    position: { lat: testLat, lng: testLng },
    ariaLabel: label,
  });

  const expectedMaplibreOptions: PopupOptions = {
    closeOnClick: false,
    maxWidth: "100px",
  };

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
  expect(testInfoWindow._getMinWidth()).toBe(50);
  expect(testInfoWindow._getAriaLabel()).toBe(label);
});

test("should set infowindow content option with string", () => {
  const testString = "Hello World!";
  const testInfoWindow = new MigrationInfoWindow({
    content: testString,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setText).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setText).toHaveBeenCalledWith(testString);
});

test("should set infowindow content option with string containing HTML", () => {
  const htmlString = "<h1>Hello World!</h1>";
  const testInfoWindow = new MigrationInfoWindow({
    content: htmlString,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledWith(htmlString);
});

test("should set infowindow content option with string containing HTML and other text", () => {
  const htmlString = "<h1>Hello World!</h1>Extra Text";
  const testInfoWindow = new MigrationInfoWindow({
    content: htmlString,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledWith(htmlString);
});

test("should set infowindow content option with HTML elements", () => {
  const h1Element = document.createElement("h1");
  h1Element.textContent = "Hello World!";
  const testInfoWindow = new MigrationInfoWindow({
    content: h1Element,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setDOMContent).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setDOMContent).toHaveBeenCalledWith(h1Element);
});

test("should call open method on infowindow with anchor option", () => {
  const mockInfoWindow = {
    remove: jest.fn(),
    isOpen: jest.fn(),
    once: jest.fn(),
    getElement: jest.fn().mockReturnValue({
      querySelector: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
      }),
    }),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);
  const testMarker = new MigrationMarker({});

  testInfoWindow.open({
    anchor: testMarker,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setPopup).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setPopup).toHaveBeenCalledWith(testInfoWindow._getPopup());
  expect(Marker.prototype.togglePopup).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.isOpen).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.remove).toHaveBeenCalledTimes(1);
});

test("should call open method on infowindow with anchor parameter", () => {
  const mockInfoWindow = {
    remove: jest.fn(),
    isOpen: jest.fn(),
    once: jest.fn(),
    getElement: jest.fn().mockReturnValue({
      querySelector: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
      }),
    }),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);
  const testMarker = new MigrationMarker({});

  testInfoWindow.open(undefined, testMarker);

  expect(testInfoWindow).not.toBeNull();
  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setPopup).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setPopup).toHaveBeenCalledWith(testInfoWindow._getPopup());
  expect(Marker.prototype.togglePopup).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.isOpen).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.remove).toHaveBeenCalledTimes(1);
});

test("should call open method on infowindow with lat lng set and map option", () => {
  const mockInfoWindow = {
    remove: jest.fn(),
    isOpen: jest.fn(),
    setLngLat: jest.fn(),
    addTo: jest.fn(),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);
  const testMap = new MigrationMap(null, {});

  testInfoWindow.setPosition({ lat: testLat, lng: testLng });
  testInfoWindow.open({
    map: testMap,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(testMap).not.toBeNull();
  expect(mockInfoWindow.addTo).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.addTo).toHaveBeenCalledWith(testMap._getMap());
});

test("should call open method on infowindow with shouldFocus option set to true", () => {
  const mockInfoWindow = {
    options: {
      focusAfterOpen: null,
    },
    remove: jest.fn(),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  testInfoWindow.open({
    shouldFocus: true,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(mockInfoWindow.options.focusAfterOpen).toBe(true);
});

test("should call open method on infowindow with minWidth set", () => {
  const mockStyle = {
    _minWidth: undefined,
    set minWidth(value: string) {
      this._minWidth = value;
    },
    get minWidth() {
      return this._minWidth;
    },
  };
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue({
      style: mockStyle,
    }),
    remove: jest.fn(),
  };
  const testInfoWindow = new MigrationInfoWindow({
    minWidth: 50,
  });
  testInfoWindow._setPopup(mockInfoWindow);
  const spy = jest.spyOn(mockInfoWindow.getElement().style, "minWidth", "set");

  testInfoWindow.open({});

  expect(spy).toHaveBeenCalledWith("50px");
});

test("should call open method on infowindow with maxWidth set", () => {
  const mockInfoWindow = {
    remove: jest.fn(),
    setMaxWidth: jest.fn(),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);
  testInfoWindow._setMaxWidth(200);

  testInfoWindow.open({});
  expect(mockInfoWindow.setMaxWidth).toHaveBeenCalledTimes(1);
  expect(mockInfoWindow.setMaxWidth).toHaveBeenCalledWith("200px");
});

test("should call open method on infowindow with ariaLabel set", () => {
  const mockAriaLabel = {
    _ariaLabel: undefined,
    set ariaLabel(value: string) {
      this._ariaLabel = value;
    },
    get ariaLabel() {
      return this._ariaLabel;
    },
  };
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockAriaLabel),
    remove: jest.fn(),
  };
  const testLabel = "label";
  const testInfoWindow = new MigrationInfoWindow({
    ariaLabel: testLabel,
  });
  testInfoWindow._setPopup(mockInfoWindow);
  const spy = jest.spyOn(mockInfoWindow.getElement(), "ariaLabel", "set");

  testInfoWindow.open({});

  expect(spy).toHaveBeenCalledWith(testLabel);
});

test("should call focus method on infowindow", () => {
  const mockFirstFocusable = {
    focus: jest.fn(),
  };
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue({
      querySelector: jest.fn().mockReturnValue(mockFirstFocusable),
    }),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  testInfoWindow.focus();

  expect(testInfoWindow).not.toBeNull();
  expect(mockFirstFocusable.focus).toHaveBeenCalledTimes(1);
});

test("should call focus method on infowindow with early return due to unrendered infowindow", () => {
  const testInfoWindow = new MigrationInfoWindow({});

  testInfoWindow.focus();

  expect(testInfoWindow).not.toBeNull();
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith("InfoWindow is not visible");
});

test("should call close method on infowindow", () => {
  const mockInfoWindow = {
    remove: jest.fn(),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  testInfoWindow.close();

  expect(testInfoWindow).not.toBeNull();
  expect(mockInfoWindow.remove).toHaveBeenCalledTimes(1);
});

test("should call getContent method on infowindow", () => {
  const content = "testContent";
  const mockInfoWindow = {
    _content: content,
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  const resultContent = testInfoWindow.getContent();

  expect(testInfoWindow).not.toBeNull();
  expect(resultContent).toBe(content);
});

test("should call getPosition method on infowindow", () => {
  const mockInfoWindow = {
    getLngLat: jest.fn().mockReturnValue({ lat: testLat, lng: testLng }),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  const resultPosition = testInfoWindow.getPosition();

  expect(testInfoWindow).not.toBeNull();
  expect(resultPosition).toStrictEqual(new MigrationLatLng(testLat, testLng));
});

test("should call setOptions on infowindow", () => {
  const testContent = "content";
  const testInfoWindow = new MigrationInfoWindow({});

  testInfoWindow.setOptions({
    minWidth: 100,
    maxWidth: 200,
    content: testContent,
    position: { lat: testLat, lng: testLng },
  });

  expect(testInfoWindow._getMinWidth()).toBe(100);
  expect(testInfoWindow._getMaxWidth()).toBe(200);
  expect(Popup.prototype.setText).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setText).toHaveBeenCalledWith(testContent);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
});

test("should call setOptions on infowindow with ariaLabel", () => {
  const testLabel = "label";
  const mockAriaLabel = {
    _ariaLabel: undefined,
    set ariaLabel(value: string) {
      this._ariaLabel = value;
    },
    get ariaLabel() {
      return this._ariaLabel;
    },
  };
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockAriaLabel),
  };
  const testInfoWindow = new MigrationInfoWindow({});
  testInfoWindow._setPopup(mockInfoWindow);

  testInfoWindow.setOptions({
    ariaLabel: testLabel,
  });

  expect(testInfoWindow._getAriaLabel()).toBe(testLabel);
});

test("should call handler after close", () => {
  // mock infowindow so that we can mock on so that we can mock close
  const mockInfoWindow = {
    on: jest.fn(),
    once: jest.fn(),
    remove: jest.fn(),
    isOpen: jest.fn().mockReturnValue(true),
    getElement: jest.fn().mockReturnValue({
      querySelector: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    }),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationInfoWindow.addListener("close", handlerSpy);

  const mockAnchor = {
    _getMarker: jest.fn().mockReturnValue({
      setPopup: jest.fn(),
    }),
  };
  migrationInfoWindow.open({}, mockAnchor);

  // mock close
  mockInfoWindow.on.mock.calls[0][1]();
  mockInfoWindow.once.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after closeclick", () => {
  // mock button so that we can mock addEventListener so that we can mock click
  const mockButton = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock container so that we can mock the button
  const mockContainer = {
    querySelector: jest.fn().mockReturnValue(mockButton),
  };

  // mock marker to return mockElement when getElement is called
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockContainer),
    remove: jest.fn(),
    isOpen: jest.fn().mockReturnValue(true),
    once: jest.fn(),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationInfoWindow.addListener("closeclick", handlerSpy);

  const mockAnchor = {
    _getMarker: jest.fn().mockReturnValue({
      setPopup: jest.fn(),
    }),
  };
  migrationInfoWindow.open({}, mockAnchor);

  // mock click button
  mockButton.addEventListener.mock.calls[0][1]();
  mockButton.addEventListener.mock.calls[1][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});
