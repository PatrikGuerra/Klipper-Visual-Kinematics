import { For, Show } from 'solid-js';
import type { Diagnostic } from '../kinematics/types';

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
}

export default function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  function alertClass(type: Diagnostic['type']): string {
    if (type === 'error') return 'alert alert-error';
    if (type === 'warning') return 'alert alert-warning';
    return 'alert alert-info';
  }

  return (
    <section class="card min-h-0 overflow-auto border border-base-300 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-3">
        <h2 class="card-title text-sm">Errors / Warnings</h2>
        <Show when={props.diagnostics.length > 0} fallback={<div class="alert alert-info py-2 text-xs">INFO: No diagnostics.</div>}>
          <For each={props.diagnostics}>
            {(item) => (
              <div class={`${alertClass(item.type)} py-2 text-xs`}>
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
