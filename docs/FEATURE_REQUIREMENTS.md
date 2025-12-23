# Phoneheim Feature Requirements

## Overview
Phoneheim is a web-based companion app for the Mordheim miniatures wargame. It helps players:
1. Create and manage warbands
2. Track game state during play
3. Resolve rules and dice rolls
4. Collaborate via WebRTC (no server needed)

## Tech Stack
- Pure HTML/CSS/JavaScript (no frameworks)
- IndexedDB for local storage
- WebRTC for peer-to-peer communication
- Playwright for testing

---

## Feature 1: Warband Creation Tool

### 1.1 Select Warband Type
- User can choose from: Mercenaries (Reikland/Middenheim/Marienburg), Cult of the Possessed, Witch Hunters, Sisters of Sigmar, Undead, Skaven
- Display warband special rules and starting gold
- Show maximum warrior counts

### 1.2 Add Heroes
- Display available Hero types for warband
- Show cost, starting experience, and base profile
- Enforce minimum/maximum limits (e.g., exactly 1 leader)
- Allow naming each Hero

### 1.3 Add Henchmen
- Group-based purchasing (1-5 per group)
- All in group must have same equipment
- Track group as single unit for experience

### 1.4 Equip Warriors
- Show equipment lists valid for each warrior type
- Calculate and display total cost
- Enforce weapon restrictions (e.g., no bows for Darksouls)
- Track free dagger for each warrior

### 1.5 Purchase Mutations (Possessed only)
- Available for Mutants and Possessed
- First mutation at normal cost
- Subsequent mutations at double cost
- Mutants MUST have at least one mutation

### 1.6 Validate Warband
- Minimum 3 warriors including leader
- Cannot exceed starting gold
- Cannot exceed max warrior count
- All required roles filled

### 1.7 Save Warband
- Store to IndexedDB
- Include: name, type, warriors, equipment, treasury, experience
- Allow multiple saved warbands

---

## Feature 2: Game Setup

### 2.1 Load/Create Warbands
- Load existing warband from IndexedDB
- Or create new warband inline
- Need at least 2 warbands to play

### 2.2 Scenario Selection
- Random: Roll 2D6 on scenario table
- Lower rating player can choose on 2/12
- Or manually select scenario

### 2.3 Pre-Battle Checks
- Roll for Old Battle Wound warriors (skip on 1)
- Display which warriors are available

### 2.4 Determine Sides
- Based on scenario rules
- Roll-offs where needed
- Assign attacker/defender roles

---

## Feature 3: Board Setup Instructions

### 3.1 Terrain Setup
- Display terrain placement instructions per scenario
- General guidance: 4'x4' area, more buildings = better

### 3.2 Objective Placement
- Scenario-specific (wyrdstone counters, objective buildings, etc.)
- Instructions for D3+1 counters, 6" apart, 10" from edge, etc.

### 3.3 Deployment Instructions
- Show deployment zones per scenario
- Indicate distances from edges, objectives, enemies
- Handle special deployments (Surprise Attack scattered deployment)

---

## Feature 4: Main Game Loop

### 4.1 Turn Structure
Each turn has 4 phases:
1. **Recovery Phase**: Rally fleeing, stunned→knocked down, stand up
2. **Movement Phase**: Charges, compulsory moves, remaining moves
3. **Shooting Phase**: Ranged attacks
4. **Combat Phase**: Hand-to-hand (both players)

### 4.2 Recovery Phase Actions
- List fleeing warriors, offer Rally test (2D6 ≤ Ld)
- List stunned warriors, auto-flip to knocked down
- List knocked down warriors, auto-stand up (half move, strike last)

### 4.3 Movement Phase Actions
- Prompt for charge declarations (check range, fear tests)
- Handle interceptions
- Process compulsory moves (fleeing, frenzy charges, stupidity)
- Allow remaining moves (walk, run, climb, jump)

### 4.4 Shooting Phase Actions
- List warriors who can shoot
- Target selection (closest enemy, cover considerations)
- Roll to hit with modifiers
- Roll to wound
- Roll armor saves
- Roll injury if applicable
- Handle critical hits

### 4.5 Combat Phase Actions
- Determine strike order (Initiative, chargers first)
- For each attack:
  - Roll to hit (WS vs WS table)
  - Offer parry if applicable
  - Roll to wound
  - Roll armor save
  - Roll injury if applicable
- Handle critical hits
- All Alone tests

### 4.6 Rout Tests
- Check at start of player turn if 25%+ out of action
- Roll 2D6 ≤ leader Ld (or best available)
- Fail = game ends, warband loses

### 4.7 Game State Tracking
- Warrior positions (optional tracking)
- Warrior status: standing, knocked down, stunned, fleeing, out of action
- Wounds remaining
- Wyrdstone/treasure carried
- Turn count

---

## Feature 5: Scenario Aftermath

### 5.1 Determine Winner
- Per scenario victory conditions
- Or via rout

### 5.2 Experience Allocation
- +1 per surviving Hero/Henchman group
- +1 winning leader
- +1 per enemy out of action (Heroes)
- Scenario-specific bonuses
- Underdog bonus based on rating difference

### 5.3 Injury Resolution
- **Henchmen**: D6 roll, 1-2 = dead/leaves, 3-6 = OK
- **Heroes**: D66 roll on serious injury table
  - Handle sub-rolls for Multiple Injuries, Arm Wound, etc.
  - Apply permanent effects (stat changes, conditions)

### 5.4 Advances
- Check if experience threshold reached
- Heroes: 2D6 on advance table (skill or stat)
- Henchmen: 2D6 on advance table (stat only, or promotion)

### 5.5 Exploration
- Roll D6 per surviving Hero (not out of action)
- +1 die if won
- Check for multiples (special locations)
- Calculate wyrdstone found

### 5.6 Income & Trading
- Sell wyrdstone at 35gc per shard
- Roll for rare items (D6 + modifiers)
- Buy common equipment
- Hire new warriors

### 5.7 Update Roster
- Apply all changes
- Recalculate warband rating
- Save to IndexedDB

---

## Feature 6: WebRTC Collaborative Play

### 6.1 Host Game
- Generate connection offer
- Display as QR code
- Accept incoming connections

### 6.2 Join Game
- Scan QR code or paste offer
- Establish peer connection
- Sync game state

### 6.3 State Synchronization
- Broadcast game state changes
- Handle conflicts (host authoritative)
- Show other players' warbands

### 6.4 Collaborative Actions
- All players see current phase/action
- Players control their own warbands
- Dice rolls visible to all

---

## UI Requirements

### Navigation
- Main menu: New Warband, Load Warband, Play Game, Rules Reference
- In-game: Current phase indicator, action prompts, warband views

### Accessibility
- Works on mobile browsers
- Touch-friendly interface
- Readable text sizes
- Clear action buttons

### Dice Rolling
- Virtual dice with animation (optional)
- Clear display of results
- Show required vs rolled values

### Rules Reference
- Quick lookup for:
  - To-hit tables
  - Wound chart
  - Injury results
  - Weapon stats
  - Skill descriptions
  - Psychology rules

---

## Data Persistence

### IndexedDB Schema
- `warbands`: Complete warband data
- `campaigns`: Campaign progress tracking
- `settings`: User preferences

### State Management
- In-memory game state during play
- Auto-save checkpoints
- Export/import warband as JSON

---

## Testing Strategy

### Unit Tests
- Dice probability functions
- Combat resolution logic
- Experience calculations
- Warband validation

### E2E Tests (Playwright)
- Warband creation flow
- Game phase transitions
- Scenario completion
- WebRTC connection (multi-tab)
