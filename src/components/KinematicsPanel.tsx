import { createMemo, createSignal, Show } from 'solid-js';
import { Plus } from 'lucide-solid';
import { commonFieldGroups } from '../kinematics/fields';
import { kinematicById } from '../kinematics/catalog';
import { geometryLayout, kinematicLayouts, probeLayout } from '../kinematics/fieldLayouts';
import { num } from '../kinematics/math';
import { updateMutable, setValue } from '../store';
import DynamicList from './DynamicList';
import FieldGroup from './FieldGroup';
import ConfigSearchPanel from './kinematics/ConfigSearchPanel';
import KinematicsSelectorPanel from './kinematics/KinematicsSelectorPanel';
import ProbePanel from './kinematics/ProbePanel';
import SectionToggleTitle from './kinematics/SectionToggleTitle';
import ScrewsPanel from './kinematics/ScrewsPanel';
import type { AppState, Diagnostic, FieldDefinition } from '../kinematics/types';

interface KinematicsPanelProps {
  state: AppState;
  diagnostics: Diagnostic[];
}

const fieldAliases: Record<string, string[]> = {
  max_velocity: ['[printer]', 'max_velocity'],
  max_accel: ['[printer]', 'max_accel'],
  minimum_cruise_ratio: ['[printer]', 'minimum_cruise_ratio'],
  max_z_velocity: ['[printer]', 'max_z_velocity'],
  max_z_accel: ['[printer]', 'max_z_accel'],
  square_corner_velocity: ['[printer]', 'square_corner_velocity'],
  x_min: ['[stepper_x]', 'position_min', 'x position_min'],
  x_max: ['[stepper_x]', 'position_max', 'x position_max'],
  y_min: ['[stepper_y]', 'position_min', 'y position_min'],
  y_max: ['[stepper_y]', 'position_max', 'y position_max'],
  z_min: ['[stepper_z]', 'minimum_z_position', 'position_min', 'z position_min'],
  z_max: ['[stepper_z]', 'position_max', 'z position_max'],
  home_x: ['[stepper_x]', 'position_endstop', 'x position_endstop'],
  home_y: ['[stepper_y]', 'position_endstop', 'y position_endstop'],
  home_z: ['[stepper_z]', 'position_endstop', 'z position_endstop'],
  bed_x_offset: ['visual_bed_offset', 'bed offset x', 'usable bed offset x'],
  bed_y_offset: ['visual_bed_offset', 'bed offset y', 'usable bed offset y'],
  default_rotation_distance: ['rotation_distance'],
  default_microsteps: ['microsteps'],
  default_full_steps_per_rotation: ['full_steps_per_rotation'],
  default_gear_ratio: ['gear_ratio'],
  default_step_pulse_duration: ['step_pulse_duration'],
  default_homing_retract_dist: ['homing_retract_dist'],
  default_homing_retract_speed: ['homing_retract_speed'],
  default_homing_positive_dir: ['homing_positive_dir'],
  extruder_rotation_distance: ['[extruder]', 'rotation_distance', 'extruder rotation_distance'],
  extruder_microsteps: ['[extruder]', 'microsteps', 'extruder microsteps'],
  extruder_full_steps_per_rotation: ['[extruder]', 'full_steps_per_rotation'],
  extruder_gear_ratio: ['[extruder]', 'gear_ratio'],
  nozzle_diameter: ['[extruder]', 'nozzle_diameter'],
  filament_diameter: ['[extruder]', 'filament_diameter'],
  max_extrude_only_distance: ['[extruder]', 'max_extrude_only_distance'],
  extruder_min_temp: ['[extruder]', 'min_temp'],
  extruder_max_temp: ['[extruder]', 'max_temp'],
  probe_pin: ['[probe]', 'pin'],
  probe_x_offset: ['[probe]', 'x_offset'],
  probe_y_offset: ['[probe]', 'y_offset'],
  probe_z_offset: ['[probe]', 'z_offset'],
  probe_speed: ['[probe]', 'speed'],
  probe_samples: ['[probe]', 'samples'],
  probe_tolerance: ['[probe]', 'samples_tolerance'],
  probe_retract: ['[probe]', 'sample_retract_dist'],
  mesh_xmin: ['[bed_mesh]', 'mesh_min', 'mesh_min x'],
  mesh_xmax: ['[bed_mesh]', 'mesh_max', 'mesh_max x'],
  mesh_ymin: ['[bed_mesh]', 'mesh_min', 'mesh_min y'],
  mesh_ymax: ['[bed_mesh]', 'mesh_max', 'mesh_max y'],
  mesh_countx: ['[bed_mesh]', 'probe_count', 'probe_count x'],
  mesh_county: ['[bed_mesh]', 'probe_count', 'probe_count y'],
  mesh_speed: ['[bed_mesh]', 'speed'],
  mesh_hz: ['[bed_mesh]', 'horizontal_move_z'],
  screwsEnabled: ['[screws_tilt_adjust]', 'enable screws', 'screws enabled'],
  screw_reference: ['[screws_tilt_adjust]', 'input reference', 'usable bed', 'bed physical size'],
  screw_thread: ['[screws_tilt_adjust]', 'screw_thread', 'CW-M3', 'CCW-M3', 'CW-M4', 'CCW-M4', 'CW-M5', 'CCW-M5'],
  delta_radius: ['[printer]', 'delta_radius'],
  print_radius: ['[printer]', 'print_radius'],
  delta_calibrate_radius: ['[delta_calibrate]', 'radius'],
  delta_calibrate_speed: ['[delta_calibrate]', 'speed'],
  delta_horizontal_move_z: ['[delta_calibrate]', 'horizontal_move_z'],
  max_angular_velocity: ['[printer]', 'max_angular_velocity'],
  bed_gear_ratio: ['[stepper_bed]', 'gear_ratio'],
  arm_gear_ratio: ['[stepper_arm]', 'gear_ratio']
};

