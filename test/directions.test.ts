// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import {
  MigrationDirectionsRenderer,
  MigrationDirectionsService,
  MigrationDistanceMatrixService,
  TravelMode,
  UnitSystem,
  DistanceMatrixElementStatus,
  DistanceMatrixStatus,
} from "../src/directions";
import { MigrationPlacesService } from "../src/places";
import { DirectionsStatus, MigrationLatLng, MigrationLatLngBounds } from "../src/common";

const mockAddControl = jest.fn();
const mockFitBounds = jest.fn();
const mockAddSource = jest.fn();
const mockRemoveSource = jest.fn();
const mockAddLayer = jest.fn();
const mockRemoveLayer = jest.fn();

const mockSetLngLat = jest.fn();
const mockAddTo = jest.fn();
const mockRemove = jest.fn();

jest.mock("maplibre-gl", () => ({
  ...jest.requireActual("maplibre-gl"),
  Marker: jest.fn().mockImplementation(() => {
    return {
      _element: document.createElement("div"),
      setLngLat: mockSetLngLat,
      addTo: mockAddTo,
      remove: mockRemove,
    };
  }),
  Map: jest.fn().mockImplementation(() => {
    return {
      addControl: mockAddControl,
      fitBounds: mockFitBounds,
      addSource: mockAddSource,
      removeSource: mockRemoveSource,
      addLayer: mockAddLayer,
      removeLayer: mockRemoveLayer,
    };
  }),
}));

const clientErrorQuery = "THIS_WILL_CAUSE_A_CLIENT_ERROR";
const clientErrorPlaceId = "INVALID_PLACE_ID";
const clientErrorDestinationPosition = [-1, -1];
const testCoolPlaceLocation = new MigrationLatLng(3, 4);
const testAnotherCoolPlaceLocation = new MigrationLatLng(7, 8);

const mockedPlacesClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof GetPlaceCommand) {
      if (command.input.PlaceId === undefined || command.input.PlaceId === clientErrorPlaceId) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        resolve({
          Address: {
            Label: "cool place, austin, tx",
            Country: {
              Code2: "US",
              Code3: "USA",
              Name: "United States",
            },
            Region: {
              Code: "TX",
              Name: "Texas",
            },
            SubRegion: {
              Name: "Cool SubRegion",
            },
            Locality: "Austin",
            District: "Cool District",
            PostalCode: "78704",
            Street: "Cool Place Road",
            AddressNumber: "1337",
          },
          Contacts: {
            Phones: [
              {
                Value: "+15121234567",
              },
            ],
            Websites: [
              {
                Value: "https://coolwebsite.com",
              },
            ],
          },

          OpeningHours: [
            {
              Display: ["Mon-Sun: 00:00 - 24:00"],
              OpenNow: true,
              Components: [
                {
                  OpenTime: "T000000",
                  OpenDuration: "PT24H00M",
                  Recurrence: "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU",
                },
              ],
            },
          ],
          PlaceId: "KEEP_AUSTIN_WEIRD",
          PlaceType: "PointOfInterest",
          Position: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
          TimeZone: {
            Name: "America/Chicago",
            Offset: "-05:00",
            OffsetSeconds: -18000,
          },
          Title: "1337 Cool Place Road",
        });
      }
    } else if (command instanceof SearchTextCommand) {
      if (command.input.QueryText == clientErrorQuery) {
        // Return an empty object that will throw an error
        resolve({});
      } else if (command.input.QueryText == "cool place") {
        resolve({
          ResultItems: [
            {
              Address: {
                Label: "cool place, austin, tx",
              },
              Categories: [
                {
                  Name: "City",
                  LocalizedName: "City",
                  Id: "city",
                  Primary: true,
                },
              ],
              Position: [testCoolPlaceLocation.lng(), testCoolPlaceLocation.lat()],
              PlaceId: "KEEP_AUSTIN_WEIRD",
            },
          ],
        });
      } else if (command.input.QueryText == "another cool place") {
        resolve({
          ResultItems: [
            {
              Address: {
                Label: "another cool place, austin, tx",
              },
              Categories: [
                {
                  Name: "City",
                  LocalizedName: "City",
                  Id: "city",
                  Primary: true,
                },
              ],
              Position: [testAnotherCoolPlaceLocation.lng(), testAnotherCoolPlaceLocation.lat()],
              PlaceId: "ANOTHER_COOL_PLACE",
            },
          ],
        });
      }
    } else if (command instanceof ReverseGeocodeCommand) {
      resolve({
        ResultItems: [
          {
            Address: {
              Label: "Test Address",
            },
          },
        ],
      });
    } else {
      reject();
    }
  });
});

jest.mock("@aws-sdk/client-geo-places", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-places"),
  GeoPlacesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedPlacesClientSend,
    };
  }),
}));
import { GeoPlacesClient, GetPlaceCommand, ReverseGeocodeCommand, SearchTextCommand } from "@aws-sdk/client-geo-places";

