import { For, Show } from 'solid-js';
import { Trash2 } from 'lucide-solid';
import { updateMutable } from '../../store';
import { matchesFilter, normalizeFilter, numberFromInput } from './listUtils';
import type { AppState, Winch } from '../../kinematics/types';

interface WinchesListProps {
  state: AppState;
  filterText?: string;
}

export default function WinchesList(props: WinchesListProps) {
  const visible = () => !!normalizeFilter(props.filterText);
  const entries = () => props.state.winches.map((value, index) => ({ value, index })).filter(({ value }) => winchMatches(value));

  function matches(...parts: unknown[]): boolean {
    return matchesFilter(props.filterText, ...parts);
  }

  function winchMatches(_winch: Winch): boolean {
    return matches('Name', 'winch_name') || matches('Anchor X', 'anchor_x') || matches('Anchor Y', 'anchor_y') || matches('Anchor Z', 'anchor_z') || matches('Rot dist', 'rotation_distance');
  }

  function remove(index: number): void {
    updateMutable((draft) => {
      if (draft.winches.length > 3) draft.winches.splice(index, 1);
    });
  }

  function update(index: number, key: keyof Winch, value: string): void {
    updateMutable((draft) => {
      if (key === 'name') draft.winches[index].name = value;
      else draft.winches[index][key] = numberFromInput(value);
    });
  }

  return (
    <For each={entries()}>
      {({ value: winch, index }) => (
        <div classList={{ filtered: visible() }} class="list-row winch-row">
          <Show when={matches('Name', 'winch_name')}><div><label>Name<input type="text" value={winch.name} onInput={(event) => update(index, 'name', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Anchor X', 'anchor_x')}><div><label>Anchor X<input type="number" value={winch.x} onInput={(event) => update(index, 'x', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Anchor Y', 'anchor_y')}><div><label>Anchor Y<input type="number" value={winch.y} onInput={(event) => update(index, 'y', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Anchor Z', 'anchor_z')}><div><label>Anchor Z<input type="number" value={winch.z} onInput={(event) => update(index, 'z', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Rot dist', 'rotation_distance')}><div><label>Rot dist<input type="number" value={winch.rotation_distance} onInput={(event) => update(index, 'rotation_distance', event.currentTarget.value)} /></label></div></Show>
          <Show when={!visible()}><button type="button" class="danger" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
        </div>
      )}
    </For>
  );
}
