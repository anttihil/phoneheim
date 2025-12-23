// Navigation Component

import { A, useLocation } from '@solidjs/router';

interface NavItem {
  path: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/warband/create', label: 'Create Warband' },
  { path: '/warband/list', label: 'My Warbands' },
  { path: '/game/setup', label: 'Play Game' },
  { path: '/multiplayer', label: 'Multiplayer' },
  { path: '/rules', label: 'Rules Reference' }
];

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav id="main-menu" class="main-nav">
      {navItems.map((item) => (
        <A
          href={item.path}
          class={`nav-btn ${isActive(item.path) ? 'active' : ''}`}
        >
          {item.label}
        </A>
      ))}
    </nav>
  );
}