const testDeparturePosition = [-97.7335401, 30.2870699];
const testArrivalPosition = [-97.7385452, 30.3134151];
const testRouteBounds = new MigrationLatLngBounds({
  east: -97.7298,
  north: 30.31381,
  west: -97.738545,
  south: 30.28707,
});
const mockedRoutesClientSend = jest.fn((command) => {
  return new Promise((resolve, reject) => {
    if (command instanceof CalculateRoutesCommand) {
      if (JSON.stringify(command.input.Destination) == JSON.stringify(clientErrorDestinationPosition)) {
        // Return an empty object that will throw an error
        resolve({});
      } else {
        const walkingRoutes = [
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.7277, 30.23973],
                    [-97.72794, 30.2401],
                    [-97.72794, 30.24016],
                    [-97.72787, 30.24031],
                    [-97.72774, 30.24048],
                    [-97.72755, 30.24075],
                    [-97.72787, 30.24113],
                    [-97.72775, 30.24121],
                    [-97.72754, 30.24138],
                    [-97.72733, 30.24161],
                    [-97.7272, 30.24178],
                    [-97.72736, 30.24194],
                    [-97.7276, 30.24225],
                    [-97.72769, 30.24237],
                    [-97.72777, 30.24247],
                    [-97.72781, 30.24253],
                    [-97.72802, 30.2428],
                    [-97.72809, 30.24288],
                    [-97.72815, 30.24296],
                    [-97.728347, 30.243202],
                  ],
                },
                Language: "en-us",
                PedestrianLegDetails: {
                  Arrival: {
                    Place: {
                      OriginalPosition: [-97.7282001, 30.24329],
                      Position: [-97.7283467, 30.2432017],
                    },
                  },
                  Departure: {
                    Place: {
                      OriginalPosition: [-97.7278701, 30.23965],
                      Position: [-97.7277001, 30.2397299],
                    },
                  },
                  PassThroughWaypoints: [],
                  Spans: [],
                  Summary: {
                    Overview: {
                      Distance: 473,
                      Duration: 498,
                    },
                    TravelOnly: {
                      Duration: 498,
                    },
                  },
                  TravelSteps: [
                    {
                      Distance: 130,
                      Duration: 137,
                      ExitNumber: [],
                      GeometryOffset: 0,
                      Instruction: "Head northwest. Go for 130 m.",
                      Type: "Depart",
                    },
                    {
                      Distance: 52,
                      Duration: 62,
                      ExitNumber: [],
                      GeometryOffset: 5,
                      Instruction: "Turn left onto E Riverside Dr. Go for 52 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 98,
                      Duration: 105,
                      ExitNumber: [],
                      GeometryOffset: 6,
                      Instruction: "Turn right onto Town Creek Dr. Go for 98 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 193,
                      Duration: 194,
                      ExitNumber: [],
                      GeometryOffset: 10,
                      Instruction: "Turn left. Go for 193 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 0,
                      Duration: 0,
                      ExitNumber: [],
                      GeometryOffset: 19,
                      Instruction: "Arrive at your destination on the right.",
                      Type: "Arrive",
                    },
                  ],
                },
                TravelMode: "Pedestrian",
                Type: "Pedestrian",
              },
            ],
            MajorRoadLabels: [
              {
                RoadName: {
                  Language: "en",
                  Value: "Town Creek Dr",
                },
              },
              {
                RoadName: {
                  Language: "en",
                  Value: "E Riverside Dr",
                },
              },
            ],
            Summary: {
              Distance: 473,
              Duration: 498,
            },
          },
        ];
        const alternativeRoutes = [
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.7277, 30.23973],
                    [-97.72763, 30.23965],
                    [-97.72752, 30.23954],
                    [-97.72743, 30.23969],
                    [-97.72728, 30.23994],
                    [-97.72712, 30.24021],
                    [-97.72704, 30.24034],
                    [-97.72721, 30.24056],
                    [-97.72729, 30.24065],
                    [-97.72775, 30.24121],
                    [-97.72781, 30.24128],
                    [-97.72788, 30.24138],
                    [-97.72804, 30.24158],
                    [-97.72825, 30.24186],
                    [-97.72862, 30.24237],
                    [-97.72883, 30.24266],
                    [-97.72914, 30.24309],
                    [-97.72923, 30.24321],
                    [-97.72939, 30.24345],
                    [-97.72953, 30.24364],
                    [-97.72972, 30.2439],
                    [-97.72986, 30.2441],
                    [-97.72991, 30.24417],
                    [-97.73011, 30.24447],
                    [-97.73016, 30.24454],
                    [-97.73034, 30.24479],
                    [-97.73038, 30.24485],
                    [-97.73052, 30.24505],
                    [-97.73058, 30.24515],
                    [-97.73084, 30.24546],
                    [-97.73111, 30.24567],
                    [-97.73117, 30.24572],
                    [-97.73139, 30.24591],
                    [-97.73151, 30.24601],
                    [-97.73157, 30.24606],
                    [-97.73198, 30.24638],
                    [-97.73222, 30.24657],
                    [-97.73239, 30.2467],
                    [-97.73298, 30.24716],
                    [-97.73354, 30.24756],
                    [-97.73364, 30.24761],
                    [-97.73386, 30.24769],
                    [-97.7344, 30.24783],
                    [-97.73468, 30.248],
                    [-97.7348, 30.24811],
                    [-97.73486, 30.24818],
                    [-97.73499, 30.24843],
                    [-97.73518, 30.24876],
                    [-97.7352, 30.24883],
                    [-97.73527, 30.24916],
                    [-97.73531, 30.24938],
                    [-97.73537, 30.24963],
                    [-97.73548, 30.25009],
                    [-97.73562, 30.25072],
                    [-97.73573, 30.25126],
                    [-97.73578, 30.2515],
                    [-97.73589, 30.25201],
                    [-97.73597, 30.25246],
                    [-97.73609, 30.25272],
                    [-97.73624, 30.25315],
                    [-97.73646, 30.25399],
                    [-97.73667, 30.25456],
                    [-97.73696, 30.25626],
                    [-97.73704, 30.25686],
                    [-97.73706, 30.25727],
                    [-97.73706, 30.25767],
                    [-97.73704, 30.25815],
                    [-97.73693, 30.25888],
                    [-97.73682, 30.25934],
                    [-97.73651, 30.26029],
                    [-97.73614, 30.2614],
                    [-97.73573, 30.26258],
                    [-97.73522, 30.26397],
                    [-97.73519, 30.26405],
                    [-97.73517, 30.2641],
                    [-97.73421, 30.26669],
                    [-97.73388, 30.26759],
                    [-97.73277, 30.27061],
                    [-97.73271, 30.27077],
                    [-97.73264, 30.27095],
                    [-97.73258, 30.27111],
                    [-97.73231, 30.27184],
                    [-97.73188, 30.27309],
                    [-97.73158, 30.27405],
                    [-97.73139, 30.27471],
                    [-97.73125, 30.27516],
                    [-97.73107, 30.27571],
                    [-97.73082, 30.27637],
                    [-97.73076, 30.27652],
                    [-97.7306, 30.27688],
                    [-97.73026, 30.27754],
                    [-97.72987, 30.27834],
                    [-97.7298, 30.27849],
                    [-97.72977, 30.27855],
                    [-97.72974, 30.27862],
                    [-97.72937, 30.27926],
                    [-97.72813, 30.28128],
                    [-97.72775, 30.28191],
                    [-97.72765, 30.28208],
                    [-97.72733, 30.28259],
                    [-97.72699, 30.28315],
                    [-97.72644, 30.28397],
                    [-97.72595, 30.28471],
                    [-97.72542, 30.28547],
                    [-97.72483, 30.28644],
                    [-97.72399, 30.28776],
                    [-97.7237, 30.28823],
                    [-97.72339, 30.28869],
                    [-97.72206, 30.29079],
                    [-97.71946, 30.29478],
                    [-97.71889, 30.29569],
                    [-97.71836, 30.29651],
                    [-97.71818, 30.29677],
                    [-97.718, 30.29705],
                    [-97.71779, 30.29736],
                    [-97.71698, 30.29869],
                    [-97.71686, 30.29887],
                    [-97.71657, 30.29937],
                    [-97.71637, 30.2997],
                    [-97.71602, 30.30006],
                    [-97.71565, 30.3004],
                    [-97.71542, 30.30059],
                    [-97.71502, 30.30085],
                    [-97.71487, 30.30096],
                    [-97.71471, 30.3011],
                    [-97.71452, 30.3013],
                    [-97.71459, 30.30134],
                    [-97.71476, 30.30145],
                    [-97.71491, 30.30157],
                    [-97.71514, 30.30179],
                    [-97.71528, 30.30196],
                    [-97.71531, 30.30199],
                    [-97.71544, 30.30212],
                    [-97.71553, 30.30226],
                    [-97.71572, 30.30264],
                    [-97.71589, 30.3031],
                    [-97.71591, 30.30315],
                    [-97.71599, 30.3034],
                    [-97.71599, 30.30343],
                    [-97.716, 30.30362],
                    [-97.71632, 30.30357],
                    [-97.71647, 30.30357],
                    [-97.71691, 30.30363],
                    [-97.71727, 30.30372],
                    [-97.71752, 30.30382],
                    [-97.71774, 30.30391],
                    [-97.71777, 30.30393],
                    [-97.71869, 30.30437],
                    [-97.71879, 30.30442],
                    [-97.719, 30.30452],
                    [-97.71919, 30.30461],
                    [-97.71961, 30.30481],
                    [-97.72005, 30.30502],
                    [-97.72061, 30.30528],
                    [-97.72094, 30.30544],
                    [-97.72213, 30.30598],
                    [-97.72284, 30.30631],
                    [-97.72302, 30.3064],
                    [-97.72319, 30.30648],
                    [-97.72339, 30.30658],
                    [-97.72367, 30.30671],
                    [-97.72389, 30.30681],
                    [-97.72427, 30.30699],
                    [-97.72438, 30.307],
                    [-97.7246, 30.30699],
                    [-97.72479, 30.30699],
                    [-97.7249, 30.307],
                    [-97.72502, 30.30703],
                    [-97.7254, 30.3072],
                    [-97.72559, 30.3073],
                    [-97.72565, 30.30733],
                    [-97.72591, 30.30744],
                    [-97.72648, 30.30772],
                    [-97.72704, 30.30798],
                    [-97.72746, 30.30818],
                    [-97.72794, 30.30841],
                    [-97.72805, 30.30846],
                    [-97.72815, 30.30851],
                    [-97.72842, 30.30864],
                    [-97.72891, 30.30888],
                    [-97.72918, 30.30901],
                    [-97.72934, 30.30909],
                    [-97.72977, 30.30929],
                    [-97.7302, 30.3095],
                    [-97.73066, 30.30972],
                    [-97.73114, 30.30995],
                    [-97.73165, 30.31021],
                    [-97.73205, 30.31042],
                    [-97.73227, 30.31052],
                    [-97.73251, 30.31063],
                    [-97.73299, 30.31085],
                    [-97.73352, 30.31116],
                    [-97.73372, 30.31128],
                    [-97.7339, 30.31138],
                    [-97.73529, 30.31221],
                    [-97.73537, 30.31225],
                    [-97.73596, 30.31259],
                    [-97.73624, 30.31275],
                    [-97.7368, 30.31305],
                    [-97.73702, 30.31317],
                    [-97.73759, 30.31348],
                    [-97.73799, 30.31367],
                    [-97.7381, 30.31372],
                    [-97.73829, 30.31381],
                    [-97.73841, 30.31362],
                    [-97.738545, 30.313415],
                  ],
                },
                Language: "en-us",
                TravelMode: "Car",
                Type: "Vehicle",
                VehicleLegDetails: {
                  Arrival: {
                    Place: {
                      OriginalPosition: [-97.73835, 30.31332],
                      Position: [-97.7385452, 30.3134151],
                    },
                  },
                  Departure: {
                    Place: {
                      OriginalPosition: [-97.7278701, 30.23965],
                      Position: [-97.7277001, 30.2397299],
                    },
                  },
                  Incidents: [],
                  Notices: [],
                  PassThroughWaypoints: [],
                  Spans: [],
                  Summary: {
                    Overview: {
                      BestCaseDuration: 724,
                      Distance: 10529,
                      Duration: 724,
                      TypicalDuration: 724,
                    },
                    TravelOnly: {
                      BestCaseDuration: 724,
                      Duration: 724,
                      TypicalDuration: 724,
                    },
                  },
                  TollSystems: [],
                  Tolls: [],
                  TravelSteps: [
                    {
                      Distance: 27,
                      Duration: 22,
                      ExitNumber: [],
                      GeometryOffset: 0,
                      Instruction: "Head southeast. Go for 27 m.",
                      Type: "Depart",
                    },
                    {
                      Distance: 84,
                      Duration: 20,
                      ExitNumber: [],
                      GeometryOffset: 2,
                      Instruction: "Turn left onto Burton Dr. Go for 84 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 1129,
                      Duration: 95,
                      ExitNumber: [],
                      GeometryOffset: 5,
                      Instruction: "Turn left onto E Riverside Dr. Go for 1.1 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 549,
                      Duration: 29,
                      ExitNumber: [],
                      GeometryOffset: 42,
                      Instruction: "Turn right onto S IH-35 Svc Rd NB. Go for 549 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 3027,
                      Duration: 132,
                      ExitNumber: [],
                      GeometryOffset: 57,
                      Instruction: "Take left ramp onto I-35 N (Purple Heart Trl). Go for 3.0 km.",
                      RampStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                      },
                      Type: "Ramp",
                    },
                    {
                      Distance: 2669,
                      Duration: 103,
                      ExitNumber: [],
                      GeometryOffset: 94,
                      Instruction:
                        "Keep right onto I-35 N (Purple Heart Trl) toward US-290 E/Airport Blvd/51st/Cameron Rd. Go for 2.7 km.",
                      KeepStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                      },
                      Type: "Keep",
                    },
                    {
                      Distance: 251,
                      Duration: 50,
                      ExitNumber: [],
                      ExitStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                      },
                      GeometryOffset: 118,
                      Instruction: "Take exit 237A toward Airport Blvd/I-35 N. Go for 251 m.",
                      Type: "Exit",
                    },
                    {
                      Distance: 304,
                      Duration: 41,
                      ExitNumber: [],
                      GeometryOffset: 125,
                      Instruction: "Turn left onto Airport Blvd (TX-111-LOOP). Go for 304 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 886,
                      Duration: 68,
                      ExitNumber: [],
                      GeometryOffset: 139,
                      Instruction: "Turn left onto E 45th St. Go for 886 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 1553,
                      Duration: 146,
                      ExitNumber: [],
                      GeometryOffset: 162,
                      Instruction: "Turn left onto E 45th St. Go for 1.6 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 50,
                      Duration: 18,
                      ExitNumber: [],
                      GeometryOffset: 203,
                      Instruction: "Turn left. Go for 50 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 0,
                      Duration: 0,
                      ExitNumber: [],
                      GeometryOffset: 205,
                      Instruction: "Arrive at your destination on the left.",
                      Type: "Arrive",
                    },
                  ],
                  TruckRoadTypes: [],
                  Zones: [],
                },
              },
            ],
            MajorRoadLabels: [
              {
                RouteNumber: {
                  Language: "en",
                  Value: "I-35",
                },
              },
              {
                RoadName: {
                  Language: "en",
                  Value: "E 45th St",
                },
              },
            ],
            Summary: {
              Distance: 10529,
              Duration: 724,
            },
          },
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.7277, 30.23973],
                    [-97.72763, 30.23965],
                    [-97.72752, 30.23954],
                    [-97.72743, 30.23969],
                    [-97.72728, 30.23994],
                    [-97.72712, 30.24021],
                    [-97.72704, 30.24034],
                    [-97.72721, 30.24056],
                    [-97.72729, 30.24065],
                    [-97.72775, 30.24121],
                    [-97.72781, 30.24128],
                    [-97.72788, 30.24138],
                    [-97.72804, 30.24158],
                    [-97.72825, 30.24186],
                    [-97.72862, 30.24237],
                    [-97.72883, 30.24266],
                    [-97.72914, 30.24309],
                    [-97.72923, 30.24321],
                    [-97.72939, 30.24345],
                    [-97.72953, 30.24364],
                    [-97.72972, 30.2439],
                    [-97.72986, 30.2441],
                    [-97.72991, 30.24417],
                    [-97.73011, 30.24447],
                    [-97.73016, 30.24454],
                    [-97.73034, 30.24479],
                    [-97.73038, 30.24485],
                    [-97.73052, 30.24505],
                    [-97.73058, 30.24515],
                    [-97.73084, 30.24546],
                    [-97.73111, 30.24567],
                    [-97.73117, 30.24572],
                    [-97.73139, 30.24591],
                    [-97.73151, 30.24601],
                    [-97.73157, 30.24606],
                    [-97.73198, 30.24638],
                    [-97.73222, 30.24657],
                    [-97.73239, 30.2467],
                    [-97.73298, 30.24716],
                    [-97.73354, 30.24756],
                    [-97.73364, 30.24761],
                    [-97.73386, 30.24769],
                    [-97.7344, 30.24783],
                    [-97.73468, 30.248],
                    [-97.7348, 30.24811],
                    [-97.73486, 30.24818],
                    [-97.73499, 30.24843],
                    [-97.73518, 30.24876],
                    [-97.7352, 30.24883],
                    [-97.73527, 30.24916],
                    [-97.73531, 30.24938],
                    [-97.73537, 30.24963],
                    [-97.73548, 30.25009],
                    [-97.73562, 30.25072],
                    [-97.73573, 30.25126],
                    [-97.73578, 30.2515],
                    [-97.73589, 30.25201],
                    [-97.73597, 30.25246],
                    [-97.73609, 30.25272],
                    [-97.73624, 30.25315],
                    [-97.73646, 30.25399],
                    [-97.73667, 30.25456],
                    [-97.73696, 30.25626],
                    [-97.73704, 30.25686],
                    [-97.73706, 30.25727],
                    [-97.73706, 30.25767],
                    [-97.73704, 30.25815],
                    [-97.73693, 30.25888],
                    [-97.73682, 30.25934],
                    [-97.73651, 30.26029],
                    [-97.73614, 30.2614],
                    [-97.73573, 30.26258],
                    [-97.73522, 30.26397],
                    [-97.73519, 30.26405],
                    [-97.73517, 30.2641],
                    [-97.73421, 30.26669],
                    [-97.73388, 30.26759],
                    [-97.73277, 30.27061],
                    [-97.73271, 30.27077],
                    [-97.73264, 30.27095],
                    [-97.73258, 30.27111],
                    [-97.73231, 30.27184],
                    [-97.73188, 30.27309],
                    [-97.73158, 30.27405],
                    [-97.73139, 30.27471],
                    [-97.73125, 30.27516],
                    [-97.73107, 30.27571],
                    [-97.73082, 30.27637],
                    [-97.73076, 30.27652],
                    [-97.7306, 30.27688],
                    [-97.73026, 30.27754],
                    [-97.72987, 30.27834],
                    [-97.7298, 30.27849],
                    [-97.72977, 30.27855],
                    [-97.72974, 30.27862],
                    [-97.7296, 30.27902],
                    [-97.7293, 30.27962],
                    [-97.72897, 30.28022],
                    [-97.72842, 30.28112],
                    [-97.72819, 30.28147],
                    [-97.72801, 30.28174],
                    [-97.72727, 30.2829],
                    [-97.7271, 30.28316],
                    [-97.72687, 30.2835],
                    [-97.72651, 30.28404],
                    [-97.72597, 30.28486],
                    [-97.72519, 30.28572],
                    [-97.72493, 30.28614],
                    [-97.72487, 30.28624],
                    [-97.72482, 30.28632],
                    [-97.72476, 30.2864],
                    [-97.72461, 30.28666],
                    [-97.72406, 30.28751],
                    [-97.72373, 30.28805],
                    [-97.72355, 30.2883],
                    [-97.72337, 30.28856],
                    [-97.72321, 30.28882],
                    [-97.72311, 30.289],
                    [-97.72305, 30.28911],
                    [-97.7229, 30.28934],
                    [-97.72274, 30.28958],
                    [-97.72257, 30.28985],
                    [-97.72239, 30.29014],
                    [-97.72216, 30.29051],
                    [-97.72191, 30.29084],
                    [-97.72172, 30.29114],
                    [-97.72161, 30.29132],
                    [-97.72157, 30.29138],
                    [-97.72142, 30.29162],
                    [-97.7213, 30.29181],
                    [-97.72114, 30.29206],
                    [-97.7207, 30.29276],
                    [-97.72029, 30.29338],
                    [-97.71963, 30.2944],
                    [-97.7194, 30.29476],
                    [-97.71964, 30.29486],
                    [-97.71977, 30.29493],
                    [-97.71985, 30.29497],
                    [-97.72002, 30.29505],
                    [-97.72024, 30.29516],
                    [-97.72036, 30.29521],
                    [-97.72063, 30.29534],
                    [-97.72266, 30.29631],
                    [-97.72297, 30.29645],
                    [-97.72317, 30.29651],
                    [-97.72329, 30.29649],
                    [-97.7237, 30.29636],
                    [-97.72383, 30.29633],
                    [-97.72434, 30.29622],
                    [-97.72459, 30.29624],
                    [-97.72472, 30.29627],
                    [-97.72497, 30.29638],
                    [-97.7265, 30.29709],
                    [-97.72675, 30.29721],
                    [-97.72786, 30.29775],
                    [-97.72811, 30.29787],
                    [-97.72854, 30.29807],
                    [-97.72895, 30.29826],
                    [-97.72924, 30.2984],
                    [-97.72942, 30.29849],
                    [-97.72977, 30.29871],
                    [-97.7298, 30.29872],
                    [-97.73016, 30.2989],
                    [-97.73075, 30.2992],
                    [-97.73093, 30.29929],
                    [-97.73154, 30.29957],
                    [-97.7321, 30.29984],
                    [-97.73268, 30.30012],
                    [-97.73312, 30.30033],
                    [-97.73343, 30.30048],
                    [-97.73357, 30.30055],
                    [-97.73392, 30.30071],
                    [-97.73415, 30.30082],
                    [-97.73441, 30.30094],
                    [-97.73454, 30.301],
                    [-97.73469, 30.30107],
                    [-97.73492, 30.30118],
                    [-97.73511, 30.30127],
                    [-97.73524, 30.30133],
                    [-97.73553, 30.30147],
                    [-97.73557, 30.30149],
                    [-97.73581, 30.30161],
                    [-97.73631, 30.30185],
                    [-97.73708, 30.30221],
                    [-97.73744, 30.30238],
                    [-97.73763, 30.30248],
                    [-97.73781, 30.30257],
                    [-97.73791, 30.30262],
                    [-97.73816, 30.30275],
                    [-97.73796, 30.30306],
                    [-97.73789, 30.30318],
                    [-97.73784, 30.30325],
                    [-97.73774, 30.30342],
                    [-97.73768, 30.30351],
                    [-97.73752, 30.30376],
                    [-97.73734, 30.30406],
                    [-97.73729, 30.30414],
                    [-97.73722, 30.30425],
                    [-97.73701, 30.30457],
                    [-97.73688, 30.30476],
                    [-97.73668, 30.30505],
                    [-97.73654, 30.30525],
                    [-97.7364, 30.30549],
                    [-97.73634, 30.30559],
                    [-97.73609, 30.30599],
                    [-97.73584, 30.30638],
                    [-97.73575, 30.30652],
                    [-97.73561, 30.30674],
                    [-97.73528, 30.30725],
                    [-97.73514, 30.30749],
                    [-97.73471, 30.30816],
                    [-97.73461, 30.30831],
                    [-97.73444, 30.30864],
                    [-97.73421, 30.30899],
                    [-97.73402, 30.30928],
                    [-97.73371, 30.30976],
                    [-97.73325, 30.31045],
                    [-97.73299, 30.31085],
                    [-97.73352, 30.31116],
                    [-97.73372, 30.31128],
                    [-97.7339, 30.31138],
                    [-97.73529, 30.31221],
                    [-97.73537, 30.31225],
                    [-97.73596, 30.31259],
                    [-97.73624, 30.31275],
                    [-97.7368, 30.31305],
                    [-97.73702, 30.31317],
                    [-97.73759, 30.31348],
                    [-97.73799, 30.31367],
                    [-97.7381, 30.31372],
                    [-97.73829, 30.31381],
                    [-97.73841, 30.31362],
                    [-97.738545, 30.313415],
                  ],
                },
                Language: "en-us",
                TravelMode: "Car",
                Type: "Vehicle",
                VehicleLegDetails: {
                  Arrival: {
                    Place: {
                      OriginalPosition: [-97.73835, 30.31332],
                      Position: [-97.7385452, 30.3134151],
                    },
                  },
                  Departure: {
                    Place: {
                      OriginalPosition: [-97.7278701, 30.23965],
                      Position: [-97.7277001, 30.2397299],
                    },
                  },
                  Incidents: [],
                  Notices: [],
                  PassThroughWaypoints: [],
                  Spans: [],
                  Summary: {
                    Overview: {
                      BestCaseDuration: 757,
                      Distance: 10594,
                      Duration: 757,
                      TypicalDuration: 757,
                    },
                    TravelOnly: {
                      BestCaseDuration: 757,
                      Duration: 757,
                      TypicalDuration: 757,
                    },
                  },
                  TollSystems: [],
                  Tolls: [],
                  TravelSteps: [
                    {
                      Distance: 27,
                      Duration: 22,
                      ExitNumber: [],
                      GeometryOffset: 0,
                      Instruction: "Head southeast. Go for 27 m.",
                      Type: "Depart",
                    },
                    {
                      Distance: 84,
                      Duration: 20,
                      ExitNumber: [],
                      GeometryOffset: 2,
                      Instruction: "Turn left onto Burton Dr. Go for 84 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 1129,
                      Duration: 95,
                      ExitNumber: [],
                      GeometryOffset: 5,
                      Instruction: "Turn left onto E Riverside Dr. Go for 1.1 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 549,
                      Duration: 29,
                      ExitNumber: [],
                      GeometryOffset: 42,
                      Instruction: "Turn right onto S IH-35 Svc Rd NB. Go for 549 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 3027,
                      Duration: 132,
                      ExitNumber: [],
                      GeometryOffset: 57,
                      Instruction: "Take left ramp onto I-35 N (Purple Heart Trl). Go for 3.0 km.",
                      RampStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                      },
                      Type: "Ramp",
                    },
                    {
                      Distance: 784,
                      Duration: 31,
                      ExitNumber: [],
                      GeometryOffset: 94,
                      Instruction:
                        "Keep left onto I-35 N (Purple Heart Trl) toward US-290 E/Manor Rd/Dean Keeton/32nd/38 1/2 St/Hospital. Go for 784 m.",
                      KeepStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                      },
                      Type: "Keep",
                    },
                    {
                      Distance: 1272,
                      Duration: 92,
                      ExitNumber: [],
                      ExitStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                      },
                      GeometryOffset: 105,
                      Instruction:
                        "Take exit 236 toward Dean Keeton/32nd-38 1/2 Sts/Hospital onto N IH-35 Svc Rd NB. Go for 1.3 km.",
                      Type: "Exit",
                    },
                    {
                      Distance: 592,
                      Duration: 63,
                      ExitNumber: [],
                      GeometryOffset: 134,
                      Instruction: "Turn left onto E 38 1/2 St. Go for 592 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 1446,
                      Duration: 113,
                      ExitNumber: [],
                      GeometryOffset: 151,
                      Instruction: "Continue on E 38th St. Go for 1.4 km.",
                      Type: "Continue",
                    },
                    {
                      Distance: 1029,
                      Duration: 80,
                      ExitNumber: [],
                      GeometryOffset: 188,
                      Instruction: "Turn right onto Guadalupe St. Go for 1.0 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 605,
                      Duration: 62,
                      ExitNumber: [],
                      GeometryOffset: 217,
                      Instruction: "Turn left onto W 45th St. Go for 605 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 50,
                      Duration: 18,
                      ExitNumber: [],
                      GeometryOffset: 230,
                      Instruction: "Turn left. Go for 50 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 0,
                      Duration: 0,
                      ExitNumber: [],
                      GeometryOffset: 232,
                      Instruction: "Arrive at your destination on the left.",
                      Type: "Arrive",
                    },
                  ],
                  TruckRoadTypes: [],
                  Zones: [],
                },
              },
            ],
            MajorRoadLabels: [
              {
                RouteNumber: {
                  Language: "en",
                  Value: "I-35",
                },
              },
              {
                RoadName: {
                  Language: "en",
                  Value: "N IH-35 Svc Rd NB",
                },
              },
            ],
            Summary: {
              Distance: 10594,
              Duration: 757,
            },
          },
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.7277, 30.23973],
                    [-97.72763, 30.23965],
                    [-97.72752, 30.23954],
                    [-97.72743, 30.23969],
                    [-97.72728, 30.23994],
                    [-97.72712, 30.24021],
                    [-97.72704, 30.24034],
                    [-97.72721, 30.24056],
                    [-97.72729, 30.24065],
                    [-97.72775, 30.24121],
                    [-97.72781, 30.24128],
                    [-97.72788, 30.24138],
                    [-97.72804, 30.24158],
                    [-97.72825, 30.24186],
                    [-97.72862, 30.24237],
                    [-97.72883, 30.24266],
                    [-97.72914, 30.24309],
                    [-97.72923, 30.24321],
                    [-97.72939, 30.24345],
                    [-97.72953, 30.24364],
                    [-97.72972, 30.2439],
                    [-97.72986, 30.2441],
                    [-97.72991, 30.24417],
                    [-97.73011, 30.24447],
                    [-97.73016, 30.24454],
                    [-97.73034, 30.24479],
                    [-97.73038, 30.24485],
                    [-97.73052, 30.24505],
                    [-97.73058, 30.24515],
                    [-97.73084, 30.24546],
                    [-97.73111, 30.24567],
                    [-97.73117, 30.24572],
                    [-97.73139, 30.24591],
                    [-97.73151, 30.24601],
                    [-97.73157, 30.24606],
                    [-97.73198, 30.24638],
                    [-97.73222, 30.24657],
                    [-97.73239, 30.2467],
                    [-97.73298, 30.24716],
                    [-97.73354, 30.24756],
                    [-97.73364, 30.24761],
                    [-97.73386, 30.24769],
                    [-97.7344, 30.24783],
                    [-97.73492, 30.24793],
                    [-97.73579, 30.24812],
                    [-97.73605, 30.24819],
                    [-97.73625, 30.24828],
                    [-97.73651, 30.24846],
                    [-97.73657, 30.24852],
                    [-97.73669, 30.24863],
                    [-97.73699, 30.24894],
                    [-97.73732, 30.24924],
                    [-97.73745, 30.24933],
                    [-97.73763, 30.24946],
                    [-97.73786, 30.24959],
                    [-97.7381, 30.24969],
                    [-97.73826, 30.24974],
                    [-97.73875, 30.2499],
                    [-97.73887, 30.24994],
                    [-97.73956, 30.25018],
                    [-97.73984, 30.25029],
                    [-97.74002, 30.25039],
                    [-97.74018, 30.2505],
                    [-97.74046, 30.25078],
                    [-97.74059, 30.25094],
                    [-97.7407, 30.25112],
                    [-97.74078, 30.25127],
                    [-97.74094, 30.25152],
                    [-97.74101, 30.25161],
                    [-97.74117, 30.25178],
                    [-97.74134, 30.25192],
                    [-97.74156, 30.25207],
                    [-97.74175, 30.25216],
                    [-97.74191, 30.25225],
                    [-97.74204, 30.25232],
                    [-97.74248, 30.2526],
                    [-97.74258, 30.25268],
                    [-97.74309, 30.25301],
                    [-97.74313, 30.25302],
                    [-97.74323, 30.25305],
                    [-97.74345, 30.2532],
                    [-97.74365, 30.25337],
                    [-97.74379, 30.25351],
                    [-97.74393, 30.25367],
                    [-97.74415, 30.25398],
                    [-97.74424, 30.25413],
                    [-97.74442, 30.25449],
                    [-97.74445, 30.25455],
                    [-97.74462, 30.25477],
                    [-97.74494, 30.25511],
                    [-97.74502, 30.2552],
                    [-97.74506, 30.25525],
                    [-97.74518, 30.25538],
                    [-97.74523, 30.25544],
                    [-97.74527, 30.25548],
                    [-97.74536, 30.25558],
                    [-97.74546, 30.25569],
                    [-97.74564, 30.25589],
                    [-97.74604, 30.25634],
                    [-97.7461, 30.2564],
                    [-97.7462, 30.25651],
                    [-97.74628, 30.25659],
                    [-97.74649, 30.25681],
                    [-97.74671, 30.25699],
                    [-97.74689, 30.25716],
                    [-97.74728, 30.2575],
                    [-97.74739, 30.25759],
                    [-97.74773, 30.25791],
                    [-97.74793, 30.2581],
                    [-97.7481, 30.25828],
                    [-97.74817, 30.25835],
                    [-97.74824, 30.25842],
                    [-97.74849, 30.25868],
                    [-97.7492, 30.25849],
                    [-97.74935, 30.25846],
                    [-97.74945, 30.25844],
                    [-97.7498, 30.2584],
                    [-97.74993, 30.2584],
                    [-97.75011, 30.25842],
                    [-97.75033, 30.25846],
                    [-97.75069, 30.25857],
                    [-97.75088, 30.25864],
                    [-97.75102, 30.25868],
                    [-97.7514, 30.25882],
                    [-97.75191, 30.259],
                    [-97.75229, 30.25913],
                    [-97.75284, 30.25933],
                    [-97.75348, 30.25955],
                    [-97.75396, 30.25972],
                    [-97.75422, 30.25981],
                    [-97.75435, 30.25985],
                    [-97.75448, 30.2599],
                    [-97.75468, 30.25997],
                    [-97.75474, 30.25999],
                    [-97.75491, 30.26005],
                    [-97.7551, 30.26012],
                    [-97.75527, 30.26018],
                    [-97.75558, 30.26029],
                    [-97.7557, 30.26033],
                    [-97.7562, 30.26043],
                    [-97.7566, 30.26051],
                    [-97.75693, 30.26057],
                    [-97.75711, 30.26061],
                    [-97.75736, 30.26064],
                    [-97.75766, 30.26068],
                    [-97.75786, 30.2607],
                    [-97.75803, 30.26074],
                    [-97.75819, 30.26088],
                    [-97.75829, 30.261],
                    [-97.75832, 30.26106],
                    [-97.75836, 30.2612],
                    [-97.75828, 30.2614],
                    [-97.75813, 30.26174],
                    [-97.75798, 30.2621],
                    [-97.7579, 30.26231],
                    [-97.75783, 30.2625],
                    [-97.75776, 30.26268],
                    [-97.75766, 30.26293],
                    [-97.75743, 30.26353],
                    [-97.75736, 30.26371],
                    [-97.75728, 30.26388],
                    [-97.75718, 30.26414],
                    [-97.75713, 30.26432],
                    [-97.75711, 30.26449],
                    [-97.75706, 30.26462],
                    [-97.75689, 30.26503],
                    [-97.75635, 30.26634],
                    [-97.75632, 30.26641],
                    [-97.75628, 30.26651],
                    [-97.75625, 30.26659],
                    [-97.75613, 30.26686],
                    [-97.75597, 30.26722],
                    [-97.75583, 30.26753],
                    [-97.75573, 30.26777],
                    [-97.75565, 30.26793],
                    [-97.75523, 30.26886],
                    [-97.75517, 30.26904],
                    [-97.75512, 30.26912],
                    [-97.75505, 30.26927],
                    [-97.75484, 30.26974],
                    [-97.75458, 30.27032],
                    [-97.75439, 30.27072],
                    [-97.75433, 30.27085],
                    [-97.75413, 30.27129],
                    [-97.754, 30.27156],
                    [-97.75384, 30.27189],
                    [-97.7537, 30.27218],
                    [-97.75356, 30.27246],
                    [-97.75351, 30.27257],
                    [-97.75347, 30.27265],
                    [-97.75341, 30.27276],
                    [-97.75338, 30.27283],
                    [-97.75321, 30.27317],
                    [-97.75314, 30.27331],
                    [-97.75307, 30.27343],
                    [-97.75297, 30.27363],
                    [-97.75292, 30.27372],
                    [-97.75281, 30.27392],
                    [-97.75275, 30.27404],
                    [-97.75268, 30.27419],
                    [-97.7526, 30.27436],
                    [-97.75255, 30.27447],
                    [-97.7525, 30.27457],
                    [-97.75243, 30.27471],
                    [-97.75237, 30.27484],
                    [-97.7523, 30.27498],
                    [-97.75213, 30.27534],
                    [-97.75207, 30.27547],
                    [-97.75203, 30.27556],
                    [-97.7519, 30.27582],
                    [-97.75184, 30.27593],
                    [-97.7516, 30.27645],
                    [-97.7514, 30.27687],
                    [-97.75135, 30.27698],
                    [-97.75126, 30.27718],
                    [-97.7512, 30.27732],
                    [-97.75115, 30.27745],
                    [-97.75112, 30.27751],
                    [-97.75097, 30.27786],
                    [-97.75081, 30.27832],
                    [-97.75074, 30.27857],
                    [-97.75068, 30.27869],
                    [-97.75065, 30.2788],
                    [-97.7506, 30.27924],
                    [-97.75058, 30.27933],
                    [-97.75052, 30.27972],
                    [-97.75049, 30.27989],
                    [-97.75043, 30.28011],
                    [-97.75039, 30.28025],
                    [-97.75037, 30.28048],
                    [-97.75036, 30.28059],
                    [-97.75037, 30.28071],
                    [-97.75047, 30.281],
                    [-97.75057, 30.28136],
                    [-97.75069, 30.28174],
                    [-97.7508, 30.28204],
                    [-97.7511, 30.28255],
                    [-97.75123, 30.28272],
                    [-97.75166, 30.28314],
                    [-97.75193, 30.28342],
                    [-97.75208, 30.28357],
                    [-97.75222, 30.28375],
                    [-97.75239, 30.28397],
                    [-97.75249, 30.28412],
                    [-97.7527, 30.28443],
                    [-97.75287, 30.2847],
                    [-97.75296, 30.28487],
                    [-97.75304, 30.28501],
                    [-97.75313, 30.28525],
                    [-97.75319, 30.28552],
                    [-97.7532, 30.2858],
                    [-97.7532, 30.28588],
                    [-97.75321, 30.28646],
                    [-97.75318, 30.2867],
                    [-97.75314, 30.28687],
                    [-97.75306, 30.28726],
                    [-97.75301, 30.28753],
                    [-97.75278, 30.28854],
                    [-97.75267, 30.28888],
                    [-97.75256, 30.28911],
                    [-97.75237, 30.28946],
                    [-97.75217, 30.28976],
                    [-97.75196, 30.29004],
                    [-97.75173, 30.29035],
                    [-97.75129, 30.2909],
                    [-97.75092, 30.29131],
                    [-97.75077, 30.29144],
                    [-97.75052, 30.29158],
                    [-97.75038, 30.29162],
                    [-97.75016, 30.29166],
                    [-97.74988, 30.29171],
                    [-97.74928, 30.29182],
                    [-97.7482, 30.29201],
                    [-97.74781, 30.2921],
                    [-97.74766, 30.29215],
                    [-97.74752, 30.29223],
                    [-97.74739, 30.29231],
                    [-97.74729, 30.2924],
                    [-97.7472, 30.2925],
                    [-97.74713, 30.29262],
                    [-97.74707, 30.29273],
                    [-97.74702, 30.29289],
                    [-97.747, 30.29308],
                    [-97.74705, 30.29333],
                    [-97.74709, 30.29343],
                    [-97.74722, 30.29365],
                    [-97.74741, 30.29393],
                    [-97.74861, 30.29577],
                    [-97.74876, 30.29602],
                    [-97.74885, 30.29624],
                    [-97.74891, 30.29642],
                    [-97.74895, 30.29669],
                    [-97.74895, 30.29683],
                    [-97.74893, 30.2971],
                    [-97.74891, 30.29722],
                    [-97.74885, 30.29743],
                    [-97.74881, 30.29755],
                    [-97.74872, 30.29775],
                    [-97.74866, 30.29787],
                    [-97.74856, 30.29804],
                    [-97.74847, 30.29815],
                    [-97.74832, 30.29829],
                    [-97.74818, 30.29838],
                    [-97.74792, 30.29851],
                    [-97.74735, 30.29875],
                    [-97.74716, 30.29886],
                    [-97.74705, 30.29894],
                    [-97.74695, 30.29905],
                    [-97.74673, 30.29941],
                    [-97.74667, 30.29951],
                    [-97.74622, 30.30027],
                    [-97.74618, 30.30033],
                    [-97.74608, 30.3005],
                    [-97.74603, 30.30058],
                    [-97.74591, 30.30076],
                    [-97.74586, 30.30085],
                    [-97.74581, 30.30093],
                    [-97.74573, 30.30106],
                    [-97.74558, 30.30131],
                    [-97.74548, 30.30147],
                    [-97.74544, 30.30153],
                    [-97.74525, 30.30184],
                    [-97.74517, 30.30197],
                    [-97.74506, 30.30214],
                    [-97.74498, 30.30227],
                    [-97.74495, 30.30231],
                    [-97.74489, 30.30241],
                    [-97.74472, 30.30269],
                    [-97.74444, 30.30312],
                    [-97.74431, 30.30331],
                    [-97.74425, 30.3034],
                    [-97.74406, 30.30368],
                    [-97.74371, 30.3042],
                    [-97.74358, 30.30442],
                    [-97.74346, 30.30461],
                    [-97.74334, 30.30482],
                    [-97.74311, 30.30518],
                    [-97.74285, 30.30559],
                    [-97.74247, 30.3062],
                    [-97.74212, 30.30673],
                    [-97.74205, 30.30685],
                    [-97.7419, 30.30709],
                    [-97.7417, 30.30742],
                    [-97.74159, 30.3076],
                    [-97.74143, 30.30785],
                    [-97.7414, 30.30789],
                    [-97.74125, 30.30812],
                    [-97.7412, 30.30819],
                    [-97.74091, 30.30865],
                    [-97.74082, 30.3088],
                    [-97.74073, 30.30894],
                    [-97.7406, 30.30915],
                    [-97.74018, 30.3098],
                    [-97.74007, 30.30997],
                    [-97.73935, 30.31102],
                    [-97.73903, 30.31148],
                    [-97.73861, 30.31207],
                    [-97.73833, 30.31247],
                    [-97.73814, 30.31274],
                    [-97.73792, 30.31304],
                    [-97.73781, 30.31318],
                    [-97.73759, 30.31348],
                    [-97.73799, 30.31367],
                    [-97.7381, 30.31372],
                    [-97.73829, 30.31381],
                    [-97.73841, 30.31362],
                    [-97.738545, 30.313415],
                  ],
                },
                Language: "en-us",
                TravelMode: "Car",
                Type: "Vehicle",
                VehicleLegDetails: {
                  Arrival: {
                    Place: {
                      OriginalPosition: [-97.73835, 30.31332],
                      Position: [-97.7385452, 30.3134151],
                    },
                  },
                  Departure: {
                    Place: {
                      OriginalPosition: [-97.7278701, 30.23965],
                      Position: [-97.7277001, 30.2397299],
                    },
                  },
                  Incidents: [],
                  Notices: [],
                  PassThroughWaypoints: [],
                  Spans: [],
                  Summary: {
                    Overview: {
                      BestCaseDuration: 912,
                      Distance: 10969,
                      Duration: 912,
                      TypicalDuration: 912,
                    },
                    TravelOnly: {
                      BestCaseDuration: 912,
                      Duration: 912,
                      TypicalDuration: 912,
                    },
                  },
                  TollSystems: [],
                  Tolls: [],
                  TravelSteps: [
                    {
                      Distance: 27,
                      Duration: 22,
                      ExitNumber: [],
                      GeometryOffset: 0,
                      Instruction: "Head southeast. Go for 27 m.",
                      Type: "Depart",
                    },
                    {
                      Distance: 84,
                      Duration: 20,
                      ExitNumber: [],
                      GeometryOffset: 2,
                      Instruction: "Turn left onto Burton Dr. Go for 84 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 2999,
                      Duration: 249,
                      ExitNumber: [],
                      GeometryOffset: 5,
                      Instruction: "Turn left onto E Riverside Dr. Go for 3.0 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 965,
                      Duration: 91,
                      ExitNumber: [],
                      GeometryOffset: 112,
                      Instruction: "Turn left onto Barton Springs Rd. Go for 965 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 6767,
                      Duration: 495,
                      ExitNumber: [],
                      GeometryOffset: 146,
                      Instruction: "Turn right onto S Lamar Blvd (TX-343-LOOP N). Go for 6.8 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 77,
                      Duration: 17,
                      ExitNumber: [],
                      GeometryOffset: 361,
                      Instruction: "Turn left onto W 45th St. Go for 77 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 50,
                      Duration: 18,
                      ExitNumber: [],
                      GeometryOffset: 364,
                      Instruction: "Turn left. Go for 50 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 0,
                      Duration: 0,
                      ExitNumber: [],
                      GeometryOffset: 366,
                      Instruction: "Arrive at your destination on the left.",
                      Type: "Arrive",
                    },
                  ],
                  TruckRoadTypes: [],
                  Zones: [],
                },
              },
            ],
            MajorRoadLabels: [
              {
                RoadName: {
                  Language: "en",
                  Value: "N Lamar Blvd",
                },
              },
              {
                RoadName: {
                  Language: "en",
                  Value: "E Riverside Dr",
                },
              },
            ],
            Summary: {
              Distance: 10969,
              Duration: 912,
            },
          },
        ];
        const singleRoute = [
          {
            Legs: [
              {
                Geometry: {
                  LineString: [
                    [-97.73354, 30.28707],
                    [-97.73355, 30.28715],
                    [-97.73356, 30.28735],
                    [-97.73361, 30.28752],
                    [-97.7337, 30.28766],
                    [-97.73379, 30.28778],
                    [-97.73396, 30.28797],
                    [-97.73434, 30.28841],
                    [-97.73445, 30.28859],
                    [-97.7345, 30.2887],
                    [-97.73453, 30.28878],
                    [-97.73458, 30.28896],
                    [-97.73461, 30.28907],
                    [-97.73461, 30.28931],
                    [-97.73457, 30.28962],
                    [-97.73454, 30.28976],
                    [-97.73449, 30.29005],
                    [-97.73449, 30.29019],
                    [-97.73452, 30.29043],
                    [-97.73446, 30.29054],
                    [-97.73446, 30.29061],
                    [-97.73464, 30.29112],
                    [-97.73454, 30.29126],
                    [-97.73444, 30.29142],
                    [-97.73424, 30.29174],
                    [-97.73413, 30.29191],
                    [-97.73401, 30.2921],
                    [-97.73392, 30.29224],
                    [-97.73367, 30.29266],
                    [-97.73333, 30.29318],
                    [-97.73291, 30.29383],
                    [-97.73275, 30.29408],
                    [-97.73247, 30.29453],
                    [-97.73183, 30.29553],
                    [-97.73149, 30.29606],
                    [-97.73122, 30.29649],
                    [-97.73118, 30.29655],
                    [-97.73095, 30.29691],
                    [-97.73055, 30.29754],
                    [-97.7304, 30.29778],
                    [-97.73, 30.2984],
                    [-97.7298, 30.29872],
                    [-97.73016, 30.2989],
                    [-97.73075, 30.2992],
                    [-97.73093, 30.29929],
                    [-97.73154, 30.29957],
                    [-97.7321, 30.29984],
                    [-97.73268, 30.30012],
                    [-97.73312, 30.30033],
                    [-97.73343, 30.30048],
                    [-97.73357, 30.30055],
                    [-97.73392, 30.30071],
                    [-97.73415, 30.30082],
                    [-97.73441, 30.30094],
                    [-97.73454, 30.301],
                    [-97.73469, 30.30107],
                    [-97.73492, 30.30118],
                    [-97.73511, 30.30127],
                    [-97.73524, 30.30133],
                    [-97.73553, 30.30147],
                    [-97.73557, 30.30149],
                    [-97.73581, 30.30161],
                    [-97.73631, 30.30185],
                    [-97.73708, 30.30221],
                    [-97.73744, 30.30238],
                    [-97.73763, 30.30248],
                    [-97.73781, 30.30257],
                    [-97.73791, 30.30262],
                    [-97.73816, 30.30275],
                    [-97.73796, 30.30306],
                    [-97.73789, 30.30318],
                    [-97.73784, 30.30325],
                    [-97.73774, 30.30342],
                    [-97.73768, 30.30351],
                    [-97.73752, 30.30376],
                    [-97.73734, 30.30406],
                    [-97.73729, 30.30414],
                    [-97.73722, 30.30425],
                    [-97.73701, 30.30457],
                    [-97.73688, 30.30476],
                    [-97.73668, 30.30505],
                    [-97.73654, 30.30525],
                    [-97.7364, 30.30549],
                    [-97.73634, 30.30559],
                    [-97.73609, 30.30599],
                    [-97.73584, 30.30638],
                    [-97.73575, 30.30652],
                    [-97.73561, 30.30674],
                    [-97.73528, 30.30725],
                    [-97.73514, 30.30749],
                    [-97.73471, 30.30816],
                    [-97.73461, 30.30831],
                    [-97.73444, 30.30864],
                    [-97.73421, 30.30899],
                    [-97.73402, 30.30928],
                    [-97.73371, 30.30976],
                    [-97.73325, 30.31045],
                    [-97.73299, 30.31085],
                    [-97.73352, 30.31116],
                    [-97.73372, 30.31128],
                    [-97.7339, 30.31138],
                    [-97.73529, 30.31221],
                    [-97.73537, 30.31225],
                    [-97.73596, 30.31259],
                    [-97.73624, 30.31275],
                    [-97.7368, 30.31305],
                    [-97.73702, 30.31317],
                    [-97.73759, 30.31348],
                    [-97.73799, 30.31367],
                    [-97.7381, 30.31372],
                    [-97.73829, 30.31381],
                    [-97.73841, 30.31362],
                    [-97.738545, 30.313415],
                  ],
                },
                Language: "en-us",
                TravelMode: "Car",
                Type: "Vehicle",
                VehicleLegDetails: {
                  Arrival: {
                    Place: {
                      OriginalPosition: [-97.73835, 30.31332],
                      Position: testArrivalPosition,
                    },
                  },
                  Departure: {
                    Place: {
                      OriginalPosition: [-97.7335401, 30.2870299],
                      Position: testDeparturePosition,
                    },
                  },
                  Incidents: [],
                  Notices: [],
                  PassThroughWaypoints: [],
                  Spans: [],
                  Summary: {
                    Overview: {
                      BestCaseDuration: 423,
                      Distance: 4047,
                      Duration: 423,
                      TypicalDuration: 423,
                    },
                    TravelOnly: {
                      BestCaseDuration: 423,
                      Duration: 423,
                      TypicalDuration: 423,
                    },
                  },
                  TollSystems: [],
                  Tolls: [],
                  TravelSteps: [
                    {
                      Distance: 403,
                      Duration: 74,
                      ExitNumber: [],
                      GeometryOffset: 0,
                      Instruction: "Head north on San Jacinto Blvd. Go for 403 m.",
                      Type: "Depart",
                    },
                    {
                      Distance: 1044,
                      Duration: 112,
                      ExitNumber: [],
                      GeometryOffset: 18,
                      Instruction: "Turn right onto Duval St. Go for 1.0 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 916,
                      Duration: 77,
                      ExitNumber: [],
                      GeometryOffset: 41,
                      Instruction: "Turn left onto E 38th St. Go for 916 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 1029,
                      Duration: 80,
                      ExitNumber: [],
                      GeometryOffset: 68,
                      Instruction: "Turn right onto Guadalupe St. Go for 1.0 km.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Right",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 605,
                      Duration: 62,
                      ExitNumber: [],
                      GeometryOffset: 97,
                      Instruction: "Turn left onto W 45th St. Go for 605 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 50,
                      Duration: 18,
                      ExitNumber: [],
                      GeometryOffset: 110,
                      Instruction: "Turn left. Go for 50 m.",
                      TurnStepDetails: {
                        Intersection: [],
                        SteeringDirection: "Left",
                        TurnIntensity: "Typical",
                      },
                      Type: "Turn",
                    },
                    {
                      Distance: 0,
                      Duration: 0,
                      ExitNumber: [],
                      GeometryOffset: 112,
                      Instruction: "Arrive at your destination on the left.",
                      Type: "Arrive",
                    },
                  ],
                  TruckRoadTypes: [],
                  Zones: [],
                },
              },
            ],
            MajorRoadLabels: [
              {
                RoadName: {
                  Language: "en",
                  Value: "Guadalupe St",
                },
              },
              {
                RoadName: {
                  Language: "en",
                  Value: "Duval St",
                },
              },
            ],
            Summary: {
              Distance: 4047,
              Duration: 423,
            },
          },
        ];

        let routes;
        if (command.input.TravelMode == RouteTravelMode.PEDESTRIAN) {
          routes = walkingRoutes;
        } else {
          routes = command.input.MaxAlternatives ? alternativeRoutes : singleRoute;
        }
        resolve({
          LegGeometryFormat: "Simple",
          Notices: [],
          Routes: routes,
        });
      }
    } else if (command instanceof CalculateRouteMatrixCommand) {
      // checks if DestinationPositions array contains clientErrorDestinationPosition
      if (
        command.input.Destinations?.some(
          (position) =>
            position.Position &&
            position.Position.length === clientErrorDestinationPosition.length &&
            position.Position.every((num, index) => num === clientErrorDestinationPosition[index]),
        )
      ) {
        reject(new Error("Invalid coordinates"));
      } else {
        resolve({
          RouteMatrix: [[{ Distance: 12, DurationSeconds: 24 }]],
        });
      }
    } else {
      reject(new Error("Unknown command"));
    }
  });
});

