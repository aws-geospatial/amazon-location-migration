import { defineConfig } from "vite";

/** @type {import("vite").UserConfig} */
export default defineConfig({
  define: {
    global: {},
  },
  server: {
    open: "/examples/landingPage.html",
    port: 8080,
  },
});
