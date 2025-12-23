// Status Badge Component

import type { WarriorGameStatus } from '../../types';

export interface StatusBadgeProps {
  status: WarriorGameStatus;
}

const STATUS_LABELS: Record<WarriorGameStatus, string> = {
  standing: 'Standing',
  knockedDown: 'Knocked Down',
  stunned: 'Stunned',
  outOfAction: 'Out of Action',
  fleeing: 'Fleeing'
};

export default function StatusBadge(props: StatusBadgeProps) {
  return (
    <span class={`status-badge status-${props.status}`}>
      {STATUS_LABELS[props.status]}
    </span>
  );
}
