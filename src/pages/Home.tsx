// Home Page

import { A } from '@solidjs/router';

export default function Home() {
  return (
    <div class="page home-page">
      <div class="hero">
        <h2>Welcome to Phoneheim</h2>
        <p>Your companion app for Mordheim tabletop battles</p>
      </div>

      <div class="quick-actions">
        <A href="/warband/create" class="action-card">
          <h3>Create Warband</h3>
          <p>Build a new warband from scratch</p>
        </A>

        <A href="/warband/list" class="action-card">
          <h3>My Warbands</h3>
          <p>View and manage your saved warbands</p>
        </A>

        <A href="/game/setup" class="action-card">
          <h3>Play Game</h3>
          <p>Start a new battle</p>
        </A>

        <A href="/rules" class="action-card">
          <h3>Rules Reference</h3>
          <p>Quick reference for game rules</p>
        </A>
      </div>
    </div>
  );
}