jest.mock("@aws-sdk/client-geo-routes", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-routes"),
  GeoRoutesClient: jest.fn().mockImplementation(() => {
    return {
      send: mockedRoutesClientSend,
    };
  }),
}));
import {
  GeoRoutesClient,
  CalculateRoutesCommand,
  CalculateRouteMatrixCommand,
  CalculateRoutesRequest,
  RouteTravelMode,
} from "@aws-sdk/client-geo-routes";

const directionsService = new MigrationDirectionsService();
const distanceMatrixService = new MigrationDistanceMatrixService();
directionsService._client = new GeoRoutesClient();
distanceMatrixService._client = new GeoRoutesClient();

// The DirectionsService and DistanceMatrixService also uses the PlacesService in cases where the route is specified with a query string
// or PlaceId, so we need to set up a mocked one here.
MigrationPlacesService.prototype._client = new GeoPlacesClient();
directionsService._placesService = new MigrationPlacesService();
distanceMatrixService._placesService = new MigrationPlacesService();

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
import { Marker } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should set directionsrenderer options", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testMarkerOptions = {};
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: testMarkerOptions,
    preserveViewport: true,
    suppressMarkers: true,
    suppressPolylines: true,
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(testDirectionsRenderer._getMarkers()).toStrictEqual([]);
  expect(testDirectionsRenderer.getMap()).toBe(testMap);
  expect(testDirectionsRenderer._getMarkerOptions()).toBe(testMarkerOptions);
  expect(testDirectionsRenderer._getPreserveViewport()).toBe(true);
  expect(testDirectionsRenderer._getSuppressMarkers()).toBe(true);
  expect(testDirectionsRenderer._getSuppressPolylines()).toBe(true);
});

