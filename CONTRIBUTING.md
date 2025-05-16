# Contributing Guidelines

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary
information to effectively respond to your bug report or contribution.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already
reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

- A reproducible test case or series of steps
- The version of our code being used
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

## Contributing via Pull Requests

Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the _main_ branch.
1. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
1. You open an issue to discuss any significant work - we would hate for your time to be wasted.

### Prerequisites

- Install `Node.js >= 18.x` from https://nodejs.org/en/download
- Install `Prettier` and `ESLint` plugins for Visual Studio Code
- Select `Prettier` as your `Default Formatter` (Code &rarr; Settings &rarr; Settings &rarr; search `format`)
- Check off `Format On Save` (Code &rarr; Settings &rarr; Settings &rarr; search `format`)

### Submitting Pull Requests

To send us a pull request, please:

1. Fork the repository.

```
git clone https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration
cd amazon-location-migration
git remote add upstream https://github.com/aws-geospatial/amazon-location-migration.git
git remote set-url --push upstream THESE_ARENT_THE_DROIDS_WERE_LOOKING_FOR
```

The `set-url --push upstream` line can be any string that isn't a url, it's just meant to prevent you from accidentally pushing to the upstream repo.
At this point, your remote setup should look something like this:

```
> git remote -v
origin	https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration.git (fetch)
origin	https://github.com/<YOUR_GITHUB_USERNAME>/amazon-location-migration.git (push)
upstream	https://github.com/aws-geospatial/amazon-location-migration.git (fetch)
upstream	THESE_ARENT_THE_DROIDS_WERE_LOOKING_FOR (push)
```

2. Install the necessary dependencies.

```
npm install
```

3. Modify the source; please focus on the specific change you are contributing. If you also reformat all the code, it will be hard for us to focus on your change.
4. Build the SDK.

```
> npm run build
created dist/amazonLocationMigrationSDK.js in 2.1s
```

5. Ensure local tests pass.

```
npm test
```

6. Commit to your fork using clear commit messages.
7. Send us a pull request, answering any default questions in the pull request interface.
8. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Running Examples

Once you have built the migration SDK in your development environment, there are several examples under the `<root>/examples` folder that you can run locally with the built migration SDK.

The examples are generated from templates that have placeholder values for your resources (e.g. API keys). You will need to fill out an `examples/config.json` file with your specific values.

First, copy the `examples/config.template.json` file:

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

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
