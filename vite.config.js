import { defineConfig } from "vite";

/** @type {import("vite").UserConfig} */
export default defineConfig({
  define: {
    global: {},
  },
  server: {
    open: "/examples/index.html",
    port: 8080,
  },
});
