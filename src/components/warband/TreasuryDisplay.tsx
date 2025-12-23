// Treasury Display Component

export interface TreasuryDisplayProps {
  amount: number;
  showLabel?: boolean;
}

export default function TreasuryDisplay(props: TreasuryDisplayProps) {
  const isLow = () => props.amount < 50;
  const isEmpty = () => props.amount <= 0;

  return (
    <div class={`treasury ${isEmpty() ? 'empty' : isLow() ? 'low' : ''}`}>
      {props.showLabel !== false && <span class="treasury-label">Treasury:</span>}
      <span class="treasury-amount">{props.amount}gc</span>
    </div>
  );
}
