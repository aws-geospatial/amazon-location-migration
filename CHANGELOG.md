# 2.0.0

### ⚠️ Breaking changes

- **MapLibre GL JS 6**: Updated `maplibre-gl` from 5.5.0 to 6.11.2 to resolve a critical XSS sanitizer bypass in `DOM.sanitize()` ([CVE-2026-85061](https://nvd.nist.gov/vuln/detail/CVE-2026-85061), [GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579)). The first fixed MapLibre release is 6.4.1, so this release moves the SDK to MapLibre v6
- **ES modules only**: The CommonJS build (`dist/cjs` and the `main` entry) is removed, because MapLibre v6 cannot be loaded with `require()`. Import the SDK as an ES module
- **WebGL2 required**: MapLibre v6 requires a browser with WebGL2
- **MapLibre worker**: MapLibre v6 loads its web worker from a separate file (`maplibre-gl-worker.mjs`, which imports `maplibre-gl-shared.mjs`):
  - Script tag: the SDK loads the worker from the same folder as `amazonLocationMigrationSDK.js`, and both files now ship in `dist/`. If you self-host the SDK, copy `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` next to `amazonLocationMigrationSDK.js`
  - NPM `Loader`: added a `workerUrl` option to serve the worker from your own site. By default the `Loader` uses the worker for the bundled MapLibre version from jsDelivr, unless your app already set one with MapLibre's `setWorkerUrl()`
  - Content Security Policy: a worker loaded from a different origin (for example jsDelivr) is started from a `blob:` URL, so your CSP must allow `worker-src blob:`. A same-origin worker needs only `worker-src 'self'`
- See [MapLibre worker and browser requirements](README.md#maplibre-worker-and-browser-requirements) for setup details, including Vite and other bundlers

### ✨ Features and improvements

- The script-tag bundle now escapes non-ASCII characters so it loads on pages that don't declare UTF-8
- Removed the unneeded source map comment from the bundled MapLibre worker files, so dev servers no longer request a missing source map
- Security: Updated development and transitive dependencies to resolve vulnerabilities, including `brace-expansion`, `braces`, `handlebars`, `js-yaml` ([GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)), `markdown-it`, `shell-quote`, `source-map-js`, `browserslist`, and `@humanfs`, and removed `sprintf-js` ([GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c))

# 1.4.0

### ✨ Features and improvements

- **Transit Routing**: Added support for `TravelMode.TRANSIT` in `DirectionsRequest`, leveraging Amazon Location's [new public transit routing](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-location-service/amazon-location-new-public-transit-intermodal-routing/). Includes `transitOptions.modes` mapping, rich `transit_details` on each step, and an updated advanced demo showcasing transit routes
- Updated `@aws-sdk/client-geo-routes`, `@aws-sdk/client-geo-places`, and `@aws-sdk/client-geo-maps` to `^3.1063.0`

# 1.3.1

### ✨ Features and improvements

- Security: Updated dependencies to resolve vulnerabilities:
  - `postcss` - updated from 8.5.3 to 8.5.12
  - `fast-xml-parser` - updated from 5.5.8 to 5.7.2
  - `protocol-buffers-schema` - updated from 3.6.0 to 3.6.1

# 1.3.0

### ✨ Features and improvements

- **Map Styles**: Extended map style support for additional style/query parameter combinations:
  - Color scheme support now available for Hybrid and Satellite map styles (previously Standard only)
  - Traffic layer and travel mode support now available for Hybrid map style (previously Standard only)
- Security: Updated `vite` dev dependency to resolve [security vulnerability](https://github.com/aws-geospatial/amazon-location-migration/security/dependabot/80)

# 1.2.0

### ✨ Features and improvements

- **Geometry Library**: Added full implementation of `google.maps.geometry` namespace including:
  - Encoding utilities for polylines using the `@aws/polyline` library
  - Spherical geometry calculations
  - Polygon/polyline utilities
- **Polyline Class**: Added complete support for `google.maps.Polyline` class with rendering, styling, and path manipulation
- **Marker Improvements**: Fixed anchor offset calculation to properly align markers with MapLibre's center-based positioning
- Added React-based delivery dashboard example demonstrating real-world usage patterns
- Restructured examples directory for better organization
- Fixed import instructions for migration SDK when using js-api-loader
- Security: Updated dependencies to resolve multiple vulnerabilities:
  - `fast-xml-parser` - DoS vulnerability ([GHSA-37qj-frw5-hhjh](https://github.com/advisories/GHSA-37qj-frw5-hhjh))
  - `picomatch` - [CVE-2026-33671](https://nvd.nist.gov/vuln/detail/CVE-2026-33671) and [CVE-2026-33672](https://nvd.nist.gov/vuln/detail/CVE-2026-33672)
  - `brace-expansion` - ReDoS vulnerability ([GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v))
  - `flatted` - Prototype pollution ([CWE-1321](https://cwe.mitre.org/data/definitions/1321.html))
  - `yaml` - Stack overflow vulnerability

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
