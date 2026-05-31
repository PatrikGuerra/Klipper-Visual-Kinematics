import { For, Show } from 'solid-js';
import type { MotorReadoutRow } from '../kinematics/types';

interface MotorReadoutProps {
  rows: MotorReadoutRow[];
  compact?: boolean;
}

export default function MotorReadout(props: MotorReadoutProps) {
  return (
    <Show
      when={props.compact}
      fallback={
        <section class="card min-h-0 overflow-auto border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body gap-3 p-3">
            <h2 class="card-title text-sm">Motor / Stepper Positions</h2>
            <div class="grid gap-2 text-xs">
              <For each={props.rows}>
                {(row) => (
                  <div class="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200 px-3 py-2">
                    <span class="font-bold opacity-70">{row.label}</span>
                    <strong class="font-mono text-[0.72rem]">{row.value}</strong>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>
      }
    >
      <section class="header-readout" aria-label="Motor / Stepper Readout">
        <div class="header-readout-title">Motor / Stepper</div>
        <div class="header-readout-grid">
          <For each={props.rows}>
            {(row) => (
              <div class="header-motor-line">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            )}
          </For>
        </div>
      </section>
    </Show>
  );
}
