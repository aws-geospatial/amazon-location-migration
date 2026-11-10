// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Babel plugin used only by Jest. MapLibre GL JS v6 ships as ES modules only and reads
// `import.meta.url` to locate its worker. Jest runs tests as CommonJS, where `import.meta`
// is a syntax error, so rewrite it to the equivalent file URL of the transformed module.
module.exports = function importMetaUrl({ template }) {
  return {
    name: "jest-import-meta-url",
    visitor: {
      MemberExpression(path) {
        const { node } = path;
        if (
          node.object.type === "MetaProperty" &&
          node.object.meta.name === "import" &&
          node.object.property.name === "meta" &&
          !node.computed &&
          node.property.type === "Identifier" &&
          node.property.name === "url"
        ) {
          path.replaceWith(template.expression.ast`require("url").pathToFileURL(__filename).href`);
        }
      },
    },
  };
};
