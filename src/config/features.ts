// Feature flags for gradual rollout of new features
//
// These flags allow us to switch between implementations without code changes.
// Useful for:
// - A/B testing
// - Gradual rollout
// - Quick rollback if issues arise

/**
 * Use PhaseCoordinator instead of GameEngine
 *
 * When true, the game uses the new modular PhaseCoordinator.
 * When false (default), uses the legacy GameEngine.
 *
 * Can be enabled via:
 * - Environment variable: VITE_USE_PHASE_COORDINATOR=true
 * - localStorage: localStorage.setItem('usePhaseCoordinator', 'true')
 */
export const USE_PHASE_COORDINATOR: boolean =
  // Check environment variable first (for build-time config)
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_USE_PHASE_COORDINATOR === 'true') ||
  // Check localStorage for runtime toggle (browser only)
  (typeof localStorage !== 'undefined' &&
    localStorage.getItem('usePhaseCoordinator') === 'true');