test("should set directionsrenderer directions option", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: {
      routes: [
        {
          bounds: null,
          legs: [
            {
              geometry: {
                LineString: 0,
              },
              start_location: { lat: 0, lng: 0 },
              end_location: { lat: 1, lng: 1 },
            },
          ],
        },
      ],
    },
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-1-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-1-route-0-leg-0",
    type: "line",
    source: "directions-renderer-1-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-2-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-2-route-0-leg-0",
    type: "line",
    source: "directions-renderer-2-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer twice", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 2, lng: 2 },
            end_location: { lat: 3, lng: 3 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(2);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-3-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(2);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-3-route-0-leg-0",
    type: "line",
    source: "directions-renderer-3-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(4);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with all polylineOptions set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Blue",
      strokeWeight: 10,
      strokeOpacity: 0.1,
      visible: false,
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-4-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-4-route-0-leg-0",
    type: "line",
    source: "directions-renderer-4-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "none",
    },
    paint: {
      "line-color": "Blue",
      "line-width": 10,
      "line-opacity": 0.1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeColor set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Red",
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-5-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-5-route-0-leg-0",
    type: "line",
    source: "directions-renderer-5-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Red",
      "line-width": 3,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeWeight set", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeWeight: 1,
    },
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  });

  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddSource).toHaveBeenCalledWith("directions-renderer-6-route-0-leg-0", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledWith({
    id: "directions-renderer-6-route-0-leg-0",
    type: "line",
    source: "directions-renderer-6-route-0-leg-0",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Black",
      "line-width": 1,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call getDirections method on directionsrenderer", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  const result = testDirectionsRenderer.getDirections();

  expect(result).toBe(directions);
});

test("should clear directions when directionsrenderer removed from map", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: {
      routes: [
        {
          bounds: null,
          legs: [
            {
              geometry: {
                LineString: 0,
              },
              start_location: { lat: 0, lng: 0 },
              end_location: { lat: 1, lng: 1 },
            },
          ],
        },
      ],
    },
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(mockAddSource).toHaveBeenCalledTimes(1);
  expect(mockAddLayer).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);

  // Clear the directions (remove from map)
  testDirectionsRenderer.setMap(null);

  expect(testDirectionsRenderer.getMap()).toBeNull();
  expect(mockRemoveSource).toHaveBeenCalledTimes(1);
  expect(mockRemoveLayer).toHaveBeenCalledTimes(1);
  expect(testDirectionsRenderer._getMarkers().length).toBe(0);
});

