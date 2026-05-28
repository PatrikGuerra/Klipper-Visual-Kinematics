import type { FieldDefinition } from './types';

const numberField = (id: string, label: string, step: number): FieldDefinition => ({
  id,
  label,
  type: 'number',
  step
});

const textField = (id: string, label: string): FieldDefinition => ({
  id,
  label,
  type: 'text'
});

export const commonFieldGroups = {
  common: [
    numberField('max_velocity', 'Max velocity', 1),
    numberField('max_accel', 'Max accel', 1),
    numberField('minimum_cruise_ratio', 'Minimum cruise ratio', 0.01),
    numberField('max_z_velocity', 'Max Z velocity', 1),
    numberField('max_z_accel', 'Max Z accel', 1),
    numberField('square_corner_velocity', 'Corner velocity', 0.1),
    numberField('bed_z', 'Z height', 1)
  ],
  geometry: [
    numberField('bed_x', 'Usable bed X', 1),
    numberField('bed_y', 'Usable bed Y', 1),
    numberField('bed_x_offset', 'Usable bed X offset', 0.1),
    numberField('bed_y_offset', 'Usable bed Y offset', 0.1),
    numberField('plate_x', 'Bed physical size X', 1),
    numberField('plate_y', 'Bed physical size Y', 1),
    numberField('x_min', 'X min', 1),
    numberField('x_max', 'X max', 1),
    numberField('y_min', 'Y min', 1),
    numberField('y_max', 'Y max', 1),
    numberField('z_min', 'Z min', 0.1),
    numberField('z_max', 'Z max', 0.1),
    numberField('home_x', 'Home X', 0.1),
    numberField('home_y', 'Home Y', 0.1),
    numberField('home_z', 'Home Z', 0.1),
    numberField('homing_speed_x', 'Homing X speed', 1),
    numberField('homing_speed_y', 'Homing Y speed', 1),
    numberField('homing_speed_z', 'Homing Z speed', 1),
    numberField('second_homing_speed', 'Second home speed', 1),
    numberField('z_hop', 'Z hop', 0.1)
  ],
  stepper: [
    textField('default_rotation_distance', 'Default rotation distance'),
    numberField('default_microsteps', 'Default microsteps', 1),
    numberField('default_full_steps_per_rotation', 'Full steps / rotation', 1),
    textField('default_gear_ratio', 'Default gear ratio'),
    textField('default_step_pulse_duration', 'Step pulse duration'),
    numberField('default_homing_retract_dist', 'Homing retract dist', 0.1),
    textField('default_homing_retract_speed', 'Homing retract speed'),
    textField('default_homing_positive_dir', 'Homing positive dir')
  ],
  extruder: [
    textField('extruder_rotation_distance', 'E rotation distance'),
    numberField('extruder_microsteps', 'E microsteps', 1),
    numberField('extruder_full_steps_per_rotation', 'E full steps / rotation', 1),
    textField('extruder_gear_ratio', 'E gear ratio'),
    numberField('nozzle_diameter', 'Nozzle diameter', 0.01),
    numberField('filament_diameter', 'Filament diameter', 0.01),
    numberField('max_extrude_only_distance', 'Max extrude only distance', 1),
    numberField('extruder_min_temp', 'Min temp', 1),
    numberField('extruder_max_temp', 'Max temp', 1)
  ],
  probe: [
    textField('probe_type', 'Probe preset'),
    textField('probe_deploy_pin', 'Deploy pin'),
    textField('probe_pin', 'Probe pin'),
    numberField('probe_x_offset', 'Probe X offset', 0.1),
    numberField('probe_y_offset', 'Probe Y offset', 0.1),
    numberField('probe_z_offset', 'Probe Z offset', 0.001),
    numberField('probe_speed', 'Probe speed', 1),
    numberField('probe_samples', 'Probe samples', 1),
    numberField('probe_tolerance', 'Probe tolerance', 0.005),
    numberField('probe_retract', 'Retract distance', 0.1),
    numberField('probe_deploy_delay', 'Deploy delay ms', 50),
    numberField('mesh_xmin', 'Mesh X min', 1),
    numberField('mesh_xmax', 'Mesh X max', 1),
    numberField('mesh_ymin', 'Mesh Y min', 1),
    numberField('mesh_ymax', 'Mesh Y max', 1),
    numberField('mesh_countx', 'Probe count X', 1),
    numberField('mesh_county', 'Probe count Y', 1),
    numberField('mesh_speed', 'Mesh speed', 1),
    numberField('mesh_hz', 'Horizontal Z lift', 0.1),
    textField('screw_thread', 'Screw thread')
  ]
};
