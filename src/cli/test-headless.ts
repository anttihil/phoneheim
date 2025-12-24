// Test script for headless game operation
// Run with: npx tsx src/cli/test-headless.ts

import { createCLI, createJSONCLI } from './index';
import { SimpleBot, runBotGame } from './bot';
import type { Warband, Warrior, Profile } from '../types/warband';

// Create test warbands
function createTestProfile(): Profile {
  return {
    M: 4,
    WS: 3,
    BS: 3,
    S: 3,
    T: 3,
    W: 1,
    I: 3,
    A: 1,
    Ld: 7
  };
}

function createTestWarrior(id: string, name: string, isLeader: boolean = false): Warrior {
  return {
    id,
    name,
    type: isLeader ? 'captain' : 'mercenary',
    category: isLeader ? 'hero' : 'henchman',
    cost: isLeader ? 60 : 25,
    experience: 0,
    profile: {
      ...createTestProfile(),
      ...(isLeader ? { Ld: 8 } : {})
    },
    equipment: {
      melee: ['sword'],
      ranged: isLeader ? ['crossbow'] : [],
      armor: ['light_armor']
    },
    skills: [],
    injuries: [],
    status: 'healthy',
    mutations: [],
    specialRules: {}
  };
}

function createTestWarband(name: string, warriorCount: number = 3): Warband {
  const warriors: Warrior[] = [];

  // Leader
  warriors.push(createTestWarrior(`${name}-leader`, `${name} Captain`, true));

  // Warriors
  for (let i = 1; i < warriorCount; i++) {
    warriors.push(createTestWarrior(`${name}-w${i}`, `${name} Warrior ${i}`));
  }

  return {
    id: `warband-${name}`,
    name,
    type: 'reikland',
    typeName: 'Reikland Mercenaries',
    treasury: 0,
    warriors,
    stash: [],
    rating: warriors.length * 5,
    gamesPlayed: 0,
    wins: 0,
    createdAt: new Date().toISOString()
  };
}

async function testManualCLI(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TEST 1: Manual CLI Interaction');
  console.log('='.repeat(60));

  const cli = createCLI();
  const wb1 = createTestWarband('Iron Wolves', 3);
  const wb2 = createTestWarband('Shadow Ravens', 3);

  // Create game
  console.log('\n1. Creating game...');
  const screen = cli.createGame(wb1, wb2, 'skirmish');
  console.log(`   Screen: ${screen.screen}`);
  console.log(`   Phase: ${screen.phase}`);
  console.log(`   Available events: ${screen.availableEvents.join(', ')}`);

  // Get initial state
  console.log('\n2. Initial game state:');
  const state = cli.getState();
  console.log(`   Turn: ${state?.turn}`);
  console.log(`   Current player: ${state?.currentPlayer}`);
  console.log(`   Warband 1: ${state?.warbands[0].name} (${state?.warbands[0].warriors.length} warriors)`);
  console.log(`   Warband 2: ${state?.warbands[1].name} (${state?.warbands[1].warriors.length} warriors)`);

  // Select and position warriors
  console.log('\n3. Positioning warriors...');
  for (const warrior of state!.warbands[0].warriors) {
    let result = cli.submitAction('SELECT_WARRIOR', { warriorId: warrior.id }, 'player1');
    if (result.success) {
      result = cli.submitAction('CONFIRM_POSITION', {}, 'player1');
      console.log(`   Positioned ${warrior.name}: ${result.success ? 'OK' : result.error}`);
    }
  }

  // Advance phase (complete setup for player 1)
  console.log('\n4. Advancing phase...');
  let result = cli.submitAction('ADVANCE_PHASE', {}, 'player1');
  console.log(`   After advance: Screen=${cli.getScreen().screen}, Player=${cli.getState()?.currentPlayer}`);

  // Position player 2 warriors
  console.log('\n5. Player 2 positioning...');
  for (const warrior of cli.getState()!.warbands[1].warriors) {
    result = cli.submitAction('SELECT_WARRIOR', { warriorId: warrior.id }, 'player2');
    if (result.success) {
      result = cli.submitAction('CONFIRM_POSITION', {}, 'player2');
      console.log(`   Positioned ${warrior.name}: ${result.success ? 'OK' : result.error}`);
    }
  }

  // Advance to movement phase
  result = cli.submitAction('ADVANCE_PHASE', {}, 'player2');
  console.log(`\n6. Game state after setup:`);
  console.log(`   Screen: ${cli.getScreen().screen}`);
  console.log(`   Phase: ${cli.getState()?.phase}`);
  console.log(`   Turn: ${cli.getState()?.turn}`);

  // Test undo
  console.log('\n7. Testing undo...');
  console.log(`   History length before undo: ${cli.getHistory().length}`);
  cli.undoLastEvents(1);
  console.log(`   History length after undo: ${cli.getHistory().length}`);

  // Serialize game
  console.log('\n8. Serializing game...');
  const serialized = cli.serialize();
  console.log(`   State scenario: ${serialized.state.scenario}`);
  console.log(`   History events: ${serialized.history.length}`);

  console.log('\n   TEST 1 COMPLETE!\n');
}

