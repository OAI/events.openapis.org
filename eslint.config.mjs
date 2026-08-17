import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    ignores: ['.next/**', '.open-next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // Standard mount-flag pattern for `next-themes` etc. is intentional.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
