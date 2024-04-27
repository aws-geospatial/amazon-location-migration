// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Needed due to known issue using jsdom library
// more on the issue: https://github.com/aws-amplify/amplify-ui/issues/1647
// workaround: https://ui.docs.amplify.aws/react/getting-started/troubleshooting#windowurlcreateobjecturl-is-not-a-function
if (typeof window.URL.createObjectURL === "undefined") {
  window.URL.createObjectURL = jest.fn();
}
