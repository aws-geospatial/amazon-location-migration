// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { globSync } = require("glob");
const fs = require("fs");
const Mustache = require("mustache");

// Retrieve the user's config for the placeholder values
const exampleConfig = require("./config.json");

// Find all of the templated html files in our examples
const templateFiles = globSync("./examples/**/*.template.html");

// Generate .html files from all of our templates, after replacing the placeholder values
for (const file of templateFiles) {
  const template = fs.readFileSync(file).toString();

  // Generate our new html using mustache to replace the templated values
  const generatedHtml = Mustache.render(template, exampleConfig);

  console.log(`Generating html from template: ${file}`);

  const generatedFileName = file.replace(".template", "");
  fs.writeFileSync(generatedFileName, generatedHtml);
}
