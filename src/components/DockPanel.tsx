import { Show, type JSX } from 'solid-js';
import type { DockPanelId, DockPanelState } from '../kinematics/types';

interface DockPanelProps {
  id: DockPanelId;
  title: string;
  state: DockPanelState;
  children: JSX.Element;
  onToggle: (id: DockPanelId) => void;
  onResizeStart: (id: DockPanelId, event: MouseEvent, panelLeft: number) => void;
}

export default function DockPanel(props: DockPanelProps) {
  let panelRef: HTMLElement | undefined;

  function startResize(event: MouseEvent): void {
    props.onResizeStart(props.id, event, panelRef?.getBoundingClientRect().left ?? 0);
  }

  return (
    <aside ref={panelRef} classList={{ collapsed: props.state.collapsed }} class={`dock-panel dock-panel-${props.id}`}>
      <Show
        when={!props.state.collapsed}
        fallback={<button type="button" class="dock-panel-rail" aria-expanded={false} onClick={() => props.onToggle(props.id)}>{props.title}</button>}
      >
        <button type="button" class="dock-panel-header" aria-expanded={true} onClick={() => props.onToggle(props.id)}>
          <span class="dock-panel-title">{props.title}</span>
        </button>
        <div class="dock-panel-content-row">
          <div class="dock-panel-body">{props.children}</div>
          <div
            class="dock-panel-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize ${props.title} panel`}
            onMouseDown={startResize}
          ></div>
        </div>
      </Show>
    </aside>
  );
}
