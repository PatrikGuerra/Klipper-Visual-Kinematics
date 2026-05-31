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
  const tabButtonClass = (name: 'preview' | 'edit' | 'diagnostics') => (tab() === name ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm');

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
      <section class="modal modal-open" role="dialog" aria-modal="true" aria-label="printer.cfg">
        <div class="modal-box flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[min(1120px,calc(100vw-1rem))] max-w-6xl flex-col overflow-hidden p-0">
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 px-5 py-4 max-md:flex-col max-md:items-stretch">
            <div class="flex min-w-0 items-start gap-3">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-box border border-primary/20 bg-primary/10 text-primary" aria-hidden="true"><FileText size={18} /></div>
              <div class="min-w-0">
                <h2 class="m-0 text-base font-extrabold leading-tight">printer.cfg editor</h2>
                <p class="mt-1 text-sm leading-snug opacity-70">Preview, edit, apply supported sections back to the visual state, then copy or download.</p>
              </div>
            </div>
            <div class="flex min-w-0 flex-wrap items-center justify-end gap-2 max-md:justify-start">
              <Badge variant={props.state.ui.printerCfgDirty || props.state.ui.printerCfgDiagnostics.length ? 'warning' : 'default'}>{status()}</Badge>
              <Show when={props.state.ui.unmanagedConfigText}><Badge variant="muted">Unsupported sections</Badge></Show>
              <Show when={preservedLineCount() > 0}><Badge variant="muted">Preserved lines</Badge></Show>
              <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
            </div>
          </header>

          <div class="grid shrink-0 grid-cols-2 gap-2 border-b border-base-300 bg-base-200 px-5 py-3 md:grid-cols-4">
            <div class="stat min-h-0 rounded-box border border-base-300 bg-base-100 px-3 py-2"><div class="stat-value text-base">{sectionCount()}</div><div class="stat-desc font-bold uppercase">sections</div></div>
            <div class="stat min-h-0 rounded-box border border-base-300 bg-base-100 px-3 py-2"><div class="stat-value text-base">{lineCount()}</div><div class="stat-desc font-bold uppercase">lines</div></div>
            <div class="stat min-h-0 rounded-box border border-base-300 bg-base-100 px-3 py-2"><div class="stat-value text-base">{diagnosticCount()}</div><div class="stat-desc font-bold uppercase">diagnostics</div></div>
            <div class="stat min-h-0 rounded-box border border-base-300 bg-base-100 px-3 py-2"><div class="stat-value text-base">{preservedLineCount()}</div><div class="stat-desc font-bold uppercase">preserved</div></div>
          </div>

          <div class="shrink-0 border-b border-base-300 bg-base-100 px-5 py-3">
            <div class="cfg-modal-tabbar">
              <button type="button" class={tabButtonClass('preview')} onClick={() => setTab('preview')}><FileText size={14} />Preview</button>
              <button type="button" class={tabButtonClass('edit')} onClick={() => setTab('edit')}><PenLine size={14} />Edit</button>
              <button type="button" class={tabButtonClass('diagnostics')} onClick={() => setTab('diagnostics')}><AlertTriangle size={14} />Diagnostics</button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-hidden bg-base-200 p-4">
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
                <textarea class="cfg-editor textarea" spellcheck={false} value={draft()} onInput={(event) => edit(event.currentTarget.value)} />
              </div>
            </Show>
            <Show when={tab() === 'diagnostics'}>
              <div class="cfg-diagnostics">
                <Show when={props.state.ui.printerCfgDiagnostics.length > 0} fallback={<div class="alert alert-info py-2 text-xs">INFO: No parser diagnostics from the last apply.</div>}>
                  <For each={props.state.ui.printerCfgDiagnostics}>{(item) => <div class={`alert ${item.type === 'error' ? 'alert-error' : item.type === 'warning' ? 'alert-warning' : 'alert-info'} py-2 text-xs`}>{item.type.toUpperCase()}: {item.message}</div>}</For>
                </Show>
                <Show when={props.state.ui.unmanagedConfigText}>
                  <div class="alert alert-warning py-2 text-xs">WARNING: Unsupported sections are preserved under unmanaged user config.</div>
                </Show>
              </div>
            </Show>
          </div>

          <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-5 py-3 max-md:flex-col max-md:items-stretch">
            <div class="text-xs font-semibold opacity-70">
              <Show when={props.state.ui.printerCfgDirty} fallback={<span>Visual changes are synced into this config.</span>}>
                <span>Manual cfg draft is active. Reset to resume automatic sync.</span>
              </Show>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <Button variant="success" onClick={applyToVisual}><Check size={15} />Apply to Visual</Button>
              <Button variant="warning" onClick={resetFromVisual}><RotateCcw size={15} />Reset</Button>
              <Button variant="secondary" onClick={copyConfig}><Copy size={15} />Copy</Button>
              <Button onClick={downloadConfig}><Download size={15} />Download .cfg</Button>
            </div>
          </footer>
        </div>
        <form method="dialog" class="modal-backdrop" onClick={close}>
          <button type="button" class="modal-close-button">close</button>
        </form>
      </section>
    </Show>
  );
}
