// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["docs", "coverage", "dist", "examples"],
  overrides: [
    {
      files: ["test-utils.ts", "**/*.test.ts"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/ban-ts-comment": "off",
      },
    },
  ],
  root: true,
  // needed so that lint won't error on 'window' and 'jest' in setupFilesAfterEnv.js
  env: {
    browser: true,
    jest: true,
  },
};
