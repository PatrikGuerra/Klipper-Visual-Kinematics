import { Show } from 'solid-js';
import { Copy, Download, FileText, PenLine, ShieldAlert } from 'lucide-solid';
import { updateMutable } from '../store';
import { getPrinterCfgText } from '../kinematics/configParser';
import Button from '../lib/components/ui/Button';
import Badge from '../lib/components/ui/Badge';
import type { AppState } from '../kinematics/types';

interface PrinterCfgPanelProps {
  state: AppState;
  generatedConfig: string;
}

export default function PrinterCfgPanel(props: PrinterCfgPanelProps) {
  const cfgText = () => getPrinterCfgText(props.state, props.generatedConfig);
  const sectionCount = () => (cfgText().match(/^\[[^\]]+\]/gm) ?? []).length;
  const lineCount = () => (cfgText() ? cfgText().split(/\r?\n/).length : 0);
  const status = () => (props.state.ui.printerCfgDirty ? 'Edited draft' : props.state.ui.printerCfgDiagnostics.length ? 'Parse warnings' : 'Synced');

  function openEditor(): void {
    updateMutable((draft) => {
      draft.ui.printerCfgModalOpen = true;
      if (!draft.ui.printerCfgDirty) draft.ui.printerCfgDraft = props.generatedConfig;
    });
  }

  async function copyConfig(): Promise<void> {
    const text = cfgText();
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
    const text = cfgText();
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'printer.cfg';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section class="printer-cfg-panel-content">
      <div class="cfg-panel-card">
        <div class="cfg-panel-icon" aria-hidden="true"><FileText size={20} /></div>
        <div>
          <h2>printer.cfg</h2>
          <p>{sectionCount()} section(s) / {lineCount()} line(s)</p>
        </div>
      </div>

      <div class="cfg-panel-status">
        <Badge variant={props.state.ui.printerCfgDirty || props.state.ui.printerCfgDiagnostics.length ? 'warning' : 'default'}>{status()}</Badge>
        <Show when={props.state.ui.unmanagedConfigText}><Badge variant="muted">Unmanaged</Badge></Show>
      </div>

      <div class="cfg-panel-actions-stack">
        <Button onClick={openEditor} className="w-full cfg-open-editor-button"><PenLine size={15} />Open editor</Button>
        <Button variant="secondary" onClick={copyConfig} className="w-full"><Copy size={15} />Copy</Button>
        <Button variant="outline" onClick={downloadConfig} className="w-full"><Download size={15} />Download .cfg</Button>
      </div>

      <div class="specific-note cfg-panel-note">
        <ShieldAlert size={15} />
        <span>Edits still happen in the modal, with supported sections applied back to the visual state.</span>
      </div>

      <pre class="cfg-mini-preview">{cfgText()}</pre>
    </section>
  );
}
