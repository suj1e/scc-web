/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:    '#F4EFE6',
        'cream-d': '#EBE5DA',
        'cream-dd': '#E0D9CC',
        orange:   '#C85A2A',
        'orange-l': '#E07A4A',
        'orange-p': '#F5DDD0',
        tx:       '#241608',
        'tx-m':   '#5A3E2C',
        'tx-l':   '#8A6A54',
        'tx-p':   '#B09080',
        div:      '#D8D0C2',
        sb:       '#231910',
        'sb-text': '#E8E0D4',
        'sb-dim':  '#7A6A5A',
        'sb-div':  '#352820',
        'tool-bg': '#EDE8DF',
        'tool-br': '#D4CCBF',
        'think-bg': '#F0EAF8',
        'think-br': '#D8CCE8',
        'think-tx': '#5A3E78',
        'think-pu': '#9060C0',
        sgreen:    '#3A7A4A',
      },
      fontFamily: {
        serif:  ['Lora', 'Georgia', 'serif'],
        sans:   ['Source Sans 3', 'system-ui', 'sans-serif'],
        mono:   ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
