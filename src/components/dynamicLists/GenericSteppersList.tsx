import { For, Show } from 'solid-js';
import { Trash2 } from 'lucide-solid';
import { updateMutable } from '../../store';
import { matchesFilter, normalizeFilter } from './listUtils';
import type { AppState, GenericStepper } from '../../kinematics/types';

interface GenericSteppersListProps {
  state: AppState;
  filterText?: string;
}

export default function GenericSteppersList(props: GenericSteppersListProps) {
  const visible = () => !!normalizeFilter(props.filterText);
  const entries = () => props.state.genericSteppers.map((value, index) => ({ value, index })).filter(({ value }) => genericStepperMatches(value));

  function matches(...parts: unknown[]): boolean {
    return matchesFilter(props.filterText, ...parts);
  }

  function genericStepperMatches(_stepper: GenericStepper): boolean {
    return matches('Name', 'stepper_name') || matches('Carriages', 'carriages') || matches('Equation', 'equation');
  }

  function remove(index: number): void {
    updateMutable((draft) => {
      if (draft.genericSteppers.length > 1) draft.genericSteppers.splice(index, 1);
    });
  }

  function update(index: number, key: keyof GenericStepper, value: string): void {
    updateMutable((draft) => {
      draft.genericSteppers[index][key] = value;
    });
  }

  return (
    <For each={entries()}>
      {({ value: stepper, index }) => (
        <div classList={{ filtered: visible() }} class="list-row stepper-row">
          <Show when={matches('Name', 'stepper_name')}><div><label>Name<input class="input input-bordered input-sm w-full" type="text" value={stepper.name} onInput={(event) => update(index, 'name', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Carriages', 'carriages')}><div><label>Carriages<input class="input input-bordered input-sm w-full" type="text" value={stepper.carriages} onInput={(event) => update(index, 'carriages', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Equation', 'equation')}><div><label>Equation<input class="input input-bordered input-sm w-full" type="text" value={stepper.equation} onInput={(event) => update(index, 'equation', event.currentTarget.value)} /></label></div></Show>
          <Show when={!visible()}><button type="button" class="btn btn-error btn-sm" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
        </div>
      )}
    </For>
  );
}
