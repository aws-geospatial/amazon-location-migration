# Amazon Location Migration Adapter

TODO: Fill this README out!

## Developing

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

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