test("creating a DirectionsRenderer with no options should be a no-op", () => {
  const testDirectionsRenderer = new MigrationDirectionsRenderer({});

  // Also pass empty options through directly invoke with null instead of empty object on creation
  testDirectionsRenderer.setOptions(null);

  expect(mockAddSource).toHaveBeenCalledTimes(0);
  expect(mockAddLayer).toHaveBeenCalledTimes(0);
  expect(Marker).toHaveBeenCalledTimes(0);
});

test("should be able to set route index on the directions renderer", () => {
  const testDirectionsRenderer = new MigrationDirectionsRenderer({});

  // Route index should be 0 by default
  expect(testDirectionsRenderer.getRouteIndex()).toStrictEqual(0);

  testDirectionsRenderer.setRouteIndex(3);
  expect(testDirectionsRenderer.getRouteIndex()).toStrictEqual(3);
});

test("should be able to set route index on the directions renderer through setOptions", () => {
  const testDirectionsRenderer = new MigrationDirectionsRenderer({});

  // Route index should be 0 by default
  expect(testDirectionsRenderer.getRouteIndex()).toStrictEqual(0);

  testDirectionsRenderer.setOptions({
    routeIndex: 2,
  });

  expect(testDirectionsRenderer.getRouteIndex()).toStrictEqual(2);
});

