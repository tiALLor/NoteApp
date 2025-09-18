/* eslint-env node */
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');
const eslintRecommended = require('@eslint/js').configs.recommended;
const prettier = require('eslint-config-prettier');

module.exports = [
  eslintRecommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: '@server/**',
              group: 'internal',
            },
            {
              pattern: '@tests/**',
              group: 'internal',
            },
          ],
        },
      ],

      'no-use-before-define': ['error', { functions: false }],
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],

      'import/prefer-default-export': 'off',
    },
  },
];
