// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This module has methods for converting between Google and Amazons place category types as outlined below:
//      Google: https://developers.google.com/maps/documentation/places/web-service/supported_types
//      Amazon: https://docs.aws.amazon.com/location/latest/developerguide/places-filtering.html#place-categories

// These place types have a direct 1 to 1 mapping between both Google and Amazon
const placeTypeDirectMappings = [
  "amusement_park",
  "aquarium",
  "atm",
  "bank",
  "bus_station",
  "casino",
  "cemetery",
  "church",
  "city_hall",
  "convenience_store",
  "courthouse",
  "department_store",
  "embassy",
  "florist",
  "furniture_store",
  "library",
  "mosque",
  "night_club",
  "pharmacy",
  "post_office",
  "primary_school",
  "school",
  "secondary_school",
  "shopping_mall",
  "storage",
  "synagogue",
  "taxi_stand",
  "tourist_attraction",
  "train_station",
  "zoo",
];

// There are many place types where the corresponding place types in Amazon results either have a single, slightly different ID,
// or there are multiple, more granular place types that correspond to a single Google place type. For example:
//      Google          Amazon
//      ----------      --------------------
//      bar             bar_or_pub
//      campground      campground, campsite
const googlePlaceTypeToAmazonMapping: Record<string, string[] | null> = {
  accounting: ["finance_and_insurance"],
  airport: ["airport", "airport_cargo", "airport_terminal"],
  art_gallery: ["gallery"],
  bakery: ["bakery_and_baked_goods_store"],
  bar: ["bar_or_pub"],
  beauty_salon: ["hair_and_beauty"],
  bicycle_store: ["bicycle_and_bicycle_accessories_shop"],
  book_store: ["bookstore", "other_bookshop"],
  bowling_alley: ["bowling_center"],
  cafe: ["coffee_shop"],
  campground: ["campground", "campsite"],
  car_dealer: ["automobile_dealership-new_cars", "automobile_dealership-used_cars"],
  car_rental: ["rental_car_agency"],
  car_repair: ["car_repair", "car_repair-service"],
  car_wash: ["car_wash-detailing"],
  clothing_store: ["clothing_and_accessories", "specialty_clothing_store"],
  dentist: ["dentist-dental_office"],
  doctor: ["family-general_practice_physicians"],
  drugstore: ["drugstore", "drugstore_or_pharmacy"],
  electrician: ["electrical"],
  electronics_store: ["consumer_electronics_store"],
  fire_station: ["fire_department"],
  funeral_home: ["funeral_director"],
  gas_station: ["petrol-gasoline_station"],
  gym: ["fitness-health_club"],
  hair_care: ["hair_salon"],
  hardware_store: ["hardware,_house_and_garden"],
  hindu_temple: ["temple"],
  home_goods_store: ["home_specialty_store"],
  hospital: ["hospital", "hospital_emergency_room", "hospital_or_health_care_facility"],
  insurance_agency: ["finance_and_insurance"],
  jewelry_store: ["jewler"],
  laundry: ["dry_cleaning_and_laundry"],
  lawyer: ["legal_services"],
  light_rail_station: ["lightrail"],
  liquor_store: ["wine_and_liquor"],
  local_government_office: ["government_office"],
  locksmith: ["locksmiths_and_security_systems_services"],
  lodging: ["lodging", "hotel", "hotel_or_motel", "motel"],
  meal_delivery: ["take_out_and_delivery_only"],
  meal_takeaway: ["take_out_and_delivery_only"],
  movie_rental: ["video_and_game_rental"],
  movie_theater: ["theatre,_music_and_culture"],
  moving_company: ["mover"],
  museum: ["museum", "art_museum", "children's_museum", "history_museum", "science_museum"],
  painter: ["paint_store"],
  park: ["park-recreation_area"],
  parking: [
    "parking",
    "bicycle_parking",
    "motorcycle,_moped_and_scooter_parking",
    "parking_and_restroom_only_rest_area",
    "parking_garage-parking_house",
    "parking_lot",
    "parking_only_rest_area",
    "truck_parking",
  ],
  pet_store: ["pet_care", "pet_supply"],
  physiotherapist: null,
  plumber: ["plumbing"],
  police: ["police_station", "police_box", "police_services-security"],
  real_estate_agency: ["real_estate_services"],
  restaurant: ["restaurant", "casual_dining", "fine_dining"],
  roofing_contractor: ["specialty_trade_contractors"],
  rv_park: ["rv_parks"],
  show_store: ["shoes-footwear"],
  spa: ["fitness-health_club"],
  stadium: ["sports_complex-stadium", "sports_facility-venue"],
  store: ["specialty_store"],
  subway_station: ["underground_train-subway"],
  supermarket: ["grocery"],
  transit_station: ["bus_rapid_transit", "local_transit", "public_transit_access"],
  travel_agency: ["travel_agent-ticketing"],
  university: ["education_facility"],
  veterinary_care: ["veterinarian"],
};

// Build a reverse mapping of Amazon place type to Google for the cases where Amazon's place type either
// has a single different mapping, or multiple mappings that correspond to a single Google place type
const amazonPlaceTypeToGoogleMapping: Record<string, string> = {};
Object.entries(googlePlaceTypeToAmazonMapping).forEach(([googleType, amazonCategories]) => {
  if (amazonCategories == null) {
    return;
  }

  amazonCategories.forEach((amazonCategory) => {
    amazonPlaceTypeToGoogleMapping[amazonCategory] = googleType;
  });
});

export const convertGooglePlaceTypeToAmazon = (placeType: string) => {
  // If there is a direct mapping, just return the same type
  if (placeTypeDirectMappings.includes(placeType)) {
    return placeType;
  }

  // If there are multiple mappings to Amazon, pick the first one because those are the most generic
  // as opposed to more granular (e.g. museum vs. art_museum)
  if (placeType in googlePlaceTypeToAmazonMapping) {
    const amazonTypes = googlePlaceTypeToAmazonMapping[placeType];
    if (amazonTypes) {
      return googlePlaceTypeToAmazonMapping[placeType][0];
    }
  }

  return null;
};

export const getAllAmazonPlaceTypesFromGoogle = (placeType: string) => {
  if (placeTypeDirectMappings.includes(placeType)) {
    return [placeType];
  }

  if (placeType in googlePlaceTypeToAmazonMapping) {
    return googlePlaceTypeToAmazonMapping[placeType];
  }

  return null;
};

export const convertAmazonPlaceTypeToGoogle = (placeType: string) => {
  // If there is a direct mapping, just return the same type
  if (placeTypeDirectMappings.includes(placeType)) {
    return placeType;
  }

  // Otherwise, return from the reverse mapping that is constructed
  if (placeType in amazonPlaceTypeToGoogleMapping) {
    return amazonPlaceTypeToGoogleMapping[placeType];
  }

  return null;
};
