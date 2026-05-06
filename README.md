# Random Misdirections [5]

Tool inspired by **Random directions [5]** from artist Jonas P. Spieker.

Original link: [Instagram reel](https://www.instagram.com/reels/DXcAPpLjIcv/)

## What it does

Client-side **500×500** canvas: random chords split the square into polygonal regions. Each region gets a random linear-gradient direction (mapped to luminance), then **stippled dots** whose density follows local darkness. You can change line count, dot radius and color, toggle the black splits, **regenerate**, and **download a 500×500 PNG**.

Offline use: after one successful online load, a **service worker** precaches the app shell so revisits work without the network (production builds only).

## Development

```bash
npm install
npm run dev   # runs `next dev --webpack`
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

`@ducanh2912/next-pwa` injects a webpack configuration. Next.js 16 defaults to Turbopack for `next dev` / `next build`, so this project uses webpack explicitly:

```bash
npm run build   # runs `next build --webpack`
npm start
```

## Deploy on Vercel

Import the Git repository in [Vercel](https://vercel.com/). Use the default Next.js preset; the build command above is already set in `package.json`. No server secrets are required.
