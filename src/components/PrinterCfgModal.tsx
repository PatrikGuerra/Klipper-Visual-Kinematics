import { createSignal, Show, For } from 'solid-js';
import { AlertTriangle, Check, Copy, Download, FileText, PenLine, RotateCcw, X } from 'lucide-solid';
import { updateMutable } from '../store';
import { applyConfigTextToState, getPrinterCfgText } from '../kinematics/configParser';
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
  const draft = () => getPrinterCfgText(props.state, props.generatedConfig);
  const status = () => (props.state.ui.printerCfgDirty ? 'Edited' : props.state.ui.printerCfgDiagnostics.length ? 'Parse warnings' : 'Synced');
  const sectionCount = () => (draft().match(/^\[[^\]]+\]/gm) ?? []).length;
  const lineCount = () => (draft() ? draft().split(/\r?\n/).length : 0);
  const diagnosticCount = () => props.state.ui.printerCfgDiagnostics.length;
  const preservedLineCount = () =>
    Object.values(props.state.ui.configLineOverrides ?? {}).reduce((total, section) => total + Object.keys(section).length, 0) +
    Object.values(props.state.ui.configExtraLines ?? {}).reduce((total, lines) => total + lines.length, 0);

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
      const sourceText = getPrinterCfgText(draftState, props.generatedConfig);
      const result = applyConfigTextToState(sourceText, draftState);
      draftState.ui.unmanagedConfigText = result.unmanagedConfigText;
      draftState.ui.configLineOverrides = result.configLineOverrides;
      draftState.ui.configExtraLines = result.configExtraLines;
      draftState.ui.printerCfgDiagnostics = result.diagnostics;
      const macro = draftState.macros.find((item) => item.id === draftState.activeMacroId);
      if (macro) draftState.macroPreview = simulateMacro(macro, draftState);
      draftState.ui.printerCfgDraft = '';
      draftState.ui.printerCfgDirty = false;
    });
    setTab('diagnostics');
  }

  async function copyConfig(): Promise<void> {
    const text = draft();
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
    const text = draft();
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
          <div class="cfg-modal-title">
            <div class="cfg-modal-title-icon" aria-hidden="true"><FileText size={18} /></div>
            <div>
              <h2>printer.cfg editor</h2>
              <p>Preview, edit, apply supported sections back to the visual state, then copy or download.</p>
            </div>
          </div>
          <div class="cfg-modal-actions">
            <Badge variant={props.state.ui.printerCfgDirty || props.state.ui.printerCfgDiagnostics.length ? 'warning' : 'default'}>{status()}</Badge>
            <Show when={props.state.ui.unmanagedConfigText}><Badge variant="muted">Unsupported sections</Badge></Show>
            <Show when={preservedLineCount() > 0}><Badge variant="muted">Preserved lines</Badge></Show>
            <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
          </div>
        </header>

        <div class="cfg-modal-summary">
          <div><span>{sectionCount()}</span><small>sections</small></div>
          <div><span>{lineCount()}</span><small>lines</small></div>
          <div><span>{diagnosticCount()}</span><small>diagnostics</small></div>
          <div><span>{preservedLineCount()}</span><small>preserved</small></div>
        </div>

        <div class="cfg-tabs">
          <button type="button" classList={{ active: tab() === 'preview' }} onClick={() => setTab('preview')}><FileText size={14} />Preview</button>
          <button type="button" classList={{ active: tab() === 'edit' }} onClick={() => setTab('edit')}><PenLine size={14} />Edit</button>
          <button type="button" classList={{ active: tab() === 'diagnostics' }} onClick={() => setTab('diagnostics')}><AlertTriangle size={14} />Diagnostics</button>
        </div>

        <div class="cfg-modal-body">
          <Show when={tab() === 'preview'}>
            <div class="cfg-editor-shell">
              <div class="cfg-editor-toolbar">
                <span>{props.state.ui.printerCfgDirty ? 'Previewing edited draft' : 'Previewing generated config'}</span>
                <Show when={props.state.ui.printerCfgDirty}><Badge variant="warning">Manual edits pending</Badge></Show>
              </div>
              <pre class="cfg-editor readonly">{draft()}</pre>
            </div>
          </Show>
          <Show when={tab() === 'edit'}>
            <div class="cfg-editor-shell">
              <div class="cfg-editor-toolbar">
                <span>Manual cfg draft</span>
                <span class="cfg-editor-hint">Apply only updates supported visual sections; unmanaged config is preserved.</span>
              </div>
              <textarea class="cfg-editor" spellcheck={false} value={draft()} onInput={(event) => edit(event.currentTarget.value)} />
            </div>
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
          <div class="cfg-modal-footer-note">
            <Show when={props.state.ui.printerCfgDirty} fallback={<span>Visual changes are synced into this config.</span>}>
              <span>Manual cfg draft is active. Reset to resume automatic sync.</span>
            </Show>
          </div>
          <div class="cfg-modal-footer-actions">
            <Button variant="success" onClick={applyToVisual}><Check size={15} />Apply to Visual</Button>
            <Button variant="warning" onClick={resetFromVisual}><RotateCcw size={15} />Reset</Button>
            <Button variant="secondary" onClick={copyConfig}><Copy size={15} />Copy</Button>
            <Button onClick={downloadConfig}><Download size={15} />Download .cfg</Button>
          </div>
        </footer>
      </section>
    </Show>
  );
}
