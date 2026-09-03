# Experiment 1.4 - Interactive Calendar Optimization & Testing

This React project implements an interactive calendar for scheduling social media posts.

## Features

- Calendar month view
- Drag and drop from backlog to calendar
- Drag and drop from one calendar day to another
- Toggle between non optimized and optimized rendering
- Render monitor showing rerender counts and the last drop's cell-render impact
- Optimized mode uses `React.memo`, `useMemo`, and `useCallback`
- Component tests using Vitest and React Testing Library

## Files

- `index.html` - Vite HTML entry
- `src/main.jsx` - React root render file
- `src/app.jsx` - main calendar logic
- `src/app.test.jsx` - UI test cases
- `styles.css` - app styling
- `package.json` - React, Vite, and testing dependencies
- `vite.config.js` - Vite React configuration

## Run in VS Code

Open this folder in VS Code:

```text
C:\Users\deepakchand\OneDrive\Documents\ChatGPT\exp-4
```

Install dependencies:

```bash
npm install
```

Start the React app:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## How to observe optimization

1. With `Optimized` selected (default), drag one backlog post onto a calendar day.
2. Only that day's `R` counter increases (e.g. R1 -> R2); every other day cell stays the same, and the "Day cells rerendered by last drop" metric reads `1`. This is `React.memo`, `useMemo`, and `useCallback` keeping unrelated props stable.
3. Click `Reset`.
4. Select `Non optimized`, then drag a backlog post onto a calendar day again.
5. Every day cell's `R` counter increases, and the metric reads `31`, because nothing is memoized so the whole grid rerenders on any state change.