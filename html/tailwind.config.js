/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", 
            "./node_modules/tw-elements/dist/js/**/*.js"
          ],
  theme: {
    container: {
      center: true,
    },
    extend: {},
  },
  plugins: [
    require('tailwindcss-animated'),
  ],
}
