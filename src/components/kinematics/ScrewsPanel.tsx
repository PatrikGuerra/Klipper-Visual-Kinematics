import { For, Show } from 'solid-js';
import { Plus } from 'lucide-solid';
import { normalizeScrewReference, screwReferenceOptions } from '../../kinematics/screwReference';
import { normalizeScrewThread, screwThreadOptions } from '../../kinematics/screwThreads';
import { setValue } from '../../store';
import DynamicList from '../DynamicList';
import SectionToggleTitle from './SectionToggleTitle';
import type { AppState, Diagnostic, KinematicDefinition } from '../../kinematics/types';

interface ScrewsPanelProps {
  state: AppState;
  diagnostics: Diagnostic[];
  kin: KinematicDefinition;
  configSearch: string;
  searchTerm: string;
  showReference: boolean;
  showThread: boolean;
  onAddScrew: () => void;
}

export default function ScrewsPanel(props: ScrewsPanelProps) {
  const screwReferenceOption = () => screwReferenceOptions.find((option) => option.id === normalizeScrewReference(props.state.values.screw_reference)) ?? screwReferenceOptions[0];
  const disabled = () => !props.kin.supportsProbeFeatures || !props.state.values.probeFeaturesEnabled;
  const tooltip = () => {
    if (!props.kin.supportsProbeFeatures) return 'Screws tilt adjust is unavailable for the selected kinematics.';
    if (!props.state.values.probeFeaturesEnabled) return 'Enable Probe & Mesh before enabling [screws_tilt_adjust].';
    return 'Enable [screws_tilt_adjust] and include configured screw positions in printer.cfg.';
  };

  function fieldClass(id: string): string {
    const issues = props.diagnostics.filter((diagnostic) => diagnostic.field === id);
    if (issues.some((diagnostic) => diagnostic.type === 'error')) return 'field-error';
    if (issues.some((diagnostic) => diagnostic.type === 'warning')) return 'field-warning';
    return '';
  }

  function titleFor(id: string): string {
    return props.diagnostics
      .filter((diagnostic) => diagnostic.field === id)
      .map((diagnostic) => diagnostic.message)
      .join('\n');
  }

  return (
    <section class="panel">
      <SectionToggleTitle
        id="enable-screws-section"
        label="Screws"
        checked={!!props.state.values.screwsEnabled}
        disabled={disabled()}
        tooltip={tooltip()}
        onChange={(checked) => setValue('screwsEnabled', checked)}
      >
        <Show when={!props.searchTerm}><button type="button" class="btn btn-success btn-sm" onClick={props.onAddScrew}><Plus size={14} />Add</button></Show>
      </SectionToggleTitle>
      <div classList={{ 'disabled-block': disabled() || !props.state.values.screwsEnabled }}>
        <Show when={!props.searchTerm || props.showReference}>
          <div class="screw-reference-control">
            <label for="screw-reference">Input reference</label>
            <select id="screw-reference" class="select select-bordered select-sm w-full" value={normalizeScrewReference(props.state.values.screw_reference)} onChange={(event) => setValue('screw_reference', event.currentTarget.value)}>
              <For each={screwReferenceOptions}>{(option) => <option value={option.id}>{option.label}</option>}</For>
            </select>
            <p class="help">{screwReferenceOption().help} The generated .cfg is converted to Klipper nozzle/probe coordinates.</p>
          </div>
        </Show>
        <Show when={!props.searchTerm || props.showThread}>
          <div class="screw-thread-control">
            <label for="screw-thread">Screw thread</label>
            <input
              id="screw-thread"
              class={`input input-bordered input-sm w-full ${fieldClass('screw_thread')}`}
              title={titleFor('screw_thread')}
              type="text"
              list="screw-thread-options"
              value={String(props.state.values.screw_thread ?? '')}
              onInput={(event) => setValue('screw_thread', normalizeScrewThread(event.currentTarget.value))}
            />
            <datalist id="screw-thread-options">
              <For each={screwThreadOptions}>{(option) => <option value={option}>{option}</option>}</For>
            </datalist>
            <p class="help">Official suggestions are M3/M4/M5 with CW or CCW knob direction. Custom values are allowed here but may require manual Klipper review.</p>
          </div>
        </Show>
        <DynamicList state={props.state} type="screws" filterText={props.configSearch} />
        <p class="help">When enabled, generates [screws_tilt_adjust] positions using the current probe offset.</p>
      </div>
    </section>
  );
}