test("should allow calling setDirections with multiple routes", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  expect(testDirectionsRenderer.getDirections()).toBe(directions);
});

test("should not render if route index is out of bounds", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    routeIndex: 3,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 0, lng: 0 },
                end_location: { lat: 1, lng: 1 },
              },
            ],
          },
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 1, lng: 1 },
                end_location: { lat: 2, lng: 2 },
              },
            ],
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  // Sources and layers shouldn't be added since the route index is out of bounds
  expect(mockAddSource).toHaveBeenCalledTimes(0);
  expect(mockAddLayer).toHaveBeenCalledTimes(0);
});

test("should call setDirections with a route that contains multiple legs and create multiple markers", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 0, lng: 0 },
                end_location: { lat: 1, lng: 1 },
              },
            ],
          },
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 2, lng: 2 },
            steps: [
              {
                start_location: { lat: 1, lng: 1 },
                end_location: { lat: 2, lng: 2 },
              },
            ],
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);

  expect(testDirectionsRenderer._getMarkers().length).toBe(3);
});

test("should call addEventListener method on directionsrenderer", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const handlerSpy = jest.fn();
  testDirectionsRenderer.addListener("directions_changed", handlerSpy);
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);
  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should return undefined for addEventListener method with invalid listenerType", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
  const handlerSpy = jest.fn();
  const listener = testDirectionsRenderer.addListener("directions_changed", handlerSpy, "");

  expect(handlerSpy).toHaveBeenCalledTimes(0);
  expect(listener).toBeUndefined();
});

