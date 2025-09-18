/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

const vuePlugin = require('eslint-plugin-vue');
const tsConfig = require('@vue/eslint-config-typescript');
const prettier = require('@vue/eslint-config-prettier/skip-formatting');
const eslintRecommended = require('@eslint/js').configs.recommended;

module.exports = [
  eslintRecommended,
  {
    files: ['**/*.{vue,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      vue: vuePlugin,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'import/no-relative-parent-imports': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'app',
                'config',
                'database',
                'entities',
                'modules',
                'repositories',
                'trpc',
                'utils',
              ].flatMap((path) => [
                `@server/${path}`,
                `@mono/server/src/${path}`,
              ]),
              message:
                'Please only import from @server/shared or @mono/server/src/shared.',
            },
          ],
        },
      ],
    },
  },
  tsConfig,   // adds Vue+TS rules
  prettier,   // disables conflicting rules with Prettier
];
