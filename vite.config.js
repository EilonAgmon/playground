import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        pong: resolve(__dirname, "pong/index.html"),
        travel: resolve(__dirname, "travel/index.html"),
        backoffice: resolve(__dirname, "backoffice/index.html"),
        pca: resolve(__dirname, "pca/index.html"),
        about: resolve(__dirname, "about/index.html"),
        wheels: resolve(__dirname, "wheels/index.html"),
        hq: resolve(__dirname, "hq/index.html"),
        reels: resolve(__dirname, "reels/index.html"),
        plot: resolve(__dirname, "plot/index.html"),
        globe: resolve(__dirname, "globe/index.html"),
        terminal: resolve(__dirname, "terminal/index.html"),
        tickers: resolve(__dirname, "tickers/index.html"),
        jobs: resolve(__dirname, "jobs/index.html"),
      },
    },
  },
});
