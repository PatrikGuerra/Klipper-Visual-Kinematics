export type KinematicId =
  | 'cartesian'
  | 'corexy'
  | 'corexz'
  | 'hybrid_corexy'
  | 'hybrid_corexz'
  | 'generic_cartesian'
  | 'delta'
  | 'deltesian'
  | 'rotary_delta'
  | 'polar'
  | 'winch'
  | 'none';

export type KinematicFamily =
  | 'rectangular'
  | 'generic_cartesian'
  | 'delta'
  | 'deltesian'
  | 'rotary_delta'
  | 'polar'
  | 'winch'
  | 'none';

export type KinematicStatus = 'stable' | 'advanced' | 'work-in-progress' | 'experimental' | 'utility';
export type FieldValue = number | string | boolean;

export interface FieldDefinition {
  id: string;
  label: string;
  type: 'number' | 'text';
  defaultValue?: FieldValue;
  step?: number;
  full?: boolean;
}

export interface Diagnostic {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface MotorReadoutRow {
  label: string;
  value: string;
}

export interface ConfigSection {
  title: string;
  body: string;
}

export interface KinematicDefinition {
  id: KinematicId;
  name: string;
  family: KinematicFamily;
  status: KinematicStatus;
  note: string;
  supportsProbeFeatures: boolean;
  fields: FieldDefinition[];
  defaults: Record<string, FieldValue>;
  renderer: KinematicFamily;
}

export interface Screw {
  x: number;
  y: number;
  name: string;
}

export interface Winch {
  name: string;
  x: number;
  y: number;
  z: number;
  rotation_distance: number;
}

export interface Carriage {
  name: string;
  axis: string;
  min: number;
  max: number;
  endstop: number;
}

export interface GenericStepper {
  name: string;
  carriages: string;
  equation: string;
}

export interface Toolhead {
  x: number;
  y: number;
  z: number;
}

export type DimensionLayerId = 'bedPhysicalSize' | 'usableBed' | 'usableBedOffset' | 'travelLimits' | 'meshBounds' | 'probeOffset' | 'screwPositions';
export type DimensionLayers = Record<DimensionLayerId, boolean>;

export interface UiState {
  zoom: number;
  panX: number;
  panY: number;
  testMode: boolean;
  dimensionMenuOpen: boolean;
  dimensionLayers: DimensionLayers;
  outputCollapsed: boolean;
  macroOutputCollapsed: boolean;
  kinematicsPanelCollapsed: boolean;
  kinematicsPanelExpanded: boolean;
  kinematicsPanelWidth: number;
  macrosPanelCollapsed: boolean;
  macrosPanelExpanded: boolean;
  macrosPanelWidth: number;
  printerCfgPanelCollapsed: boolean;
  printerCfgPanelWidth: number;
  printerCfgModalOpen: boolean;
  shareModalOpen: boolean;
  aboutModalOpen: boolean;
  printerCfgDraft: string;
  printerCfgDirty: boolean;
  unmanagedConfigText: string;
  configLineOverrides: Record<string, Record<string, string>>;
  configExtraLines: Record<string, string[]>;
  printerCfgDiagnostics: Diagnostic[];
}

export type MacroSimulationStartMode = 'current' | 'manual';

export interface MacroDefinition {
  id: string;
  name: string;
  description: string;
  gcode: string;
  paramsText: string;
  simulationStartMode: MacroSimulationStartMode;
  simulationStart: Toolhead;
}

export type MacroSegmentType = 'move' | 'pause' | 'event';

export interface MacroSegment {
  type: MacroSegmentType;
  command: string;
  lineNumber: number;
  from: Toolhead;
  to: Toolhead;
  fromE: number;
  toE: number;
  extrusionDelta: number;
  feedrate?: number;
  durationMs?: number;
  simulated: boolean;
  outOfBounds: boolean;
  message?: string;
}

export interface MacroPreview {
  macroId: string;
  segments: MacroSegment[];
  diagnostics: Diagnostic[];
  partial: boolean;
  start: Toolhead;
  finalToolhead: Toolhead;
  finalExtruder: number;
  totalExtrusion: number;
}

export interface MacroRunState {
  playing: boolean;
  stepIndex: number;
  segmentProgress: number;
  speed: number;
  loopPreview: boolean;
}

export interface AppState {
  values: Record<string, FieldValue>;
  screws: Screw[];
  winches: Winch[];
  carriages: Carriage[];
  genericSteppers: GenericStepper[];
  macros: MacroDefinition[];
  activeMacroId: string;
  macroPreview: MacroPreview;
  macroRun: MacroRunState;
  toolhead: Toolhead;
  ui: UiState;
}
