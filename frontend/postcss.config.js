// export default {
//   plugins: {
//     '@tailwindcss/postcss': {},
//     autoprefixer: {},
//   },
// }


// postcss.config.js
import typography from '@tailwindcss/typography'

export default {
  plugins: {
    '@tailwindcss/postcss': {
      // inline Tailwind config
      config: {
        plugins: [typography],
      },
    },
    autoprefixer: {},
  },
}
