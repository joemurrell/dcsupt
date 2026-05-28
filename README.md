# DCS UPT

**Undergraduate Pilot Training for DCS World.** A curated training-pipeline website for new pilots in DCS, structured around real USAF training phases and populated with the best free learning resources the sim community has produced.

Live aesthetic: tactical HUD / F/A-18 DDI palette, dark theme, mono-and-display typography.

---

## What's in here

```
dcs-upt/
├── index.html              # Homepage with hero + phase grid
├── about.html              # Project info, credits, disclaimers
├── phases/
│   ├── start-here.html     # Phase 0 — sim setup (placeholder)
│   ├── iqt.html            # Phase 1 — Initial Qualification Training (POPULATED)
│   ├── mqt.html            # Phase 2 — Mission Qualification (placeholder)
│   ├── bfm.html            # Phase 3 — BFM & Air-to-Air (placeholder)
│   ├── strike.html         # Phase 4 — Strike & SEAD (placeholder)
│   └── cas.html            # Phase 5 — Close Air Support (placeholder)
├── airframes/
│   └── fa-18c.html         # F/A-18C Hornet
├── resources/
│   ├── tools.html          # Tools & utilities (placeholder)
│   ├── comms.html          # Comms & brevity (placeholder)
│   ├── doctrine.html       # Doctrine & theory (placeholder)
│   └── communities.html    # Squadrons & communities (placeholder)
└── assets/
    ├── css/style.css       # All styling
    └── js/main.js          # Nav toggle + Zulu time + active link
```

Everything is **static HTML/CSS/JS** — no build step, no framework, no dependencies. Open `index.html` in a browser and it works.

---

## Deploying to the web

Two recommended options. Both are free.

### Option A — Netlify Drop (easiest, 60 seconds)

1. Go to https://app.netlify.com/drop
2. Drag the entire `dcs-upt/` folder onto the page
3. Get a random URL like `https://wild-falcon-12345.netlify.app`
4. (Optional) Sign in to claim the site and pick a custom subdomain like `dcs-upt.netlify.app`
5. Share that URL in Discord. Done.

To update: drag the folder again. Re-deploys instantly.

### Option B — GitHub Pages (better long-term)

1. Create a new public GitHub repo named `dcs-upt`
2. Upload all the files in this folder to the repo root
3. In the repo: **Settings → Pages → Source → Deploy from a branch → main / root → Save**
4. Wait ~1 minute. Your site is live at `https://YOUR-USERNAME.github.io/dcs-upt/`

To update: commit changes to `main`, site re-deploys automatically.

Pros: free, versioned, easy to accept contributions, you can add a custom domain (like `dcsupt.com`) for ~$12/yr.

---

## Editing content

### Adding a new video to IQT

Open `phases/iqt.html`, find the relevant `<div class="resource-list">`, and copy the pattern of an existing entry:

```html
<a href="https://www.youtube.com/watch?v=VIDEO_ID" class="resource" target="_blank" rel="noopener">
  <div class="marker">REF-XX</div>
  <div>
    <div class="title">Video Title Here</div>
    <div class="channel">CHANNEL NAME</div>
    <div class="desc">One- or two-sentence description of why this resource is useful.</div>
  </div>
  <div class="meta">
    <span class="duration">MM:SS</span>
    <span class="level beg">BEGINNER</span>  <!-- or .int INTERMEDIATE / .adv ADVANCED -->
  </div>
</a>
```

### Replacing the placeholder playlist URLs

All IQT video links currently point to the source playlist:
`https://www.youtube.com/playlist?list=PLrIW8wRbQBZbdk5BRw7RcmvdtrKhJArP0`

Replace each with the direct `https://www.youtube.com/watch?v=...` URL once you have them. A find-and-replace across `phases/iqt.html` is fastest.

### Building out a new phase page

The placeholder phase pages (MQT, BFM, etc.) already have the full page chrome. Replace the central `<section class="block"><div class="placeholder">...</div></section>` with sections matching the IQT structure.

### Changing the color scheme

All theme colors are CSS custom properties at the top of `assets/css/style.css`:

```css
:root {
  --hud-green: #5fb87a;
  --hud-amber: #f5b942;
  --hud-cyan: #6fd3ff;
  ...
}
```

Change those values and the whole site updates.

---

## Browser support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE. CSS Grid + custom properties are used throughout.

---

## Credits & disclaimer

All linked video, audio, and text content belongs to its creators. DCS UPT is a curated index, not a host. Subscribe to and support the creators whose work makes this possible.

Not affiliated with Eagle Dynamics, USAF, USN, or any linked creator. DCS World is a trademark of Eagle Dynamics. This site is fan-made educational content for sim enthusiasts.
