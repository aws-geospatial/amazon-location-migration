# 1.1.0

### ✨ Features and improvements

- Added support for `TERRAIN` map type
- Added support for `google.maps.TrafficLayer` and `google.maps.TransitLayer`
- Updated dependency version to resolve [security vulnerability](https://github.com/aws-geospatial/amazon-location-migration/security/dependabot/23)

# 1.0.2

### ✨ Features and improvements

- Updated dependency versions which resolve security vulnerabilities
- Vulnerability links:
  - https://github.com/aws-geospatial/amazon-location-migration/security/dependabot/22
  - https://github.com/aws-geospatial/amazon-location-migration/security/dependabot/21

# 1.0.1

- Several dependency version updates

# 1.0.0

### ✨ Features and improvements

- Added support for Enhanced Places, Routes, and Maps Capabilities. The extended support includes, but is not limited to:
  - **Places** - Added support for [Search Nearby](https://developers.google.com/maps/documentation/javascript/reference/place#Place.searchNearby), [Geocode](https://developers.google.com/maps/documentation/javascript/reference/geocoder#Geocoder.geocode), and [Find Place from Phone Number](https://developers.google.com/maps/documentation/javascript/reference/places-service#PlacesService.findPlaceFromPhoneNumber) APIs. Also enhanced all place results with details such as opening hours and contact information.
  - **Routes** - Added support for providing alternate routes, step-by-step instructions, and optimizing waypoints
  - **Maps** - Added support for Google's hybrid map type, light/dark color scheme modes, and navigation + fullscreen controls
- See [Supported APIs documentation](documentation/supportedLibraries.md) for a more detailed account of supported Google APIs and fields

# 0.9.0

### ✨ Features and improvements

- Initial release of Migration SDK
