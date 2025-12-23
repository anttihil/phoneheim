// App Component - Root component with routing

import { Router, Route } from '@solidjs/router';
import { lazy, Suspense, onMount, ParentProps } from 'solid-js';
import { Header, Navigation } from './components/common';
import { initStorage } from './services/storage';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const WarbandCreator = lazy(() => import('./pages/WarbandCreator'));
const WarbandList = lazy(() => import('./pages/WarbandList'));
const WarbandDetail = lazy(() => import('./pages/WarbandDetail'));
const GameSetup = lazy(() => import('./pages/GameSetup'));
const GamePlay = lazy(() => import('./pages/GamePlay'));
const Aftermath = lazy(() => import('./pages/Aftermath'));
const Multiplayer = lazy(() => import('./pages/Multiplayer'));
const RulesReference = lazy(() => import('./pages/RulesReference'));

// Root layout component that wraps all routes
function AppLayout(props: ParentProps) {
  onMount(async () => {
    try {
      await initStorage();
      console.log('Storage initialized');
    } catch (e) {
      console.error('Failed to initialize storage:', e);
    }
  });

  return (
    <div id="app">
      <Header />
      <Navigation />
      <main id="page-container">
        <Suspense fallback={<div class="loading">Loading...</div>}>
          {props.children}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router root={AppLayout}>
      <Route path="/" component={Home} />
      <Route path="/warband/create" component={WarbandCreator} />
      <Route path="/warband/list" component={WarbandList} />
      <Route path="/warband/:id" component={WarbandDetail} />
      <Route path="/game/setup" component={GameSetup} />
      <Route path="/game/play" component={GamePlay} />
      <Route path="/game/aftermath/:id" component={Aftermath} />
      <Route path="/multiplayer" component={Multiplayer} />
      <Route path="/rules" component={RulesReference} />
    </Router>
  );
}
