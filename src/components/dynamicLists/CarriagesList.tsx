import { For, Show } from 'solid-js';
import { Trash2 } from 'lucide-solid';
import { updateMutable } from '../../store';
import { matchesFilter, normalizeFilter, numberFromInput } from './listUtils';
import type { AppState, Carriage } from '../../kinematics/types';

interface CarriagesListProps {
  state: AppState;
  filterText?: string;
}

export default function CarriagesList(props: CarriagesListProps) {
  const visible = () => !!normalizeFilter(props.filterText);
  const entries = () => props.state.carriages.map((value, index) => ({ value, index })).filter(({ value }) => carriageMatches(value));

  function matches(...parts: unknown[]): boolean {
    return matchesFilter(props.filterText, ...parts);
  }

  function carriageMatches(_carriage: Carriage): boolean {
    return matches('Name', 'carriage_name') || matches('Axis', 'axis') || matches('Min', 'position_min') || matches('Max', 'position_max') || matches('Endstop', 'position_endstop');
  }

  function remove(index: number): void {
    updateMutable((draft) => {
      if (draft.carriages.length > 3) draft.carriages.splice(index, 1);
    });
  }

  function update(index: number, key: keyof Carriage, value: string): void {
    updateMutable((draft) => {
      if (key === 'name' || key === 'axis') draft.carriages[index][key] = value;
      else draft.carriages[index][key] = numberFromInput(value);
    });
  }

  return (
    <For each={entries()}>
      {({ value: carriage, index }) => (
        <div classList={{ filtered: visible() }} class="list-row carriage-row">
          <Show when={matches('Name', 'carriage_name')}><div><label>Name<input class="input input-bordered input-sm w-full" type="text" value={carriage.name} onInput={(event) => update(index, 'name', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Axis', 'axis')}><div><label>Axis<input class="input input-bordered input-sm w-full" type="text" value={carriage.axis} onInput={(event) => update(index, 'axis', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Min', 'position_min')}><div><label>Min<input class="input input-bordered input-sm w-full" type="number" value={carriage.min} onInput={(event) => update(index, 'min', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Max', 'position_max')}><div><label>Max<input class="input input-bordered input-sm w-full" type="number" value={carriage.max} onInput={(event) => update(index, 'max', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Endstop', 'position_endstop')}><div><label>Endstop<input class="input input-bordered input-sm w-full" type="number" value={carriage.endstop} onInput={(event) => update(index, 'endstop', event.currentTarget.value)} /></label></div></Show>
          <Show when={!visible()}><button type="button" class="btn btn-error btn-sm" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
        </div>
      )}
    </For>
  );
}
