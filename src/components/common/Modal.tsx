// Modal Component

import { JSX, Show, onCleanup, onMount } from 'solid-js';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  showCloseButton?: boolean;
}

export default function Modal(props: ModalProps) {
  let modalRef: HTMLDivElement | undefined;

  // Close on escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.isOpen) {
      props.onClose();
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === modalRef) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <Show when={props.isOpen}>
      <div
        ref={modalRef}
        class="modal"
        onClick={handleBackdropClick}
      >
        <div class="modal-content">
          <Show when={props.title}>
            <h2 class="modal-title">{props.title}</h2>
          </Show>
          {props.children}
          <Show when={props.showCloseButton !== false}>
            <Button onClick={props.onClose}>OK</Button>
          </Show>
        </div>
      </div>
    </Show>
  );
}
