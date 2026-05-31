import { For } from 'solid-js';
import { RotateCcw } from 'lucide-solid';
import { kinematicsCatalog } from '../../kinematics/catalog';
import { resetState, setValue } from '../../store';
import type { KinematicDefinition } from '../../kinematics/types';

interface KinematicsSelectorPanelProps {
  selectedId: string;
  kin: KinematicDefinition;
}

export default function KinematicsSelectorPanel(props: KinematicsSelectorPanelProps) {
  return (
    <section class="panel">
      <div class="panel-title">
        <span>Kinematics</span>
        <button type="button" class="btn btn-warning btn-sm" onClick={resetState}><RotateCcw size={14} />Reset</button>
      </div>
      <label for="kinematics">Motion model</label>
      <select id="kinematics" class="select select-bordered select-sm w-full" value={props.selectedId} onChange={(event) => setValue('kinematics', event.currentTarget.value)}>
        <For each={kinematicsCatalog}>{(option) => <option value={option.id}>{option.name} ({option.id})</option>}</For>
      </select>
      <p class="help">{props.kin.note}</p>
    </section>
  );
}
