// Card Component

import { JSX, Show } from 'solid-js';

export interface CardProps {
  title?: string;
  headerRight?: JSX.Element;
  class?: string;
  children: JSX.Element;
}

export default function Card(props: CardProps) {
  return (
    <div class={`card ${props.class || ''}`}>
      <Show when={props.title || props.headerRight}>
        <div class="card-header">
          <Show when={props.title}>
            <h3 class="card-title">{props.title}</h3>
          </Show>
          <Show when={props.headerRight}>
            <div class="card-header-right">{props.headerRight}</div>
          </Show>
        </div>
      </Show>
      <div class="card-body">
        {props.children}
      </div>
    </div>
  );
}
