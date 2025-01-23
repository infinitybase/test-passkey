import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        sdk: resolve(__dirname, "bakoui.html"), // Serve apenas o bakoui.html
      },
    },
  },
  server: {
    port: 5173, // Porta padrão para o servidor
  },
  preview: {
    port: 5173, // Porta para o preview
  },
});
