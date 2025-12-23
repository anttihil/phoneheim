// Aftermath Page - Post-battle sequence

import { useParams, useNavigate } from '@solidjs/router';
import { Card, Button } from '../components/common';
import { POST_BATTLE_SEQUENCE } from '../data/exploration';
import { For } from 'solid-js';

export default function Aftermath() {
  const params = useParams();
  const navigate = useNavigate();

  return (
    <div class="page aftermath">
      <h2>Post-Battle Sequence</h2>

      <Card title="Steps">
        <div class="sequence-steps">
          <For each={POST_BATTLE_SEQUENCE}>
            {(step) => (
              <div class="sequence-step">
                <span class="step-number">{step.step}</span>
                <div class="step-content">
                  <h4>{step.name}</h4>
                  <p>{step.description}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Card>

      <div class="aftermath-actions">
        <Button onClick={() => navigate('/warband/list')}>
          Return to Warbands
        </Button>
      </div>
    </div>
  );
}
