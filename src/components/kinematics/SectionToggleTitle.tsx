import type { JSX } from 'solid-js';

interface SectionToggleTitleProps {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  tooltip: string;
  onChange: (checked: boolean) => void;
  children?: JSX.Element;
}

export default function SectionToggleTitle(props: SectionToggleTitleProps) {
  return (
    <div class="panel-title panel-title-toggle">
      <label classList={{ disabled: !!props.disabled }} class="section-toggle-title" title={props.tooltip} for={props.id}>
        <input id={props.id} type="checkbox" checked={props.checked} disabled={props.disabled} onChange={(event) => props.onChange(event.currentTarget.checked)} />
        <span>{props.label}</span>
      </label>
      {props.children && <div class="panel-title-actions">{props.children}</div>}
    </div>
  );
}
