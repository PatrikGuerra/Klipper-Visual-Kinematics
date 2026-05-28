import { For, Show } from 'solid-js';
import type { Diagnostic } from '../kinematics/types';

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
}

export default function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  return (
    <section class="panel">
      <div class="panel-title"><span>Errors / Warnings</span></div>
      <div class="diagnostics-list">
        <Show when={props.diagnostics.length > 0} fallback={<div class="diagnostic info">INFO: No diagnostics.</div>}>
          <For each={props.diagnostics}>
            {(item) => (
              <div class={`diagnostic ${item.type}`}>
                {item.type.toUpperCase()}: {item.field ? <span class="diagnostic-field">{item.field}</span> : null}
                {item.message}
              </div>
            )}
          </For>
        </Show>
      </div>
    </section>
  );
}
