import type { KinematicId } from './types';

export type FieldLayoutVariant = 'cluster' | 'axis-row' | 'axis-matrix';

export interface FieldLayoutCell {
  id: string;
  prefix?: string;
}

export interface FieldLayoutRow {
  title?: string;
  cells: FieldLayoutCell[];
}

export interface FieldLayoutGroup {
  title: string;
  variant?: FieldLayoutVariant;
  ids?: string[];
  rows?: FieldLayoutRow[];
}

const axisRow = (title: string, cells: FieldLayoutCell[]): FieldLayoutGroup => ({
  title,
  variant: 'axis-row',
  ids: cells.map((cell) => cell.id),
  rows: [{ cells }]
});

const axisMatrix = (title: string, rows: FieldLayoutRow[]): FieldLayoutGroup => ({
  title,
  variant: 'axis-matrix',
  ids: rows.flatMap((row) => row.cells.map((cell) => cell.id)),
  rows
});

export const geometryLayout: FieldLayoutGroup[] = [
  axisRow('Bed Physical Size', [{ id: 'plate_x', prefix: 'X' }, { id: 'plate_y', prefix: 'Y' }]),
  axisRow('Usable bed', [{ id: 'bed_x', prefix: 'X' }, { id: 'bed_y', prefix: 'Y' }]),
  axisRow('Usable bed offset', [{ id: 'bed_x_offset', prefix: 'X' }, { id: 'bed_y_offset', prefix: 'Y' }]),
  axisMatrix('Travel limits', [
    { title: 'X', cells: [{ id: 'x_min', prefix: 'Min' }, { id: 'x_max', prefix: 'Max' }] },
    { title: 'Y', cells: [{ id: 'y_min', prefix: 'Min' }, { id: 'y_max', prefix: 'Max' }] },
    { title: 'Z', cells: [{ id: 'z_min', prefix: 'Min' }, { id: 'z_max', prefix: 'Max' }] }
  ]),
  axisRow('Home position', [{ id: 'home_x', prefix: 'X' }, { id: 'home_y', prefix: 'Y' }, { id: 'home_z', prefix: 'Z' }]),
  axisRow('Homing speed', [{ id: 'homing_speed_x', prefix: 'X' }, { id: 'homing_speed_y', prefix: 'Y' }, { id: 'homing_speed_z', prefix: 'Z' }])
];

export const probeLayout: FieldLayoutGroup[] = [
  { title: 'Probe preset', ids: ['probe_type', 'probe_deploy_pin', 'probe_pin'] },
  axisRow('Probe offset', [{ id: 'probe_x_offset', prefix: 'X' }, { id: 'probe_y_offset', prefix: 'Y' }, { id: 'probe_z_offset', prefix: 'Z' }]),
  { title: 'Probe motion', ids: ['probe_speed', 'probe_samples', 'probe_tolerance', 'probe_retract', 'probe_deploy_delay'] },
  axisMatrix('Mesh bounds', [
    { title: 'Min', cells: [{ id: 'mesh_xmin', prefix: 'X' }, { id: 'mesh_ymin', prefix: 'Y' }] },
    { title: 'Max', cells: [{ id: 'mesh_xmax', prefix: 'X' }, { id: 'mesh_ymax', prefix: 'Y' }] }
  ]),
  axisRow('Probe count', [{ id: 'mesh_countx', prefix: 'X' }, { id: 'mesh_county', prefix: 'Y' }]),
  { title: 'Mesh motion', ids: ['mesh_speed', 'mesh_hz'] }
];

export const kinematicLayouts: Partial<Record<KinematicId, FieldLayoutGroup[]>> = {
  delta: [
    { title: 'Delta radius', ids: ['delta_radius', 'print_radius'] },
    { title: 'Tower A', ids: ['tower_a_x', 'tower_a_y', 'delta_a_position_endstop'] },
    { title: 'Tower B', ids: ['tower_b_x', 'tower_b_y', 'delta_b_position_endstop'] },
    { title: 'Tower C', ids: ['tower_c_x', 'tower_c_y', 'delta_c_position_endstop'] },
    { title: 'Calibration', ids: ['delta_calibrate_radius', 'delta_calibrate_speed', 'delta_horizontal_move_z'] }
  ],
  deltesian: [
    { title: 'Arm geometry', ids: ['arm_length', 'arm_x_length', 'print_width', 'min_angle', 'slow_ratio'] },
    { title: 'Tower X positions', ids: ['tower_left_x', 'tower_right_x'] },
    { title: 'Endstops', ids: ['deltesian_left_position_endstop', 'deltesian_right_position_endstop'] }
  ],
  rotary_delta: [
    { title: 'Shoulder', ids: ['shoulder_radius', 'shoulder_height'] },
    { title: 'Arms', ids: ['upper_arm_length', 'lower_arm_length', 'rotary_gear_ratio'] },
    { title: 'Endstops', ids: ['rotary_a_position_endstop', 'rotary_b_position_endstop', 'rotary_c_position_endstop'] },
    { title: 'Calibration', ids: ['rotary_delta_calibrate_radius', 'rotary_delta_calibrate_speed', 'rotary_horizontal_move_z'] }
  ],
  polar: [
    { title: 'Polar reach', ids: ['polar_radius', 'max_angular_velocity'] },
    { title: 'Gear ratios', ids: ['bed_gear_ratio', 'arm_gear_ratio'] }
  ]
};
