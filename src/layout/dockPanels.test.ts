import { describe, expect, it } from 'vitest';
import { clampDockPanelWidth, createDefaultDockPanelsState, normalizeDockPanels, renderedDockPanelWidth } from './dockPanels';

describe('dock panel layout helpers', () => {
  it('creates stable default dock panel state', () => {
    expect(createDefaultDockPanelsState()).toEqual({
      kinematics: { collapsed: false, width: 360 },
      macros: { collapsed: false, width: 430 },
      printerCfg: { collapsed: false, width: 240 }
    });
  });

  it('normalizes missing or invalid dock panel state to defaults', () => {
    expect(normalizeDockPanels(undefined)).toEqual(createDefaultDockPanelsState());
    expect(normalizeDockPanels({ macros: { collapsed: true, width: 9999 } }).macros).toEqual({ collapsed: true, width: 860 });
  });

  it('clamps resize width by panel limits', () => {
    expect(clampDockPanelWidth('kinematics', 100)).toBe(280);
    expect(clampDockPanelWidth('macros', 9999)).toBe(860);
    expect(clampDockPanelWidth('printerCfg', 300)).toBe(300);
  });

  it('renders collapsed panels at rail width', () => {
    expect(renderedDockPanelWidth('kinematics', { collapsed: true, width: 360 })).toBe(44);
    expect(renderedDockPanelWidth('kinematics', { collapsed: false, width: 9999 })).toBe(760);
  });
});
