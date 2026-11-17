import { defineConfig } from 'vite';

// base relativa: funciona tanto en usuario.github.io/repo como en local
export default defineConfig({
  base: './',
  worker: { format: 'es' },
});
