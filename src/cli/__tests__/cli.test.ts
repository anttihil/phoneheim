// CLI unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { GameCLI, createCLI, createJSONCLI, createInteractiveCLI } from '../index';
import {
  createTestWarband,
  createTestGameState,
  resetIdCounter
} from '../../phases/__tests__/testHelpers';
import type { GameEvent } from '../../phases/types/events';

describe('GameCLI', () => {
  let cli: GameCLI;

  beforeEach(() => {
    resetIdCounter();
    cli = createCLI();
  });

  describe('game lifecycle', () => {
    it('should create a new game', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      const screen = cli.createGame(wb1, wb2, 'skirmish');

      expect(screen.screen).toBe('GAME_SETUP');
      expect(cli.getState()).not.toBeNull();
    });

    it('should load a saved game', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      // Create and play a bit
      cli.createGame(wb1, wb2, 'skirmish');
      const state = cli.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      cli.submitAction('SELECT_WARRIOR', { warriorId });

      // Save
      const saved = cli.serialize();

      // Create new CLI and load
      const newCli = createCLI();
      const screen = newCli.loadGame(saved.state, saved.history);

      expect(screen.screen).toBe('GAME_SETUP');
      expect(newCli.getHistory().length).toBe(1);
    });
  });

  describe('event submission', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');
    });

    it('should submit events via submitAction', () => {
      const state = cli.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = cli.submitAction('SELECT_WARRIOR', { warriorId });

      expect(result.success).toBe(true);
      expect(cli.getHistory().length).toBe(1);
    });

    it('should submit full events via submitEvent', () => {
      const state = cli.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const event: GameEvent = {
        id: 'custom-id',
        timestamp: '2024-01-01T00:00:00Z',
        playerId: 'custom-player',
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      } as GameEvent;

      const result = cli.submitEvent(event);

      expect(result.success).toBe(true);
      expect(cli.getHistory()[0].id).toBe('custom-id');
    });

    it('should return error for invalid events', () => {
      const result = cli.submitAction('SELECT_WARRIOR', { warriorId: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('state access', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');
    });

    it('should get current screen', () => {
      const screen = cli.getScreen();

      expect(screen.screen).toBe('GAME_SETUP');
    });

    it('should get current state', () => {
      const state = cli.getState();

      expect(state).not.toBeNull();
      expect(state?.phase).toBe('setup');
    });

    it('should get event history', () => {
      const state = cli.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      cli.submitAction('SELECT_WARRIOR', { warriorId });

      const history = cli.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('SELECT_WARRIOR');
    });

    it('should get available events', () => {
      const available = cli.getAvailableEvents();

      expect(available).toContain('SELECT_WARRIOR');
      expect(available).toContain('ADVANCE_PHASE');
    });
  });

  describe('undo operations', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');
    });

    it('should undo to event', () => {
      const state = cli.getState()!;
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[0].warriors[1];

      cli.submitAction('SELECT_WARRIOR', { warriorId: warrior1.id });
      const firstEventId = cli.getHistory()[0].id;

      cli.submitAction('CONFIRM_POSITION', {});
      cli.submitAction('SELECT_WARRIOR', { warriorId: warrior2.id });

      expect(cli.getHistory().length).toBe(3);

      cli.undoToEvent(firstEventId);

      expect(cli.getHistory().length).toBe(1);
    });

    it('should undo last events', () => {
      const state = cli.getState()!;
      const warrior1 = state.warbands[0].warriors[0];

      cli.submitAction('SELECT_WARRIOR', { warriorId: warrior1.id });
      cli.submitAction('CONFIRM_POSITION', {});

      expect(cli.getHistory().length).toBe(2);

      cli.undoLastEvents(1);

      expect(cli.getHistory().length).toBe(1);
    });

    it('should reset game', () => {
      const state = cli.getState()!;
      const warrior1 = state.warbands[0].warriors[0];

      cli.submitAction('SELECT_WARRIOR', { warriorId: warrior1.id });
      cli.submitAction('CONFIRM_POSITION', {});

      expect(cli.getHistory().length).toBe(2);

      cli.resetGame();

      expect(cli.getHistory().length).toBe(0);
    });
  });

  describe('output formatting', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');
    });

    it('should format screen as JSON when configured', () => {
      const jsonCli = createJSONCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      jsonCli.createGame(wb1, wb2, 'skirmish');

      const screen = jsonCli.getScreen();
      const formatted = jsonCli.formatScreen(screen);

      // Should be valid JSON
      const parsed = JSON.parse(formatted);
      expect(parsed.screen).toBe('GAME_SETUP');
    });

    it('should format screen as pretty text when configured', () => {
      const prettyCli = createInteractiveCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      prettyCli.createGame(wb1, wb2, 'skirmish');

      const screen = prettyCli.getScreen();
      const formatted = prettyCli.formatScreen(screen);

      expect(formatted).toContain('Screen: GAME_SETUP');
      expect(formatted).toContain('Available Events:');
    });

    it('should format state as JSON when configured', () => {
      const jsonCli = createJSONCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      jsonCli.createGame(wb1, wb2, 'skirmish');

      const state = jsonCli.getState()!;
      const formatted = jsonCli.formatState(state);

      // Should be valid JSON
      const parsed = JSON.parse(formatted);
      expect(parsed.phase).toBe('setup');
    });

    it('should format state as pretty text when configured', () => {
      const prettyCli = createInteractiveCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      prettyCli.createGame(wb1, wb2, 'skirmish');

      const state = prettyCli.getState()!;
      const formatted = prettyCli.formatState(state);

      expect(formatted).toContain('GAME STATE');
      expect(formatted).toContain('Warband 1');
      expect(formatted).toContain('Warband 2');
    });
  });

  describe('serialization', () => {
    it('should serialize game', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');

      const state = cli.getState()!;
      cli.submitAction('SELECT_WARRIOR', { warriorId: state.warbands[0].warriors[0].id });

      const serialized = cli.serialize();

      expect(serialized.state).toBeDefined();
      expect(serialized.history.length).toBe(1);
    });

    it('should export as JSON string', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');

      const json = cli.exportJSON();

      // Should be valid JSON
      const parsed = JSON.parse(json);
      expect(parsed.state).toBeDefined();
      expect(parsed.history).toBeDefined();
    });
  });

  describe('factory functions', () => {
    it('createCLI should create a CLI instance', () => {
      const cli = createCLI();
      expect(cli).toBeInstanceOf(GameCLI);
    });

    it('createJSONCLI should create a JSON-configured CLI', () => {
      const cli = createJSONCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');

      const formatted = cli.formatScreen(cli.getScreen());
      // Should be valid JSON
      expect(() => JSON.parse(formatted)).not.toThrow();
    });

    it('createInteractiveCLI should create a pretty-configured CLI', () => {
      const cli = createInteractiveCLI();
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      cli.createGame(wb1, wb2, 'skirmish');

      const formatted = cli.formatScreen(cli.getScreen());
      expect(formatted).toContain('=');
    });
  });
});
