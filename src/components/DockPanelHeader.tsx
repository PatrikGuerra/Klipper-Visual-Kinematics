import type { DockPanelId } from '../kinematics/types';

interface DockPanelHeaderProps {
  id: DockPanelId;
  title: string;
  expanded: boolean;
  onToggle: (id: DockPanelId) => void;
}

export default function DockPanelHeader(props: DockPanelHeaderProps) {
  return (
    <button type="button" class="dock-panel-header-button" aria-expanded={props.expanded} onClick={() => props.onToggle(props.id)}>
      <span class="dock-panel-title">{props.title}</span>
    </button>
  );
}
