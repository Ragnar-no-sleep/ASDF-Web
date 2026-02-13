# Testing Checklist — Orbital System & Easter Eggs

> Manual testing guide for the new orbital hub, fullscreen UX, and easter eggs.

---

## Setup

1. Start dev server: `node server.cjs`
2. Open browser: `http://localhost:3000`
3. Open DevTools: Console + Network + Application (localStorage)
4. **Clear localStorage** before testing: `localStorage.clear()`

---

## Test 1: Fullscreen Prompt Flow

### Scenario A: User accepts immediately

- [ ] Load `http://localhost:3000`
- [ ] **Do NOT click anything yet** — fullscreen should NOT trigger
- [ ] Click anywhere on the page (first interaction)
- [ ] **Expected**: Native fullscreen prompt appears
- [ ] Click "Allow" or equivalent
- [ ] **Expected**: Page goes fullscreen
- [ ] Check localStorage: `asdf_fullscreen_prompted` should be **removed** (undefined)

### Scenario B: User refuses once

- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Reload page
- [ ] Click anywhere → fullscreen prompt
- [ ] Click "Deny" or press Escape
- [ ] **Expected**: F11 hint toast appears (top-right, gold border)
  - Text: "Chill! This is fine. Press F11 for full immersion"
  - Retry button + close button (×)
- [ ] Check localStorage: `asdf_fullscreen_prompted` = `"1"`
- [ ] Wait 8 seconds → toast auto-dismisses

### Scenario C: User refuses twice

- [ ] With `asdf_fullscreen_prompted` = `"1"`, reload page
- [ ] Click anywhere
- [ ] **Expected**: Fullscreen prompt again
- [ ] Deny again
- [ ] **Expected**: NO toast appears (maxed out)
- [ ] Check localStorage: `asdf_fullscreen_prompted` = `"2"`
- [ ] Reload page multiple times → **no more prompts**

### Scenario D: F11 hint interactions

- [ ] Set localStorage: `localStorage.setItem('asdf_fullscreen_prompted', '0')`
- [ ] Reload, click, deny fullscreen
- [ ] Toast appears
- [ ] Click **×** button → toast closes immediately
- [ ] Reload, click, deny again → toast appears
- [ ] Click **"Try again"** button → fullscreen prompt re-triggers
- [ ] Accept → page goes fullscreen

---

## Test 2: Orbital System

### Visual appearance

- [ ] Load `http://localhost:3000`
- [ ] **Expected**: 9 elements orbiting around center
  - Center label: "Tools"
  - Items: Learn, Build, Analytics, Play, Burns, Forecast, Holdex, Staking, Ignition
- [ ] **Measure in DevTools**: Orbital radius = **144px** from center
- [ ] Items rotate **clockwise** (full circle in 34 seconds)
- [ ] Items stay **upright** (no tilting)

### Hover states

- [ ] Hover over any orbital item
- [ ] **Expected**:
  - Item scales to **1.08×**
  - Orbit animation **pauses**
  - Gold glow appears (box-shadow)
  - Border color brightens
- [ ] Move mouse away → animation resumes

### Angular distribution

- [ ] Pause animation (DevTools: Animations panel or set `animation-play-state: paused`)
- [ ] Measure angles between items: should be **~40°** (360° / 9)

### Reduced motion

- [ ] Enable in OS: Settings → Accessibility → Reduce motion
- [ ] Reload page
- [ ] **Expected**: Items positioned statically in circle (no rotation animation)

---

## Test 3: Easter Egg — 7 Clics → Terrier Unlock

### Initial state

- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Reload page
- [ ] Check localStorage: `asdf_easter_clicks` = undefined
- [ ] Check localStorage: `asdf_terrier_unlocked` = undefined

### Click progression

- [ ] Click **Build** (40° position)
  - **Expected**: Small glow appears around Build (**3px** — Fibonacci F4)
  - localStorage: `asdf_easter_clicks` = `["build"]`
- [ ] Click **Play** (120° position)
  - **Expected**: Glow grows to **5px** (F5)
  - localStorage: `asdf_easter_clicks` = `["build","play"]`
- [ ] Click **Burns** (160°)
  - Glow: **8px** (F6)
- [ ] Click **Forecast** (200°)
  - Glow: **13px** (F7)
- [ ] Click **Holdex** (240°)
  - Glow: **21px** (F8)
- [ ] Click **Staking** (280°)
  - Glow: **34px** (F9)
