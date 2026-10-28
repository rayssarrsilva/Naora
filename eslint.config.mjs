import next from 'eslint-config-next';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'cypress/screenshots/**',
      'cypress/videos/**',
      'src/generated/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  ...nextTypescript,
];

export default config;
