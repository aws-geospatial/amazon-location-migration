# Amazon Location Migration SDK

[![Version](https://img.shields.io/npm/v/@aws/amazon-location-migration-sdk?style=flat)](https://www.npmjs.com/package/@aws/amazon-location-migration-sdk) [![Tests](https://github.com/aws-geospatial/amazon-location-migration/actions/workflows/build.yml/badge.svg)](https://github.com/aws-geospatial/amazon-location-migration/actions/workflows/build.yml)

The Amazon Location Migration SDK provides a bridge that allows you to migrate existing applications from Google Maps to [Amazon Location](https://aws.amazon.com/location/). The Migration SDK provides an option for your application built using the Google Maps SDK for JavaScript to use Amazon Location Service without needing to rewrite any of the application or business logic if Amazon Location supports the capabilities used. Customers can compare their current Google Maps API usage with the Migration SDK’s [list of supported APIs](documentation/supportedLibraries.md) to determine if the Migration SDK is right for them. The Migration SDK will receive updates as Amazon Location Service extends its Maps/Places/Routes feature set.

## Usage

In order to use the SDK, all you need to do is create an API key, which can be done by following these instructions:

https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html

Once you have your API key, you can replace your Google Maps JavaScript API import with the SDK. Here are examples based on which Google import method your application uses:

### Dynamic Library Import

If your application uses the [dynamic library import](https://developers.google.com/maps/documentation/javascript/load-maps-js-api#dynamic-library-import) method, your current import looks something like this:

```javascript
<script>
  (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
    key: "{{YOUR_API_KEY}}",
    v: "weekly",
    // Use the 'v' parameter to indicate the version to use (weekly, beta, alpha, etc.).
    // Add other bootstrap parameters as needed, using camel case.
  });
</script>
```

To use the migration SDK, you replace that line with the following (with your AWS region and API key filled in):

```html
<script src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-migration-sdk/dist/amazonLocationMigrationSDK.min.js?region={{REGION}}&apiKey={{AMAZON_LOCATION_API_KEY}}"></script>
```

The import is the only change you need to make in your client code. The rest of your code will function as-is but will now be making Amazon Location Service API requests, such as the example below:

```javascript
let map;

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 30.268193, lng: -97.7457518 },
    zoom: 8,
  });
}

initMap();
```

### Direct Script Loading Tag (Legacy)

If your application uses the [legacy direct script loading tag](https://developers.google.com/maps/documentation/javascript/load-maps-js-api#use-legacy-tag), your current import looks something like this:

```html
<script
  async
  src="https://maps.googleapis.com/maps/api/js?key={{YOUR_API_KEY}}&loading=async&callback=initMap&libraries=places"
></script>
```

To use the migration SDK, you replace that line with the following (with your AWS region and API key filled in):

```html
<script
  async
  src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-migration-sdk/dist/amazonLocationMigrationSDK.min.js?callback=initMap&region={{REGION}}&apiKey={{AMAZON_LOCATION_API_KEY}}"
></script>
```

The import is the only change you need to make in your client code. The rest of your code will function as-is but will now be making Amazon Location Service API requests, such as the example below:

```javascript
let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 30.268193, lng: -97.7457518 },
    zoom: 8,
  });
}

window.initMap = initMap;
```

### NPM js-api-loader usage

If your application uses the [NPM js-api-loader](https://developers.google.com/maps/documentation/javascript/load-maps-js-api#js-api-loader) package, your current import looks something like this:

```javascript
import { Loader } from "@googlemaps/js-api-loader";

const loader = new Loader({
  apiKey: "YOUR_API_KEY",
  version: "weekly",
  ...additionalOptions,
});

loader.load().then(async () => {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 30.268193, lng: -97.7457518 },
    zoom: 8,
  });
});
```

To use the migration SDK, you just need to replace the `apiKey` field with your Amazon Location API key and also add a field replace to specify your `region` (unless you are using `us-west-2`, which it will use by default if no `region` is passed).
The logic when you call `load` and beyond remains the same:

```javascript
import { Loader } from "@googlemaps/js-api-loader";

const loader = new Loader({
  apiKey: "AMAZON_LOCATION_API_KEY",
  region: "AMAZON_LOCATION_REGION",
  version: "weekly",
  ...additionalOptions,
});

loader.load().then(async () => {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 30.268193, lng: -97.7457518 },
    zoom: 8,
  });
});
```

The migration SDK also supports using `loader.importLibrary()` to load libraries:

```javascript
const loader = new Loader({
  apiKey: "YOUR_API_KEY",
  version: "weekly",
  ...additionalOptions,
});

loader.importLibrary("maps").then(({ Map }) => {
  new Map(document.getElementById("map"), mapOptions);
});
```

## Supported Google APIs

For a full overview of supported Google Maps APIs and current limitations, please see the [Supported APIs documentation](documentation/supportedLibraries.md).

## Running Examples

We have several examples that demonstrate the Migration SDK. These examples are under the `<root>/examples` folder that you can run locally with the built migration SDK.

First, build the Migration SDK in your local environment by running the following:

```
npm install
npm run build
```

Next, you will need to setup your configuration so that the examples can be generated. The examples are generated from templates that have placeholder values for your resources (e.g. API keys). You will need to fill out an `examples/config.json` file with your specific values.

Copy the `examples/config.template.json` file:

```
cp examples/config.template.json examples/config.json
```

Next, open your new `examples/config.json` file and fill it in with your resource values. Anytime you run the examples, they will be auto-generated reading from your `examples/config.json`.

Each example has an `index.html` and a `google.html` page, of which the only difference between them is that the `index.html` imports our migration SDK.
The examples also have an `example.js` script that holds the client logic for the example. This client logic is shared between both `index` and `google` example pages
in order to showcase that the client logic can invoke the same `google.maps` APIs, but will be re-routed by the migration SDK for any APIs that the migration SDK supports.

The examples can be generated + hosted on a local webserver with the following command:

```
npm run hostExamples
```

The examples landing page will be launched in your local browser, or can be visisted here:

http://localhost:8080/examples/landingPage.html

## Contributing

We welcome community contributions and pull requests. See [CONTRIBUTING](CONTRIBUTING.md) for information on how to set up a development environment, and submit code.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