test("should get new directions in handler when directions_changed event", (done) => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const firstDirections = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };
  const secondDirections = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 2, lng: 2 },
            end_location: { lat: 3, lng: 3 },
          },
        ],
      },
    ],
  };
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: firstDirections,
  });
  const handler = () => {
    // directions should be set to new directions by the time you can call 'getDirections'
    expect(testDirectionsRenderer.getDirections()).toBe(secondDirections);
    done();
  };
  testDirectionsRenderer.addListener("directions_changed", handler);
  testDirectionsRenderer.setDirections(secondDirections);
});

test("should return route with origin as LatLng and destination as LatLng", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoRoutesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;

    expect(routes.length).toStrictEqual(1);

    const route = routes[0];

    const bounds = route.bounds;
    expect(bounds.equals(testRouteBounds)).toStrictEqual(true);

    const legs = route.legs;

    expect(legs.length).toStrictEqual(1);

    const leg = legs[0];

    expect(leg.steps.length).toStrictEqual(7);
    expect(leg.start_location.equals(origin)).toStrictEqual(true);
    expect(leg.end_location.equals(destination)).toStrictEqual(true);

    done();
  });
});

test("should return route with origin as LatLng and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: {
      location: destination,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoRoutesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as Place.location and destination as LatLng", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: {
      location: origin,
    },
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as Place.location and destination as Place.location", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: {
      location: origin,
    },
    destination: {
      location: destination,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin and destination are both specified as parseable values, the only mocked
    // GeoPlacesClient call should be the CalculateRoutesCommand
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as string and destination as Place.query", (done) => {
  const request = {
    origin: "cool place",
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since both origin and destination were query inputs, these will both trigger a
    // findPlaceFromQuery request to retrieve the location geometry, so there
    // will be a total of 3 mocked send calls (2 for places, 1 for routes)
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));

    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    done();
  });
});

test("should return route with origin as Place.placeId and destination as Place.query", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    // Since origin was a placeId and destination was a query input, these will trigger a
    // getDetails and findPlaceFromQuery request (respectively) to retrieve the location geometry,
    // so there will be a total of 3 mocked send calls (2 for places, 1 for routes)
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(2);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));

    const geocodedWaypoints = response.geocoded_waypoints;
    const routes = response.routes;
    expect(geocodedWaypoints?.length).toStrictEqual(2);
    expect(routes.length).toStrictEqual(1);

    const route = routes[0];
    const legs = route.legs;
    expect(legs.length).toStrictEqual(1);

    const leg = legs[0];
    const distance = leg.distance;
    const steps = leg.steps;
    const duration = leg.duration;
    const start_address = leg.start_address;
    const end_address = leg.end_address;
    const start_location = leg.start_location;
    const end_location = leg.end_location;
    expect(distance).toStrictEqual({
      text: "4.0 km",
      value: 4047,
    });
    expect(steps.length).toStrictEqual(7);
    expect(duration).toStrictEqual({
      text: "8 mins",
      value: 423,
    });

    expect(start_address).toStrictEqual("cool place, austin, tx");
    expect(end_address).toStrictEqual("another cool place, austin, tx");
    expect(
      start_location.equals(new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0])),
    ).toStrictEqual(true);
    expect(end_location.equals(new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]))).toStrictEqual(
      true,
    );

    done();
  });
});

test("should return route with origin as LatLng and destination as LatLng with callback specified", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request, (results, status) => {
      // Since origin and destination are both specified as parseable values, the only mocked
      // GeoRoutesClient call should be the CalculateRoutesCommand
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));

      const routes = results.routes;
      expect(routes.length).toStrictEqual(1);

      const route = routes[0];
      const legs = route.legs;

      expect(legs.length).toStrictEqual(1);

      const leg = legs[0];

      expect(leg.steps.length).toStrictEqual(7);
      expect(leg.start_location.equals(origin)).toStrictEqual(true);
      expect(leg.end_location.equals(destination)).toStrictEqual(true);

      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
      done();
    });
});

test("should call route with options avoidFerries set to true and avoidTolls set to true", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    avoidFerries: true,
    avoidTolls: true,
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.Avoid?.Ferries).toStrictEqual(true);
    expect(clientInput.Avoid?.TollRoads).toStrictEqual(true);
    expect(clientInput.Avoid?.TollTransponders).toStrictEqual(true);

    done();
  });
});

test("should use correct travelMode when walking is specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.WALKING,
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.TravelMode).toStrictEqual("Pedestrian");

    done();
  });
});

test("should use correct departureTime when when drivingOptions are specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    drivingOptions: {
      departureTime: new Date("2020-04-22T17:57:24Z"),
    },
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.DepartureTime).toStrictEqual("2020-04-22T17:57:24.000Z");

    done();
  });
});

test("should call route with option waypoints set", (done) => {
  const request: google.maps.DirectionsRequest = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    // stopover is true by default
    expect(clientInput.Waypoints).toStrictEqual([
      {
        Position: [8, 7],
        PassThrough: false,
      },
    ]);

    done();
  });
});

test("should handle waypoint stopover being set to true", (done) => {
  const request: google.maps.DirectionsRequest = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
        stopover: true,
      },
    ],
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.Waypoints).toStrictEqual([
      {
        Position: [8, 7],
        PassThrough: false,
      },
    ]);

    done();
  });
});

test("should handle waypoint stopover being set to false", (done) => {
  const request: google.maps.DirectionsRequest = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
        stopover: false,
      },
    ],
  };

  directionsService.route(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
    const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

    expect(clientInput.Waypoints).toStrictEqual([
      {
        Position: [8, 7],
        PassThrough: true,
      },
    ]);

    done();
  });
});

test("should call route with option waypoints set and callback specified", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService
    .route(request, (_, status) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      expect(clientInput.Waypoints).toStrictEqual([
        {
          Position: [8, 7],
          PassThrough: false,
        },
      ]);
      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
      done();
    });
});

test("route should handle provideRouteAlternatives if specified", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(3, 4); // The mock will throw an error for this position

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
    provideRouteAlternatives: true,
  };

  directionsService
    .route(request, (response, status) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRoutesCommand));
      const clientInput: CalculateRoutesRequest = mockedRoutesClientSend.mock.calls[0][0].input;

      expect(clientInput.MaxAlternatives).toStrictEqual(2);
      expect(response.routes).toHaveLength(3);
      expect(status).toStrictEqual(DirectionsStatus.OK);
    })
    .then(() => {
      done();
    });
});

