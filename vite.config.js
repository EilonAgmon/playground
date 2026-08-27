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
        backoffice: resolve(__dirname, "backoffice/index.html"),
        pca: resolve(__dirname, "pca/index.html"),
        about: resolve(__dirname, "about/index.html"),
        wheels: resolve(__dirname, "wheels/index.html"),
        hq: resolve(__dirname, "hq/index.html"),
        reels: resolve(__dirname, "reels/index.html"),
        plot: resolve(__dirname, "plot/index.html"),
        globe: resolve(__dirname, "globe/index.html"),
        tickers: resolve(__dirname, "tickers/index.html"),
        vine: resolve(__dirname, "vine/index.html"),
        ricochet: resolve(__dirname, "ricochet/index.html"),
        volfied: resolve(__dirname, "volfied/index.html"),
        salvo: resolve(__dirname, "salvo/index.html"),
        wick: resolve(__dirname, "wick/index.html"),
        barrage: resolve(__dirname, "barrage/index.html"),
        redline: resolve(__dirname, "redline/index.html"),
      },
    },
  },
});