async function testJSONCLI(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TEST 2: JSON CLI Output');
  console.log('='.repeat(60));

  const cli = createJSONCLI();
  const wb1 = createTestWarband('Alpha Team', 2);
  const wb2 = createTestWarband('Beta Team', 2);

  cli.createGame(wb1, wb2, 'skirmish');

  console.log('\nJSON formatted screen:');
  const jsonScreen = cli.formatScreen(cli.getScreen());
  const parsed = JSON.parse(jsonScreen);
  console.log(`  screen: ${parsed.screen}`);
  console.log(`  phase: ${parsed.phase}`);
  console.log(`  availableEvents: [${parsed.availableEvents.slice(0, 3).join(', ')}...]`);

  console.log('\n   TEST 2 COMPLETE!\n');
}

async function testBotGame(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TEST 3: Bot vs Bot Game');
  console.log('='.repeat(60));

  const wb1 = createTestWarband('Bot Army 1', 3);
  const wb2 = createTestWarband('Bot Army 2', 3);

  console.log('\nRunning bot game (max 5 turns)...');
  const startTime = Date.now();

  const result = await runBotGame(wb1, wb2, 'skirmish', {
    strategy: 'random',
    maxTurns: 5,
    verbose: false
  }, {
    strategy: 'random',
    maxTurns: 5,
    verbose: false
  });

  const duration = Date.now() - startTime;

  console.log(`\nGame completed in ${duration}ms`);
  console.log(`  Winner: ${result.winner ? `Player ${result.winner}` : 'Draw/Timeout'}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Turns played: ${result.turns}`);
  console.log(`  Total events: ${result.eventCount}`);

  // Show last few events
  console.log(`\nLast 5 events:`);
  const lastEvents = result.history.slice(-5);
  for (const event of lastEvents) {
    console.log(`  - ${event.type} by ${event.playerId}`);
  }

  console.log('\n   TEST 3 COMPLETE!\n');
}

async function testSimpleBot(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TEST 4: SimpleBot Decision Making');
  console.log('='.repeat(60));

  const cli = createCLI();
  const wb1 = createTestWarband('Human Team', 3);
  const wb2 = createTestWarband('Bot Team', 3);

  cli.createGame(wb1, wb2, 'skirmish');

  // Create bot for player 2
  const bot = new SimpleBot({ playerNumber: 2, strategy: 'random' });

  console.log('\nSimulating human + bot turns...');

  // Human (player 1) positions warriors
  console.log('\nPlayer 1 (human) positioning:');
  for (const warrior of cli.getState()!.warbands[0].warriors) {
    cli.submitAction('SELECT_WARRIOR', { warriorId: warrior.id }, 'player1');
    cli.submitAction('CONFIRM_POSITION', {}, 'player1');
    console.log(`  Positioned ${warrior.name}`);
  }
  cli.submitAction('ADVANCE_PHASE', {}, 'player1');

  // Bot (player 2) makes decisions
  console.log('\nPlayer 2 (bot) turn:');
  let iterations = 0;
  const maxIterations = 20;

  while (cli.getState()?.currentPlayer === 2 && iterations < maxIterations) {
    iterations++;
    const screen = cli.getScreen();
    const state = cli.getState()!;

    const decision = bot.decide(screen, state);

    if (decision) {
      const result = cli.submitEvent(decision);
      console.log(`  Bot: ${decision.type} -> ${result.success ? 'OK' : result.error}`);

      if (!result.success) break;
    } else {
      // Try to advance phase
      const advanceResult = cli.submitAction('ADVANCE_PHASE', {}, 'player2');
      if (advanceResult.success) {
        console.log(`  Bot: ADVANCE_PHASE -> OK`);
      } else {
        break;
      }
    }
  }

  console.log(`\nFinal state:`);
  console.log(`  Phase: ${cli.getState()?.phase}`);
  console.log(`  Current player: ${cli.getState()?.currentPlayer}`);
  console.log(`  Turn: ${cli.getState()?.turn}`);

  console.log('\n   TEST 4 COMPLETE!\n');
}

// Run all tests
async function main(): Promise<void> {
  console.log('\n');
  console.log('*'.repeat(60));
  console.log('*  HEADLESS GAME ENGINE TEST SUITE');
  console.log('*'.repeat(60));
  console.log('\n');

  try {
    await testManualCLI();
    await testJSONCLI();
    await testBotGame();
    await testSimpleBot();

    console.log('='.repeat(60));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n');
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  }
}

main();
