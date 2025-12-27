// Form Control Component

import { JSX, For, Show, createEffect } from 'solid-js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormControlProps {
  type: 'text' | 'number' | 'select' | 'textarea';
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  class?: string;
  id?: string;
  min?: number;
  max?: number;
  rows?: number;
}

export default function FormControl(props: FormControlProps) {
  const handleChange: JSX.EventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, Event> = (e) => {
    props.onChange(e.currentTarget.value);
  };

  const inputId = () => props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div class={`form-control ${props.class || ''} ${props.error ? 'has-error' : ''}`}>
      <Show when={props.label}>
        <label for={inputId()}>{props.label}</label>
      </Show>

      {props.type === 'select' ? (
        <select
          id={inputId()}
          ref={(el) => {
            // Use effect to sync value after options are rendered
            // This fixes the issue where value is lost when options change dynamically
            createEffect(() => {
              const val = String(props.value);
              // Access options to track reactivity
              props.options;
              // Set value directly on DOM element to ensure it persists through option changes
              if (el.value !== val) {
                el.value = val;
              }
            });
          }}
          onChange={handleChange}
          disabled={props.disabled}
          required={props.required}
        >
          <For each={props.options}>
            {(option) => (
              <option value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            )}
          </For>
        </select>
      ) : props.type === 'textarea' ? (
        <textarea
          id={inputId()}
          value={props.value}
          onInput={handleChange}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          rows={props.rows || 3}
        />
      ) : (
        <input
          id={inputId()}
          type={props.type}
          value={props.value}
          onInput={handleChange}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          min={props.min}
          max={props.max}
        />
      )}

      <Show when={props.error}>
        <span class="form-error">{props.error}</span>
      </Show>
    </div>
  );
}
