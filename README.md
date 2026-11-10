# inkshade.icu — Layers of code & craft

Personal website of **Jinghang Zhang**, a student at Hainan Bielefeld University of Applied Sciences (BIUH).

Live site: **https://inkshade.icu**

## Features

- Unicorn Studio WebGL hero background
- React Bits particle typography
- Draggable 3D lanyard card carrying the site introduction
- Three original demo tracks with a floating player, queue and scrolling lyrics
- Pomodoro focus timer and local to-do list
- Nailong memory game with 6, 8 or 10 pairs
- Save Dou Nai: a six-level rescue maze with recursive DFS generation and a different character on every level
- Dark, responsive, glass-inspired interface

## Stack

HTML · CSS · JavaScript · React · Vite · Three.js · Unicorn Studio

## Structure

```text
index.html          Home
portfolio.html      Work
music.html          Music
game.html           Play
tools.html          Pomodoro + to-do
contact.html        Contact

css/                Styles
js/                 Site scripts and React islands
images/             Project images and demo artwork
audio/              Three original demo tracks
```

## Local preview

From this folder:

```bash
python -m http.server 8080
```

Then open <http://127.0.0.1:8080/>.

Some NetEase music features require the separate local Node service and are not part of this static repository; the three demo tracks work without it.

## Deployment

The production site is currently deployed on Netlify at <https://inkshade.icu>.

This repository contains the complete static output and can also be served with GitHub Pages:

1. Repository **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Save

Do not point the existing `inkshade.icu` DNS at GitHub Pages unless you intend to move the site away from Netlify.

## Notes

- The Unicorn Studio project includes its own “Unicorn” watermark; it is part of the scene content and cannot be removed from the front-end code.
- The site is intentionally image-light: the lanyard card uses text and 3D materials, not a portrait photo.
