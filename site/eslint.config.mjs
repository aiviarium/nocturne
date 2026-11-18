import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // public/gallery/ is the built gallery; src/generated/ is data from the library.
  globalIgnores(['.next/**', 'out/**', '.source/**', 'next-env.d.ts', 'public/gallery/**', 'src/generated/**']),
]);