test("route should handle client error", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error with waypoint specified", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          query: "another cool place",
        },
      },
    ],
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing findPlaceFromQuery origin request", (done) => {
  const request = {
    origin: clientErrorQuery,
    destination: {
      query: "cool place",
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing findPlaceFromQuery destination request", (done) => {
  const request = {
    origin: "cool place",
    destination: clientErrorQuery,
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing getDetails destination request", (done) => {
  const request = {
    origin: "cool place",
    destination: {
      placeId: clientErrorPlaceId,
    },
    travelMode: TravelMode.DRIVING,
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("route should handle client error when performing getDetails waypoint request", (done) => {
  const request = {
    origin: {
      placeId: "KEEP_AUSTIN_WEIRD",
    },
    destination: {
      query: "another cool place",
    },
    travelMode: TravelMode.DRIVING,
    waypoints: [
      {
        location: {
          placeId: clientErrorPlaceId,
        },
      },
    ],
  };

  directionsService
    .route(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DirectionsStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      // Signal the unit test is complete
      done();
    });
});

test("should return getDistanceMatrix with origin as Place.placeId and destination as Place.query", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService.getDistanceMatrix(request).then((response) => {
    // Since origin was a placeId and destination was a query input, these will trigger a
    // getDetails and findPlaceFromQuery request (respectively) to retrieve the location geometry,
    // once these are processed, the response will have origin and destination positions which will
    // need converting to human readable addresses via ReverseGeocodeCommand.
    // So, there will be a total of 4 mocked GeoPlacesClient.send calls (2 for the places query,
    // 2 for reverseGeocode) and  1 mocked GeoRoutesClient.send call for distance matrix
    expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
    expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));
    expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(ReverseGeocodeCommand));

    const rows = response.rows;
    expect(rows.length).toStrictEqual(1);

    const row = rows[0];
    expect(row.elements.length).toStrictEqual(1);

    const element = row.elements[0];
    expect(element.distance).toStrictEqual({
      text: "12 m",
      value: 12,
    });
    expect(element.duration).toStrictEqual({
      text: "1 min",
      value: 24,
    });
    expect(element.status).toStrictEqual(DistanceMatrixElementStatus.OK);

    // Verify addresses are present
    expect(response.originAddresses).toEqual(["Test Address"]);
    expect(response.destinationAddresses).toEqual(["Test Address"]);

    done();
  });
});

test("should call getDistanceMatrix with options avoidFerries set to true and avoidTolls set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidFerries: true,
    avoidTolls: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Avoid: { Ferries: true, TollRoads: true, TollTransponders: true },
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options avoidHighways and avoidTolls set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidHighways: true,
    avoidTolls: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Avoid: { TollTransponders: true, TollRoads: true, ControlledAccessHighways: true },
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options avoidHighways and avoidFerries set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidFerries: true,
    avoidHighways: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Avoid: { Ferries: true, ControlledAccessHighways: true },
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options travel mode set to driving, unit system set to metric, and departureTime set", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    unitSystem: UnitSystem.METRIC,
    drivingOptions: {
      departureTime: new Date("2000-01-01"),
    },
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
          DepartureTime: new Date("2000-01-01").toISOString(),
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options travel mode set to walking and unit system set to imperial", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.WALKING,
    unitSystem: UnitSystem.IMPERIAL,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.PEDESTRIAN,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("getDistanceMatrix should handle client error when performing getDetails destination request", (done) => {
  const request = {
    origins: ["cool place"],
    destinations: [
      {
        placeId: clientErrorPlaceId,
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      done();
    });
});

test("getDistanceMatrix should handle client error when performing findPlaceFromQuery origin request", (done) => {
  const request = {
    origins: [clientErrorQuery],
    destinations: [
      {
        query: "cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(2);

      done();
    });
});

test("getDistanceMatrix should handle client error", (done) => {
  const origin = new MigrationLatLng(1, 2);
  const destination = new MigrationLatLng(-1, -1); // The mock will throw an error for this position

  const request = {
    origins: [origin],
    destinations: [destination],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request)
    .then(() => {})
    .catch((error) => {
      expect(error.status).toStrictEqual(DistanceMatrixStatus.UNKNOWN_ERROR);
      expect(console.error).toHaveBeenCalledTimes(1);

      // Signal the unit test is complete
      done();
    });
});

test("getDistanceMatrix will invoke the callback if specified", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
  };

  distanceMatrixService
    .getDistanceMatrix(request, (results, status) => {
      expect(mockedRoutesClientSend).toHaveBeenCalledTimes(1);
      expect(mockedPlacesClientSend).toHaveBeenCalledTimes(4);
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(SearchTextCommand));
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(GetPlaceCommand));
      expect(mockedRoutesClientSend).toHaveBeenCalledWith(expect.any(CalculateRouteMatrixCommand));
      expect(mockedPlacesClientSend).toHaveBeenCalledWith(expect.any(ReverseGeocodeCommand));

      const rows = results.rows;
      expect(rows.length).toStrictEqual(1);

      const row = rows[0];
      expect(row.elements.length).toStrictEqual(1);

      const element = row.elements[0];
      expect(element.distance).toStrictEqual({
        text: "12 m",
        value: 12,
      });
      expect(element.duration).toStrictEqual({
        text: "1 min",
        value: 24,
      });
      expect(element.status).toStrictEqual(DistanceMatrixElementStatus.OK);

      expect(status).toStrictEqual(DistanceMatrixStatus.OK);
    })
    .then(() => {
      done();
    });
});

test("should call getDistanceMatrix with options avoidTolls set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidTolls: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Avoid: { TollRoads: true, TollTransponders: true },
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("should call getDistanceMatrix with options avoidHighways set to true", (done) => {
  const request = {
    origins: [
      {
        placeId: "KEEP_AUSTIN_WEIRD",
      },
    ],
    destinations: [
      {
        query: "another cool place",
      },
    ],
    travelMode: TravelMode.DRIVING,
    avoidHighways: true,
  };

  distanceMatrixService.getDistanceMatrix(request).then(() => {
    expect(mockedRoutesClientSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Avoid: { ControlledAccessHighways: true },
          Origins: [{ Position: [4, 3] }],
          Destinations: [{ Position: [8, 7] }],
          TravelMode: RouteTravelMode.CAR,
          RoutingBoundary: { Geometry: { BoundingBox: [4, 3, 8, 7] }, Unbounded: false },
        },
      }),
    );

    done();
  });
});

test("should have copyrights field in route response", (done) => {
  const origin = new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]);
  const destination = new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: TravelMode.DRIVING,
  };

  directionsService.route(request).then((response) => {
    const routes = response.routes;
    expect(routes.length).toStrictEqual(1);

    const route = routes[0];
    expect(route.copyrights).toBeDefined();
    expect(route.copyrights).toStrictEqual("© AWS, HERE");

    done();
  });
});

describe("test summary field in route response", () => {
  let defaultRequest;

  beforeEach(() => {
    defaultRequest = {
      origin: new MigrationLatLng(testDeparturePosition[1], testDeparturePosition[0]),
      destination: new MigrationLatLng(testArrivalPosition[1], testArrivalPosition[0]),
      travelMode: TravelMode.DRIVING,
    };
  });

  describe("single road cases", () => {
    test("should show single road name when it's the only road", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: "Only Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Only Road");
        done();
      });
    });

    test("should show single road name when it's the only valid road among multiple", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                { RoadName: { Value: null } },
                { RoadName: { Value: "Valid Road" } },
                { RoadName: { Value: undefined } },
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Valid Road");
        done();
      });
    });
  });

  describe("two roads cases", () => {
    test("should show both road names when two different roads are available", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: "First Road" } }, { RoadName: { Value: "Last Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("First Road and Last Road");
        done();
      });
    });

    test("should show single road name when both roads are identical", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: "Same Road" } }, { RoadName: { Value: "Same Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Same Road");
        done();
      });
    });

    test("should show first road name when second is invalid", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: "First Road" } }, { RoadName: { Value: undefined } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("First Road");
        done();
      });
    });

    test("should show second road name when first is invalid", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: null } }, { RoadName: { Value: "Second Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Second Road");
        done();
      });
    });
  });

  describe("multiple roads cases", () => {
    test("should show first and last valid roads when there are three roads", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                { RoadName: { Value: "First Road" } },
                { RoadName: { Value: "Middle Road" } },
                { RoadName: { Value: "Last Road" } },
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("First Road and Last Road");
        done();
      });
    });

    test("should show first and last valid roads when middle roads are invalid", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                { RoadName: { Value: "First Road" } },
                { RoadName: { Value: null } },
                { RoadName: { Value: undefined } },
                { RoadName: { Value: "Last Road" } },
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("First Road and Last Road");
        done();
      });
    });

    test("should show valid road names when first and last are invalid", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                { RoadName: { Value: null } },
                { RoadName: { Value: "Second Road" } },
                { RoadName: { Value: "Third Road" } },
                { RoadName: { Value: undefined } },
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Second Road and Third Road");
        done();
      });
    });
  });

  describe("invalid input cases", () => {
    test("should have summary field defined", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: { Value: "Test Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        const routes = response.routes;
        expect(routes.length).toStrictEqual(1);
        expect(response.routes[0].summary).toBeDefined();
        done();
      });
    });

    test("should return empty string when MajorRoadLabels is undefined", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("");
        done();
      });
    });

    test("should return empty string when MajorRoadLabels is null", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: null,
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("");
        done();
      });
    });

    test("should return empty string when MajorRoadLabels is empty array", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("");
        done();
      });
    });
  });

  describe("edge cases for label mapping", () => {
    test("should handle null label in MajorRoadLabels", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [null, { RoadName: { Value: "Valid Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Valid Road");
        done();
      });
    });

    test("should handle undefined label in MajorRoadLabels", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [undefined, { RoadName: { Value: "Valid Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Valid Road");
        done();
      });
    });

    test("should handle null RoadName in label", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [{ RoadName: null }, { RoadName: { Value: "Valid Road" } }],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("Valid Road");
        done();
      });
    });

    test("should handle array with all invalid labels", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                null,
                undefined,
                { RoadName: null },
                { RoadName: undefined },
                { RoadName: { Value: null } },
                { RoadName: { Value: undefined } },
                {},
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("");
        done();
      });
    });

    test("should handle mixed valid and invalid labels", (done) => {
      mockedRoutesClientSend.mockImplementationOnce(() =>
        Promise.resolve({
          Routes: [
            {
              MajorRoadLabels: [
                null,
                { RoadName: { Value: "First Valid" } },
                undefined,
                { RoadName: null },
                { RoadName: { Value: "Second Valid" } },
                { RoadName: undefined },
              ],
              Legs: [],
            },
          ],
        }),
      );

      directionsService.route(defaultRequest).then((response) => {
        expect(response.routes[0].summary).toStrictEqual("First Valid and Second Valid");
        done();
      });
    });
  });
});
