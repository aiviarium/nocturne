import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // public/gallery/ and public/demo/ are built from the library; src/generated/ is data from it.
  globalIgnores([
    '.next/**',
    'out/**',
    '.source/**',
    'next-env.d.ts',
    'public/gallery/**',
    'public/demo/**',
    'src/generated/**',
  ]),
]);
