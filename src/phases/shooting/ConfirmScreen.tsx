// Shooting Confirm Screen

import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface ConfirmScreenProps {
  data: {
    shooter?: {
      name?: string;
    } | null;
    target?: {
      id: string;
      name?: string;
    } | null;
    toHitNeeded?: number;
  };
}

export default function ConfirmScreen(props: ConfirmScreenProps) {
  const handleConfirmShot = () => {
    if (props.data.target) {
      uiStore.confirmShot(props.data.target.id);
    }
  };

  const handleDeselect = () => {
    uiStore.deselect();
  };

  return (
    <Card title="Confirm Shot">
      <p>Shooter: {props.data.shooter?.name}</p>
      <p>Target: {props.data.target?.name}</p>
      <p>To Hit Needed: {props.data.toHitNeeded ?? '?'}+</p>

      <div class="confirm-actions">
        <Button onClick={handleConfirmShot}>
          Fire!
        </Button>
        <Button variant="secondary" onClick={handleDeselect}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
