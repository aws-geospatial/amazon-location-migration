# Amazon Location Migration Adapter

TODO: Fill this README out!

## Developing

Prerequisites:

- Install `Node.js >= 18.x` from https://nodejs.org/en/download
- Install `Prettier` and `ESLint` plugins for Visual Studio Code
- Select `Prettier` as your `Default Formatter` (Code &rarr; Settings &rarr; Settings &rarr; search `format`)
- Check off `Format On Save` (Code &rarr; Settings &rarr; Settings &rarr; search `format`)

To develop this package, first create a fork of the repo and then set the upstream to this repository, e.g:

```
git clone https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration-adapter
cd amazon-location-migration-adapter
git remote add upstream https://github.com/aws-geospatial/amazon-location-migration-adapter.git
git remote set-url --push upstream THESE_ARENT_THE_DROIDS_WERE_LOOKING_FOR
```

The `set-url --push upstream` line can be any string that isn't a url, it's just meant to prevent you from accidentally pushing to the upstream repo.
At this point, your remote setup should look something like this:

```
> git remote -v
origin	https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration-adapter.git (fetch)
origin	https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration-adapter.git (push)
upstream	https://github.com/aws-geospatial/amazon-location-migration-adapter.git (fetch)
upstream	THESE_ARENT_THE_DROIDS_WERE_LOOKING_FOR (push)
```

To install all the necessary dependencies, run:

```
npm install
```

To build the adapter, run:

```
> npm run build
created dist/amazonLocationMigrationAdapter.js in 2.1s
```

To run the unit tests, run:

```
npm test
```

## Examples

There are several examples under the `<root>/examples` folder that you can run locally with the built migration adapter.

Each example has an `index.html` and a `google.html` page, of which the only difference between them is that the `index.html` imports our migration adapter.
The examples also have an `example.js` script that holds the client logic for the example. This client logic is shared between both `index` and `google` example pages
in order to showcase that the client logic can invoke the same `google.maps` APIs, but will be re-routed by the migration adapter for any APIs that the migration adapter supports.

The examples can be hosted on a local webserver with the following command:

```
npm run hostExamples
```

### Basic map

- http://localhost:3000/examples/basicMap/index.html
- http://localhost:3000/examples/basicMap/google.html

### Autocomplete

- http://localhost:3000/examples/autoComplete/index.html
- http://localhost:3000/examples/autoComplete/google.html

### Directions

- http://localhost:3000/examples/directions/index.html
- http://localhost:3000/examples/directions/google.html

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
