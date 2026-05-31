import type { DockPanelId, DockPanelState, DockPanelsState } from '../kinematics/types';

export const COLLAPSED_DOCK_PANEL_WIDTH = 44;

export interface DockPanelSizing {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

export const dockPanelOrder: DockPanelId[] = ['kinematics', 'macros', 'printerCfg'];

export const dockPanelSizing: Record<DockPanelId, DockPanelSizing> = {
  kinematics: { defaultWidth: 360, minWidth: 280, maxWidth: 760 },
  macros: { defaultWidth: 430, minWidth: 320, maxWidth: 860 },
  printerCfg: { defaultWidth: 240, minWidth: 180, maxWidth: 420 }
};

export function createDefaultDockPanelsState(): DockPanelsState {
  return dockPanelOrder.reduce<DockPanelsState>((panels, id) => {
    panels[id] = { collapsed: false, width: dockPanelSizing[id].defaultWidth };
    return panels;
  }, {} as DockPanelsState);
}

export function normalizeDockPanels(value: unknown): DockPanelsState {
  const defaults = createDefaultDockPanelsState();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Partial<Record<DockPanelId, Partial<DockPanelState>>>;

  return dockPanelOrder.reduce<DockPanelsState>((panels, id) => {
    const panel = candidate[id];
    panels[id] = {
      collapsed: typeof panel?.collapsed === 'boolean' ? panel.collapsed : defaults[id].collapsed,
      width: clampDockPanelWidth(id, panel?.width ?? defaults[id].width)
    };
    return panels;
  }, {} as DockPanelsState);
}

export function clampDockPanelWidth(id: DockPanelId, value: unknown): number {
  const sizing = dockPanelSizing[id];
  const parsed = Number(value);
  const width = Number.isFinite(parsed) ? parsed : sizing.defaultWidth;
  return Math.max(sizing.minWidth, Math.min(sizing.maxWidth, width));
}

export function renderedDockPanelWidth(id: DockPanelId, state: DockPanelState): number {
  return state.collapsed ? COLLAPSED_DOCK_PANEL_WIDTH : clampDockPanelWidth(id, state.width);
}
