// Mediator - Public exports

export { InputMediator, createMediator } from './InputMediator';
export type {
  ScreenCommandListener,
  ErrorListener,
  EventSubmission,
  PlayerIdentity
} from './InputMediator';

// Network adapter for multiplayer
export {
  NetworkAdapter,
  getNetworkAdapter,
  createNetworkAdapter
} from './NetworkAdapter';
export type {
  StateMessage,
  EventMessage,
  RequestStateMessage,
  GameNetworkMessage,
  ConnectionStatus,
  StateCallback,
  EventCallback,
  ConnectionStatusCallback
} from './NetworkAdapter';

// Local adapter for single-player and AI
export {
  LocalAdapter,
  getLocalAdapter,
  createLocalAdapter
} from './LocalAdapter';
export type {
  AIDecisionCallback,
  AIConfig
} from './LocalAdapter';
