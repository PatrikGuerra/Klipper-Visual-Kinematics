import type { AppState, KinematicDefinition } from '../kinematics/types';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CanvasMap extends Bounds {
  width: number;
  height: number;
  scale: number;
  padX: number;
  padY: number;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  map: CanvasMap;
  state: AppState;
  kin: KinematicDefinition;
}

export interface ScreenPoint {
  x: number;
  y: number;
}
