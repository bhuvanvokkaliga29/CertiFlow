/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Steep Style Reference Tokens: "serif analytics on warm paper"
        'canvas': '#FFFFFF',         // Paper White - default page canvas
        'surface': '#F2F2F3',        // Mist Gray - flat neutral cards
        'surface-elevated': '#FFFFFF', // Elevated White - floating artifacts
        'fog': '#FAFAFB',            // Fog White - subtle secondary bands
        'ink': '#17191C',            // Ink Black - primary type and filled pills
        'primary': '#17191C',        // Primary text
        'secondary': '#777B86',      // Slate Gray - links and muted helper text
        'muted': '#979799',          // Ash Gray - tags and metadata
        'smoke': '#A3A6AF',          // Smoke Gray - placeholders
        'border': '#ECECEC',         // Hairline border
        'border-strong': '#E0E0E2',  // Section dividers
        'peach': {
          DEFAULT: '#FBE1D1',        // Blush Peach - editorial highlight wash
          dark: '#F5CBB2',
        },
        'sienna': '#5D2A1A',         // Sienna Brown - ink on peach surfaces
        'accent': {
          DEFAULT: '#17191C',        // Filled pill CTA
          hover: '#2C2F35',
          text: '#FFFFFF',
        },
        'success': '#2E7D32',
        'error': '#D32F2F',
      },
      fontFamily: {
        'serif': ['Newsreader', 'Signifier', 'Tiempos Headline', 'Georgia', 'serif'],
        'sans': ['Inter', 'Söhne', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '16px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '24px',
        'card': '24px',
        'pill': '9999px',
        'input': '16px',
      },
      boxShadow: {
        'subtle': '0 0 0 1px rgba(4, 23, 43, 0.05), 0 4px 20px rgba(0, 0, 0, 0.04)',
        'floating': '0 0 0 1px rgba(4, 23, 43, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
        'modal': '0 0 0 1px rgba(4, 23, 43, 0.06), 0 25px 50px -12px rgba(0, 0, 0, 0.16)',
        'dropdown': '0 0 0 1px rgba(4, 23, 43, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}

