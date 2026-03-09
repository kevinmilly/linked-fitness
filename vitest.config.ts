import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@angular/core': resolve(__dirname, 'src/__mocks__/angular-core.ts'),
      '@angular/fire/firestore': resolve(__dirname, 'src/__mocks__/firestore.ts'),
      'firebase/firestore': resolve(__dirname, 'src/__mocks__/firestore.ts'),
    },
  },
});
