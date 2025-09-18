import flowbitePlugin from 'flowbite/plugin'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',

    // Flowbite core
    '../node_modules/flowbite/**/*.{js,jsx,ts,tsx}',

    // Flowbite Vue (if used)
    '../node_modules/flowbite-vue/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      body: [
        '"Inter var"',
        '"Inter"',
        '"Open Sans"',
        'Helvetica',
        'Arial',
        'sans-serif',
      ],
      mono: ['"Fira Code"', 'monospace'],
    },
  },
  plugins: [
    flowbitePlugin
  ],
}
