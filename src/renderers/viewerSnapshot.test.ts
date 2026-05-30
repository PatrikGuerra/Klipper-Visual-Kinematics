import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../kinematics/defaults';
import { viewerSnapshot } from './viewerSnapshot';

describe('viewerSnapshot', () => {
  it('changes when the toolhead moves', () => {
    const state = createDefaultState();
    const before = viewerSnapshot(state);
    state.toolhead.x += 10;
    expect(viewerSnapshot(state)).not.toEqual(before);
  });

  it('changes when screws, macro preview, or dimension layers change', () => {
    const state = createDefaultState();
    const before = viewerSnapshot(state);
    state.screws[0].x += 5;
    state.macroPreview.segments = [];
    state.ui.dimensionLayers.screwPositions = true;
    expect(viewerSnapshot(state)).not.toEqual(before);
  });
});
