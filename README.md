# Amazon Location Migration Adapter

[![Tests](https://github.com/aws-geospatial/amazon-location-migration-adapter/actions/workflows/build.yml/badge.svg)](https://github.com/aws-geospatial/amazon-location-migration-adapter/actions/workflows/build.yml)

The Amazon Location Migration Adapter provides a bridge for users to test migrating their Google Maps application to use [Amazon Location Service](https://aws.amazon.com/location/). The adapter replaces the import of the Google Maps client SDK, which allows the rest of the applications logic to remain untouched, while under the hood it will be making Amazon Location Service requests instead.

## Usage

In order to use the adapter, you will first need to create Amazon Location Service resources based on what kinds of Google Maps API calls your application uses.
Please follow the instructions linked below based on your applications needs:

- Maps - https://docs.aws.amazon.com/location/latest/developerguide/map-prerequisites.html
- Places - https://docs.aws.amazon.com/location/latest/developerguide/places-prerequisites.html
- Routes - https://docs.aws.amazon.com/location/latest/developerguide/routes-prerequisites.html

Once you have created your resources, you can create an API key and give it access to the resources you've created:

https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html

Now that you have your resources and API key, you can replace your Google Maps JavaScript API import with the adapter. Here are examples based on which Google import method your application uses:

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

To use the migration adapter, you replace that line with the following (with your AWS region, resource name(s) and API key filled in):

```html
<script src="https://www.unpkg.com/@aws/amazon-location-migration-adapter?region={{REGION}}&map={{MAP_NAME}}&placeIndex={{PLACE_INDEX}}&routeCalculator={{ROUTE_CALCULATOR}}&apiKey={{AMAZON_LOCATION_API_KEY}}"></script>
```

If there are any resources that your application doesn't use, you can omit those query parameters. Only the `region` and `apiKey` are required.

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

To use the migration adapter, you replace that line with the following (with your AWS region, resource name(s) and API key filled in):

```html
<script
  async
  src="https://www.unpkg.com/@aws/amazon-location-migration-adapter?callback=initMap&region={{REGION}}&map={{MAP_NAME}}&placeIndex={{PLACE_INDEX}}&apiKey={{AMAZON_LOCATION_API_KEY}}"
></script>
```

If there are any resources that your application doesn't use, you can omit those query parameters. Only the `region` and `apiKey` are required.

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

## Supported Google APIs

For a full overview of supported Google Maps APIs and current limitations, please see the [Supported APIs documentation](documentation/supportedLibraries.md).

## Contributing

We welcome community contributions and pull requests. See [CONTRIBUTING](CONTRIBUTING.md) for information on how to set up a development environment, run the examples and submit code.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
