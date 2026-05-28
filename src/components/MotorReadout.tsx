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
        <section class="panel motor-readout-panel">
          <div class="panel-title"><span>Motor / Stepper Positions</span></div>
          <div class="motor-readout">
            <For each={props.rows}>{(row) => <div class="motor-line"><span>{row.label}</span><strong>{row.value}</strong></div>}</For>
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