- [ ] Click **Ignition** (320°) — **7TH CLICK**
  - **Expected**: Unlock animation triggers
    - Center explodes (scale 1 → 2, blur 0 → 10px)
    - Rotates 720°
    - Collapses back (scale 2 → 0.8 → 1)
    - Duration: **2 seconds**
  - After 2s: Portal appears at center
    - Icon: 🐕
    - Text: "Enter the Burrow"
  - localStorage: `asdf_terrier_unlocked` = `"true"`

### Persistence

- [ ] Reload page with `asdf_terrier_unlocked` = `"true"`
- [ ] **Expected**: Portal visible immediately (no animation)

### Portal click

- [ ] Click portal → navigate to `/terrier`

### Non-easter-egg items

- [ ] Click **Learn** (0° position — NOT easter egg)
  - **Expected**: Navigates to `/quick-start` (no glow, no counter increment)
- [ ] Click **Analytics** (80° — NOT easter egg)
  - **Expected**: Navigates to `/analytics` (no glow, no counter increment)

---

## Test 4: Terrier Page

### Layout

- [ ] Navigate to `http://localhost:3000/terrier`
- [ ] **Expected**:
  - Dark background (#0a0a0a)
  - Header: "🐕 The Burrow"
  - Subtitle: "You found the rabbit hole."
  - Manifesto section with 3 highlighted words: **Data**, **Open-source**, **Longevity**
  - 2 placeholder sections: "Talk to CYNIC", "The 10th Game"
  - Footer: "← Back to Hub" link

### K-Score formula easter egg

- [ ] Clear localStorage: `localStorage.removeItem('asdf_k_formula_found')`
- [ ] Hover over **"Data"** in manifesto text
  - **Expected**: ∛ symbol appears above word
  - No overlay yet
- [ ] Hover over **"Open-source"**
  - **Expected**: ∛ symbol appears
  - No overlay yet
- [ ] Hover over **"Longevity"** (3rd keyword)
  - **Expected**:
    - ∛ symbol appears
    - Full-screen overlay fades in (black background, blurred)
    - Formula displayed: `K = 100 × ∛(D × O × L)`
    - Hint text: "You found it. The formula of accountability."
  - localStorage: `asdf_k_formula_found` = `"true"`
- [ ] Click anywhere on overlay → overlay closes

### Persistence

- [ ] Reload `/terrier` with `asdf_k_formula_found` = `"true"`
- [ ] **Expected**: All 3 keywords show ∛ symbol by default (no hover needed)
- [ ] Overlay does NOT auto-show (must hover keywords again to re-trigger)

---

## Test 5: Tools Dashboard

### Grid view (default)

- [ ] Navigate to `http://localhost:3000/tools`
- [ ] **Expected**:
  - Header: "5 LIVE TOOLS"
  - Title: "Ecosystem Tools"
  - Toggle button: "🌀 Orbital View" (icon rotates)
  - 5 tool cards in vertical grid: Burns, Forecast, HolDex, Staking, Ignition
  - Each card: icon, name, "LIVE" badge, description, arrow

### Orbital view toggle

- [ ] Click "🌀 Orbital View" button
- [ ] **Expected**:
  - Grid disappears
  - 5 tools orbit center at **233px radius** (larger than hub)
  - Button text changes to "Grid View"
  - Tools rotate (34s full cycle)
- [ ] Click button again → back to grid

### Orbital interactions

- [ ] In orbital view, hover over a tool
  - **Expected**: Same behavior as hub (scale 1.08, pause, glow)
- [ ] Click a tool → navigates to tool page

---

## Test 6: Navigation & Routes

### All routes accessible

- [ ] `/` → Hub (orbital system visible)
- [ ] `/terrier` → The Burrow (manifesto, K-Score easter egg)
- [ ] `/tools` → Tools dashboard (grid + orbital toggle)
- [ ] `/quick-start` → Learn page (existing)
- [ ] `/build` → Build page (existing)
- [ ] `/burns` → Burns tracker (existing)
- [ ] `/forecast` → Forecast tool (existing)
- [ ] `/holdex` → HolDex tool (existing)
- [ ] `/staking` → Staking page (existing)
- [ ] `/ignition` → Games page (existing)

### Deep links

- [ ] Direct access to `/terrier` WITHOUT unlocking easter egg
  - **Expected**: Page loads normally (no portal in hub, but page accessible)
- [ ] Direct access to `/tools` in orbital view
  - **Expected**: Defaults to grid (toggle state not persisted)

---

## Test 7: Responsive (Mobile)

### Hub orbital

- [ ] Resize browser to 375px width (iPhone SE)
- [ ] **Expected**:
  - Orbital radius shrinks to **89px** (Fibonacci F11)
  - Item size: 44px (touch-friendly)
  - Icons smaller (18px)
  - Labels smaller (10px)

### Terrier page

- [ ] `/terrier` at 375px width
- [ ] **Expected**:
  - Padding reduces to 34px × 21px
  - Title: 34px (down from 55px)
  - Manifesto text: 15px (down from 17px)
  - K-Score formula: 34px (down from 55px)

### Tools dashboard

- [ ] `/tools` at 375px width
- [ ] Grid view cards shrink (44px icon, 14px text)
- [ ] Orbital view still works (smaller radius)

---

## Test 8: Performance

### Framerate

- [ ] Open DevTools → Performance tab
- [ ] Start recording
- [ ] Let hub orbit for 10 seconds
- [ ] Stop recording
- [ ] **Expected**: Consistent **60fps** (green line, no red drops)

### CPU usage

- [ ] Open Task Manager (Windows) or Activity Monitor (Mac)
- [ ] Hub orbital running
- [ ] **Expected**: Browser tab uses <5% CPU (idle state)

### Memory

- [ ] DevTools → Memory tab → Take heap snapshot
- [ ] Let orbit run for 2 minutes
- [ ] Take another snapshot → Compare
- [ ] **Expected**: No significant memory leaks (<10MB growth)

---

## Test 9: Accessibility

### Keyboard navigation

- [ ] Press **Tab** repeatedly on hub
- [ ] **Expected**: Focus moves through orbital items (visible focus ring — 2px gold outline)
- [ ] Press **Enter** on focused item → navigates

### Screen reader (optional)

- [ ] Enable VoiceOver (Mac) or NVDA (Windows)
- [ ] Navigate hub
- [ ] **Expected**: Each orbital item announces: "Link: [Name] — [Description]"

### ARIA attributes

- [ ] Inspect orbital items in DevTools
- [ ] **Expected**:
  - `aria-label` on each item (e.g., "Learn about ASDF")
  - `aria-hidden="true"` on decorative elements (embers, dust, icons)

---

## Test 10: Console Errors

### Zero errors

- [ ] Open DevTools Console
- [ ] Navigate through all routes: `/`, `/terrier`, `/tools`, `/burns`, etc.
- [ ] Interact with all features: fullscreen, easter egg, orbital toggle
- [ ] **Expected**: **0 errors**, **0 warnings**
- [ ] Acceptable: Info logs (e.g., React DevTools, extensions)

---

## Test 11: LocalStorage Integrity

### Keys created

- [ ] After all tests, check localStorage (DevTools → Application → Local Storage)
- [ ] **Expected keys**:
  - `asdf_fullscreen_prompted` (0-2)
  - `asdf_easter_clicks` (JSON array)
  - `asdf_terrier_unlocked` ("true" or undefined)
  - `asdf_k_formula_found` ("true" or undefined)

### No orphaned keys

- [ ] No keys like `undefined`, `null`, or malformed JSON

---

## Test 12: CSS Fibonacci Validation

### Measure values in DevTools

- [ ] Inspect `.hub-orbit-item`
- [ ] Computed styles → `--orbit-radius`: **144px** (F12)
- [ ] Animation duration: **34s** (F9)
- [ ] Padding on F11 hint: **13px × 21px** (F7 × F8)
- [ ] Glow sizes: 3, 5, 8, 13, 21, 34, 55px (F4-F10)

### Easing curve

- [ ] DevTools → Animations panel
- [ ] Inspect `orbit-phi` animation
- [ ] Cubic-bezier: `(0.618, 0, 0.382, 1)` — φ-based

---

## Success Criteria

✅ **All 12 test categories pass**
✅ **0 console errors**
✅ **60fps animation**
✅ **localStorage persistence works**
✅ **All routes accessible**
✅ **Easter eggs unlockable**
✅ **Responsive on mobile**
✅ **Keyboard accessible**

---

## Known Limitations

- **Browser support**: Fullscreen API requires user interaction (Safari: limited)
- **Mobile orbital**: May stutter on low-end devices (<4GB RAM)
- **K-Score easter egg**: Hover not available on touch devices (needs tap-to-reveal alternative — future iteration)

---

## Reporting Issues

If tests fail:

1. Note which test failed
2. Screenshot the issue (+ console errors)
3. Include browser version + OS
4. Check if issue reproduces in different browser
5. Document in GitHub Issues: https://github.com/Ragnar-no-sleep/ASDF-Web/issues
