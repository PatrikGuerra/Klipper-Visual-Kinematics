import type { FieldDefinition, FieldValue, KinematicDefinition, KinematicId } from './types';

const rectNote = 'Rectangular XY workspace. Probe, mesh, safe Z home, and screws tilt are supported.';

function field(id: string, label: string, defaultValue: FieldValue, step?: number): FieldDefinition {
  return {
    id,
    label,
    defaultValue,
    type: typeof defaultValue === 'string' ? 'text' : 'number',
    step
  };
}

function define(item: Omit<KinematicDefinition, 'defaults' | 'renderer'>): KinematicDefinition {
  const defaults = Object.fromEntries(item.fields.map((f) => [f.id, f.defaultValue ?? '']));
  return { ...item, defaults, renderer: item.family };
}

export const kinematicsCatalog: KinematicDefinition[] = [
  define({
    id: 'cartesian',
    name: 'Cartesian',
    family: 'rectangular',
    status: 'stable',
    note: rectNote,
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'corexy',
    name: 'CoreXY / H-Bot',
    family: 'rectangular',
    status: 'stable',
    note: 'Rectangular XY workspace with coupled X/Y motors. Shows A=X+Y and B=X-Y.',
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'corexz',
    name: 'CoreXZ',
    family: 'rectangular',
    status: 'stable',
    note: 'Rectangular X/Z coupling. XY probing remains rectangular; readout shows X/Z motor coupling.',
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'hybrid_corexy',
    name: 'Hybrid CoreXY',
    family: 'rectangular',
    status: 'stable',
    note: 'Markforged-style hybrid CoreXY. One motor contributes to X-Y coupling, one remains Y.',
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'hybrid_corexz',
    name: 'Hybrid CoreXZ',
    family: 'rectangular',
    status: 'stable',
    note: 'Hybrid CoreXZ. One motor contributes to X-Z coupling, Y remains independent.',
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'delta',
    name: 'Linear Delta',
    family: 'delta',
    status: 'stable',
    note: 'Circular build area with three linear towers and arm-length reach checks.',
    supportsProbeFeatures: true,
    fields: [
      field('delta_radius', 'Delta radius', 130, 0.1),
      field('print_radius', 'Print radius', 120, 0.1),
      field('arm_length', 'Arm length', 250, 0.1),
      field('tower_a_x', 'Tower A X', -112.6, 0.1),
      field('tower_a_y', 'Tower A Y', -65, 0.1),
      field('tower_b_x', 'Tower B X', 112.6, 0.1),
      field('tower_b_y', 'Tower B Y', -65, 0.1),
      field('tower_c_x', 'Tower C X', 0, 0.1),
      field('tower_c_y', 'Tower C Y', 130, 0.1),
      field('delta_a_position_endstop', 'Tower A endstop', 346, 0.1),
      field('delta_b_position_endstop', 'Tower B endstop', 346, 0.1),
      field('delta_c_position_endstop', 'Tower C endstop', 346, 0.1),
      field('delta_calibrate_radius', 'Calibrate radius', 95, 0.1),
      field('delta_calibrate_speed', 'Calibrate speed', 50, 1),
      field('delta_horizontal_move_z', 'Calibrate Z lift', 5, 0.1)
    ]
  }),
  define({
    id: 'deltesian',
    name: 'Deltesian',
    family: 'deltesian',
    status: 'stable',
    note: 'Delta-like X/Z mechanism with a separate Y axis.',
    supportsProbeFeatures: true,
    fields: [
      field('arm_length', 'Arm length', 250, 0.1),
      field('arm_x_length', 'Arm X length', 200, 0.1),
      field('print_width', 'Print width', 220, 0.1),
      field('min_angle', 'Minimum angle', 20, 0.1),
      field('slow_ratio', 'Slow ratio', 3, 0.1),
      field('tower_left_x', 'Left tower X', -110, 0.1),
      field('tower_right_x', 'Right tower X', 110, 0.1),
      field('deltesian_left_position_endstop', 'Left endstop', 346, 0.1),
      field('deltesian_right_position_endstop', 'Right endstop', 346, 0.1),
      field('deltesian_y_length', 'Y travel', 250, 0.1)
    ]
  }),
  define({
    id: 'rotary_delta',
    name: 'Rotary Delta',
    family: 'rotary_delta',
    status: 'work-in-progress',
    note: 'Rotary delta is marked as work in progress in Klipper. Use generated config as a starting point only.',
    supportsProbeFeatures: true,
    fields: [
      field('shoulder_radius', 'Shoulder radius', 120, 0.1),
      field('shoulder_height', 'Shoulder height', 280, 0.1),
      field('upper_arm_length', 'Upper arm', 110, 0.1),
      field('lower_arm_length', 'Lower arm', 250, 0.1),
      field('rotary_gear_ratio', 'Gear ratio', '80:16'),
      field('rotary_print_radius', 'Print radius', 105, 0.1),
      field('rotary_a_position_endstop', 'Arm A endstop', 346, 0.1),
      field('rotary_b_position_endstop', 'Arm B endstop', 346, 0.1),
      field('rotary_c_position_endstop', 'Arm C endstop', 346, 0.1),
      field('rotary_delta_calibrate_radius', 'Calibrate radius', 95, 0.1),
      field('rotary_delta_calibrate_speed', 'Calibrate speed', 50, 1),
      field('rotary_horizontal_move_z', 'Calibrate Z lift', 5, 0.1)
    ]
  }),
  define({
    id: 'polar',
    name: 'Polar',
    family: 'polar',
    status: 'work-in-progress',
    note: 'Polar is marked as work in progress in Klipper. Avoid moves close to the exact center.',
    supportsProbeFeatures: true,
    fields: [
      field('polar_radius', 'Arm radius', 140, 0.1),
      field('max_angular_velocity', 'Max angular velocity', 0, 0.1),
      field('bed_gear_ratio', 'Bed gear ratio', '80:16'),
      field('arm_gear_ratio', 'Arm gear ratio', '1:1')
    ]
  }),
  define({
    id: 'winch',
    name: 'Cable Winch',
    family: 'winch',
    status: 'experimental',
    note: 'Cable winch support is experimental and homing is manual. Visual shows cable anchors and length readout.',
    supportsProbeFeatures: false,
    fields: []
  }),
  define({
    id: 'generic_cartesian',
    name: 'Generic Cartesian',
    family: 'generic_cartesian',
    status: 'advanced',
    note: 'Flexible carriage/stepper model for custom Cartesian-style machines.',
    supportsProbeFeatures: true,
    fields: []
  }),
  define({
    id: 'none',
    name: 'None',
    family: 'none',
    status: 'utility',
    note: 'Disables kinematic support. Useful for non-printer devices or debugging.',
    supportsProbeFeatures: false,
    fields: []
  })
];

export function kinematicById(id: FieldValue | undefined): KinematicDefinition {
  return kinematicsCatalog.find((item) => item.id === id) ?? kinematicsCatalog[0];
}

export function isKinematicId(value: FieldValue): value is KinematicId {
  return typeof value === 'string' && kinematicsCatalog.some((item) => item.id === value);
}
