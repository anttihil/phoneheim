# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phoneheim is a browser-based companion app for the Mordheim miniatures wargame. It runs entirely client-side with no server backend, using IndexedDB for persistence and WebRTC for peer-to-peer multiplayer.

## Commands

```bash
# Start dev server (serves on http://localhost:8080)
npm start

# Run all tests
npm test

# Run tests with browser visible
npm run test:headed

# Run single test file
npx playwright test tests/warband-creation.spec.js

# Run specific test by name
npx playwright test -g "should display main navigation"

# Debug tests interactively
npm run test:debug
```

## Architecture

### Tech Stack
- Pure HTML/CSS/JavaScript (ES modules, no frameworks)
- IndexedDB for local storage
- WebRTC for serverless multiplayer
- Playwright for E2E testing

### Directory Structure
```
src/
├── app.js              # Entry point, initializes storage and navigation
├── data/               # Static game data (warbands, equipment, skills, scenarios, etc.)
├── logic/              # Core business logic
│   ├── gameRules.js    # Dice rolling, combat resolution, turn phases
│   ├── warbandManager.js # Warband CRUD and validation
│   ├── gameState.js    # In-game state management
│   ├── storage.js      # IndexedDB wrapper
│   └── webrtc.js       # P2P connection handling
└── ui/                 # DOM manipulation and page rendering
```

### Key Patterns

**Module System**: All JS uses ES modules. Data modules export static objects (WARBAND_TYPES, EQUIPMENT, etc.). Logic modules export pure functions. UI modules handle DOM rendering.

**Storage**: `storage.js` wraps IndexedDB with async functions (`saveWarband`, `getAllWarbands`, `getWarband`, `deleteWarband`). Warbands are the primary persisted entity.

**Game Rules**: `gameRules.js` implements Mordheim mechanics - dice functions (`rollD6`, `roll2D6`, `rollD66`), combat resolution (`rollToHitMelee`, `rollToWound`, `rollArmorSave`), and turn phases (`TURN_PHASES`, `recoveryPhase`).

**WebRTC Flow**: Host calls `initAsHost()` to get an offer, displays as QR code. Guest scans and calls `initAsGuest(offer)` to get answer. Host completes with `completeConnection(answer)`. Data channel sends JSON messages via `sendGameState()` and `sendAction()`.

### Testing

Tests use Playwright. The config (`playwright.config.js`) auto-starts the dev server on port 8080. Tests are in `tests/` and use `page.goto('/')` since `baseURL` is configured.
