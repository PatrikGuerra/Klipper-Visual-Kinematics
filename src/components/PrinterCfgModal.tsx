import { createSignal, Show, For } from 'solid-js';
import { Check, Copy, Download, RotateCcw, X } from 'lucide-solid';
import { updateMutable } from '../store';
import { applyConfigTextToState } from '../kinematics/configParser';
import { simulateMacro } from '../macros/simulator';
import Button from '../lib/components/ui/Button';
import Badge from '../lib/components/ui/Badge';
import type { AppState } from '../kinematics/types';

interface PrinterCfgModalProps {
  state: AppState;
  generatedConfig: string;
}

export default function PrinterCfgModal(props: PrinterCfgModalProps) {
  const [tab, setTab] = createSignal<'preview' | 'edit' | 'diagnostics'>('preview');
  const draft = () => (props.state.ui.printerCfgDirty ? props.state.ui.printerCfgDraft : props.generatedConfig);
  const status = () => (props.state.ui.printerCfgDirty ? 'Edited' : props.state.ui.printerCfgDiagnostics.length ? 'Parse warnings' : 'Synced');

  function close(): void {
    updateMutable((draftState) => {
      draftState.ui.printerCfgModalOpen = false;
    });
  }

  function edit(value: string): void {
    updateMutable((draftState) => {
      draftState.ui.printerCfgDraft = value;
      draftState.ui.printerCfgDirty = true;
    });
  }

  function resetFromVisual(): void {
    updateMutable((draftState) => {
      draftState.ui.printerCfgDraft = props.generatedConfig;
      draftState.ui.printerCfgDirty = false;
      draftState.ui.printerCfgDiagnostics = [];
    });
    setTab('preview');
  }

  function applyToVisual(): void {
    updateMutable((draftState) => {
      const result = applyConfigTextToState(draftState.ui.printerCfgDraft || props.generatedConfig, draftState);
      draftState.ui.unmanagedConfigText = result.unmanagedConfigText;
      draftState.ui.printerCfgDiagnostics = result.diagnostics;
      const macro = draftState.macros.find((item) => item.id === draftState.activeMacroId);
      if (macro) draftState.macroPreview = simulateMacro(macro, draftState);
      draftState.ui.printerCfgDraft = '';
      draftState.ui.printerCfgDirty = false;
    });
    setTab('diagnostics');
  }

  async function copyConfig(): Promise<void> {
    const text = props.state.ui.printerCfgDirty ? props.state.ui.printerCfgDraft : props.generatedConfig;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  }

  function downloadConfig(): void {
    const text = props.state.ui.printerCfgDirty ? props.state.ui.printerCfgDraft : props.generatedConfig;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'printer.cfg';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <Show when={props.state.ui.printerCfgModalOpen}>
      <div class="cfg-modal-backdrop" onClick={close} aria-hidden="true" />
      <section class="cfg-modal" role="dialog" aria-modal="true" aria-label="printer.cfg">
        <header class="cfg-modal-header">
          <div>
            <h2>printer.cfg</h2>
            <p>Preview, edit, apply to visual state, copy, or download the generated config.</p>
          </div>
          <div class="cfg-modal-actions">
            <Badge variant={props.state.ui.printerCfgDirty || props.state.ui.printerCfgDiagnostics.length ? 'warning' : 'default'}>{status()}</Badge>
            <Show when={props.state.ui.unmanagedConfigText}><Badge variant="muted">Unsupported sections</Badge></Show>
            <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
          </div>
        </header>

        <div class="cfg-tabs">
          <button type="button" classList={{ active: tab() === 'preview' }} onClick={() => setTab('preview')}>Preview</button>
          <button type="button" classList={{ active: tab() === 'edit' }} onClick={() => setTab('edit')}>Edit</button>
          <button type="button" classList={{ active: tab() === 'diagnostics' }} onClick={() => setTab('diagnostics')}>Diagnostics</button>
        </div>

        <div class="cfg-modal-body">
          <Show when={tab() === 'preview'}>
            <pre class="cfg-editor readonly">{props.generatedConfig}</pre>
          </Show>
          <Show when={tab() === 'edit'}>
            <textarea class="cfg-editor" spellcheck={false} value={draft()} onInput={(event) => edit(event.currentTarget.value)} />
          </Show>
          <Show when={tab() === 'diagnostics'}>
            <div class="cfg-diagnostics">
              <Show when={props.state.ui.printerCfgDiagnostics.length > 0} fallback={<div class="diagnostic info">INFO: No parser diagnostics from the last apply.</div>}>
                <For each={props.state.ui.printerCfgDiagnostics}>{(item) => <div class={`diagnostic ${item.type}`}>{item.type.toUpperCase()}: {item.message}</div>}</For>
              </Show>
              <Show when={props.state.ui.unmanagedConfigText}>
                <div class="diagnostic warning">WARNING: Unsupported sections are preserved under unmanaged user config.</div>
              </Show>
            </div>
          </Show>
        </div>

        <footer class="cfg-modal-footer">
          <Button variant="success" onClick={applyToVisual}><Check size={15} />Apply to Visual</Button>
          <Button variant="warning" onClick={resetFromVisual}><RotateCcw size={15} />Reset from Visual</Button>
          <Button variant="secondary" onClick={copyConfig}><Copy size={15} />Copy</Button>
          <Button onClick={downloadConfig}><Download size={15} />Download .cfg</Button>
        </footer>
      </section>
    </Show>
  );
}