export default function KinematicsPanel(props: KinematicsPanelProps) {
  const [configSearch, setConfigSearch] = createSignal('');
  const kin = createMemo(() => kinematicById(props.state.values.kinematics));
  const searchTerm = createMemo(() => normalize(configSearch()));

  const commonFields = createMemo(() => filterFields(commonFieldGroups.common));
  const geometryFields = createMemo(() => filterFields(commonFieldGroups.geometry));
  const stepperFields = createMemo(() => filterFields(commonFieldGroups.stepper));
  const extruderFields = createMemo(() => filterFields(commonFieldGroups.extruder));
  const probeFields = createMemo(() => filterFields(commonFieldGroups.probe.filter((field) => field.id !== 'screw_thread')));
  const screwFields = createMemo(() => filterFields(commonFieldGroups.probe.filter((field) => field.id === 'screw_thread')));
  const kinematicFields = createMemo(() => filterFields(kin().fields));

  const screwMatchCount = createMemo(() => matchingFieldCount(props.state.screws, () => [['X', 'screw_x'], ['Y', 'screw_y'], ['Name', 'screw_name']]));
  const screwsEnabledMatches = createMemo(() => matchesText('Enable', 'screwsEnabled', '[screws_tilt_adjust]', 'enable screws'));
  const screwReferenceMatches = createMemo(() => matchesText('Input reference', 'screw_reference', 'usable bed', 'bed physical size', 'physical plate'));
  const winchMatchCount = createMemo(() => matchingFieldCount(props.state.winches, () => [['Name', 'winch_name'], ['Anchor X', 'anchor_x'], ['Anchor Y', 'anchor_y'], ['Anchor Z', 'anchor_z'], ['Rot dist', 'rotation_distance']]));
  const carriageMatchCount = createMemo(() => matchingFieldCount(props.state.carriages, () => [['Name', 'carriage_name'], ['Axis', 'axis'], ['Min', 'position_min'], ['Max', 'position_max'], ['Endstop', 'position_endstop']]));
  const genericStepperMatchCount = createMemo(() => matchingFieldCount(props.state.genericSteppers, () => [['Name', 'stepper_name'], ['Carriages', 'carriages'], ['Equation', 'equation']]));

  const showCommon = createMemo(() => shouldShowSection(commonFields()));
  const showGeometry = createMemo(() => shouldShowSection(geometryFields()));
  const showStepper = createMemo(() => shouldShowSection(stepperFields()));
  const showExtruder = createMemo(() => shouldShowSection(extruderFields()));
  const showScrews = createMemo(() => !searchTerm() || screwFields().length > 0 || screwsEnabledMatches() || screwReferenceMatches() || screwMatchCount() > 0);
  const showProbe = createMemo(() => !searchTerm() || probeFields().length > 0);
  const showWinches = createMemo(() => !searchTerm() || winchMatchCount() > 0);
  const showCarriages = createMemo(() => !searchTerm() || carriageMatchCount() > 0);
  const showGenericSteppers = createMemo(() => !searchTerm() || genericStepperMatchCount() > 0);
  const showKinematicSettings = createMemo(
    () => !searchTerm() || kinematicFields().length > 0 || (kin().id === 'winch' && winchMatchCount() > 0) || (kin().id === 'generic_cartesian' && (carriageMatchCount() > 0 || genericStepperMatchCount() > 0))
  );
  const matchCount = createMemo(
    () => commonFields().length + geometryFields().length + stepperFields().length + extruderFields().length + probeFields().length + screwFields().length + kinematicFields().length + (searchTerm() ? (screwsEnabledMatches() ? 1 : 0) + (screwReferenceMatches() ? 1 : 0) + screwMatchCount() + winchMatchCount() + carriageMatchCount() + genericStepperMatchCount() : 0)
  );

  function normalize(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  function compact(value: unknown): string {
    return normalize(value).replace(/[\s_\-:[\]()]+/g, '');
  }

  function matchesText(...parts: unknown[]): boolean {
    if (!searchTerm()) return true;
    const fullText = parts.map((part) => normalize(part)).join(' ');
    const compactText = parts.map((part) => compact(part)).join('');
    return fullText.includes(searchTerm()) || compactText.includes(compact(searchTerm()));
  }

  function matchesField(field: FieldDefinition): boolean {
    return matchesText(field.id, field.label, ...(fieldAliases[field.id] ?? []));
  }

  function filterFields(fields: FieldDefinition[]): FieldDefinition[] {
    if (!searchTerm()) return fields;
    return fields.filter(matchesField);
  }

  function matchingFieldCount<T>(items: T[], fieldsForItem: (item: T) => unknown[][]): number {
    if (!searchTerm()) return items.length;
    return items.reduce((total, item) => total + fieldsForItem(item).filter((parts) => matchesText(...parts)).length, 0);
  }

  function shouldShowSection(filteredFields: FieldDefinition[]): boolean {
    if (!searchTerm()) return true;
    return filteredFields.length > 0;
  }

  function addScrew(): void {
    updateMutable((draft) => {
      draft.screws.push({
        x: num(draft.values.bed_x_offset) + num(draft.values.bed_x) / 2,
        y: num(draft.values.bed_y_offset) + num(draft.values.bed_y) / 2,
        name: `Screw ${draft.screws.length + 1}`
      });
    });
  }

  function addWinch(): void {
    updateMutable((draft) => {
      if (draft.winches.length >= 26) return;
      const index = draft.winches.length;
      draft.winches.push({ name: String.fromCharCode(65 + index), x: 0, y: 0, z: Number(draft.values.z_max) || 300, rotation_distance: 40 });
    });
  }

  function addCarriage(): void {
    updateMutable((draft) => {
      draft.carriages.push({ name: `carriage_extra_${draft.carriages.length}`, axis: 'x', min: 0, max: 100, endstop: 0 });
    });
  }

  function addStepper(): void {
    updateMutable((draft) => {
      draft.genericSteppers.push({ name: `stepper s${draft.genericSteppers.length}`, carriages: 'carriage_x', equation: 'x' });
    });
  }

  return (
    <aside class="sidebar">
      <ConfigSearchPanel value={configSearch()} matchCount={matchCount()} onInput={setConfigSearch} />

      <KinematicsSelectorPanel selectedId={String(props.state.values.kinematics)} kin={kin()} />

      <Show when={showCommon()}><section class="panel"><div class="panel-title"><span>Common Motion</span></div><FieldGroup fields={commonFields()} state={props.state} diagnostics={props.diagnostics} emptyMessage="No matching config fields in this block." /></section></Show>
      <Show when={showGeometry()}><section class="panel"><div class="panel-title"><span>Machine Geometry</span></div><FieldGroup fields={geometryFields()} state={props.state} diagnostics={props.diagnostics} layout={geometryLayout} emptyMessage="No matching config fields in this block." /></section></Show>
      <Show when={showStepper()}><section class="panel"><div class="panel-title"><span>Stepper Defaults</span></div><FieldGroup fields={stepperFields()} state={props.state} diagnostics={props.diagnostics} emptyMessage="No matching config fields in this block." /><p class="help">Used to fill common [stepper] options. Step, dir, enable, and endstop pins are still emitted as CHANGE_ME per stepper.</p></section></Show>
      <Show when={showExtruder()}>
        <section class="panel">
          <SectionToggleTitle
            id="enable-extruder-section"
            label="Extruder / E Stepper"
            checked={!!props.state.values.extruderEnabled}
            tooltip="Enable the optional [extruder] section and E stepper fields in the generated printer.cfg."
            onChange={(checked) => setValue('extruderEnabled', checked)}
          />
          <div classList={{ 'disabled-block': !props.state.values.extruderEnabled }}>
            <FieldGroup fields={extruderFields()} state={props.state} diagnostics={props.diagnostics} emptyMessage="No matching config fields in this block." />
            <p class="help">Generates an optional [extruder] starter section. Heater, sensor, and stepper pins remain CHANGE_ME.</p>
          </div>
        </section>
      </Show>

      <Show when={showProbe()}><ProbePanel state={props.state} diagnostics={props.diagnostics} kin={kin()} fields={probeFields()} layout={probeLayout} /></Show>

      <Show when={showScrews()}>
        <ScrewsPanel
          state={props.state}
          diagnostics={props.diagnostics}
          kin={kin()}
          configSearch={configSearch()}
          searchTerm={searchTerm()}
          showReference={screwReferenceMatches()}
          showThread={screwFields().length > 0}
          onAddScrew={addScrew}
        />
      </Show>

      <Show when={showKinematicSettings()}>
        <section class="panel">
          <div class="panel-title"><span>{kin().name} Settings</span></div>
          <FieldGroup fields={kinematicFields()} state={props.state} diagnostics={props.diagnostics} layout={kinematicLayouts[kin().id]} emptyMessage="No matching config fields in this block." />
          <Show when={kin().id === 'winch' && (!searchTerm() || showWinches())}>
            <div class="sub-title"><span>Cable winches</span><Show when={!searchTerm()}><button type="button" class="success" onClick={addWinch}><Plus size={14} />Add winch</button></Show></div>
            <DynamicList state={props.state} type="winches" filterText={configSearch()} />
          </Show>
          <Show when={kin().id === 'generic_cartesian'}>
            <Show when={!searchTerm()}><div class="specific-note">Define primary carriages and steppers. Equations are visual/readout helpers and do not replace Klipper's real stepper configuration.</div></Show>
            <Show when={!searchTerm() || showCarriages()}><div class="sub-title"><span>Carriages</span><Show when={!searchTerm()}><button type="button" class="success" onClick={addCarriage}><Plus size={14} />Add carriage</button></Show></div><DynamicList state={props.state} type="carriages" filterText={configSearch()} /></Show>
            <Show when={!searchTerm() || showGenericSteppers()}><div class="sub-title"><span>Steppers</span><Show when={!searchTerm()}><button type="button" class="success" onClick={addStepper}><Plus size={14} />Add stepper</button></Show></div><DynamicList state={props.state} type="genericSteppers" filterText={configSearch()} /></Show>
          </Show>
          <Show when={kin().id === 'none' && !searchTerm()}><div class="specific-note">No axis, probe, mesh, or stepper sections are generated for this mode.</div></Show>
          <Show when={kin().status !== 'stable' && !searchTerm()}><div class="specific-note">This kinematic is flagged as {kin().status}. Generated config is intentionally conservative.</div></Show>
        </section>
      </Show>

      <Show when={searchTerm() && matchCount() === 0}><section class="panel"><div class="diagnostic info">INFO: No config fields matched "{configSearch()}".</div></section></Show>
    </aside>
  );
}
