import { For, onCleanup, type JSX } from 'solid-js';
import { dockPanelOrder, renderedDockPanelWidth } from '../layout/dockPanels';
import { resizeDockPanel, toggleDockPanel } from '../store';
import DockPanel from './DockPanel';
import type { DockPanelId, DockPanelsState } from '../kinematics/types';

export interface PanelDockItem {
  id: DockPanelId;
  title: string;
  content: JSX.Element;
}

interface PanelDockProps {
  panels: PanelDockItem[];
  state: DockPanelsState;
  workspace: JSX.Element;
}

interface ResizeState {
  id: DockPanelId;
  panelLeft: number;
}

export default function PanelDock(props: PanelDockProps) {
  let resizeState: ResizeState | null = null;

  onCleanup(stopResize);

  function dockStyle(): string {
    return dockPanelOrder
      .map((id) => `--dock-panel-${id}-width: ${renderedDockPanelWidth(id, props.state[id])}px`)
      .join('; ');
  }

  function startResize(id: DockPanelId, event: MouseEvent, panelLeft: number): void {
    event.preventDefault();
    resizeState = { id, panelLeft };
    document.body.classList.add('resizing-panels');
    window.addEventListener('mousemove', resizePanel);
    window.addEventListener('mouseup', stopResize);
  }

  function resizePanel(event: MouseEvent): void {
    if (!resizeState) return;
    resizeDockPanel(resizeState.id, event.clientX - resizeState.panelLeft);
  }

  function stopResize(): void {
    resizeState = null;
    document.body.classList.remove('resizing-panels');
    window.removeEventListener('mousemove', resizePanel);
    window.removeEventListener('mouseup', stopResize);
  }

  return (
    <main class="app-layout" style={dockStyle()}>
      <For each={props.panels}>
        {(panel) => (
          <DockPanel id={panel.id} title={panel.title} state={props.state[panel.id]} onToggle={toggleDockPanel} onResizeStart={startResize}>
            {panel.content}
          </DockPanel>
        )}
      </For>
      {props.workspace}
    </main>
  );
}
