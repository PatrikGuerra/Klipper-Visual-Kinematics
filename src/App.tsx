import { createMemo, onCleanup } from 'solid-js';
import { appState, persistAppState, updateMutable } from './store';
import { validateState } from './kinematics/validators';
import { getMotorReadout } from './kinematics/transforms';
import { generateConfig } from './kinematics/configGenerator';
import { appendUnmanagedConfig } from './kinematics/configParser';
import { generateMacrosConfig } from './macros/configGenerator';
import { validateMacros } from './macros/validators';
import KinematicsPanel from './components/KinematicsPanel';
import VisualizerCanvas from './components/VisualizerCanvas';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import MotorReadout from './components/MotorReadout';
import MacroPanel from './components/MacroPanel';
import PrinterCfgPanel from './components/PrinterCfgPanel';
import PrinterCfgModal from './components/PrinterCfgModal';

type PanelId = 'kinematics' | 'macros' | 'printerCfg';

export default function App() {
  persistAppState();

  const diagnostics = createMemo(() => [...validateState(appState), ...validateMacros(appState)]);
  const motorRows = createMemo(() => getMotorReadout(appState));
  const macroConfig = createMemo(() => generateMacrosConfig(appState.macros));
  const generatedConfig = createMemo(() => appendUnmanagedConfig([generateConfig(appState), macroConfig()].filter(Boolean).join('\n\n'), String(appState.ui.unmanagedConfigText || '')));
  const errorCount = createMemo(() => diagnostics().filter((diagnostic) => diagnostic.type === 'error').length);
  const warningCount = createMemo(() => diagnostics().filter((diagnostic) => diagnostic.type === 'warning').length);
  const kinematicsWidth = createMemo(() => panelWidth(appState.ui.kinematicsPanelCollapsed, Number(appState.ui.kinematicsPanelWidth), 360, 280, 760));
  const macrosWidth = createMemo(() => panelWidth(appState.ui.macrosPanelCollapsed, Number(appState.ui.macrosPanelWidth), 430, 320, 860));
  const printerCfgWidth = createMemo(() => panelWidth(appState.ui.printerCfgPanelCollapsed, Number(appState.ui.printerCfgPanelWidth), 240, 180, 420));

  let resizingPanel: PanelId | null = null;

  onCleanup(stopResize);

  function panelWidth(collapsed: boolean, savedWidth: number, fallbackWidth: number, min: number, max: number): number {
    if (collapsed) return 44;
    return clamp(savedWidth || fallbackWidth, min, max);
  }

  function togglePanel(panel: PanelId): void {
    updateMutable((draft) => {
      if (panel === 'kinematics') {
        draft.ui.kinematicsPanelCollapsed = !draft.ui.kinematicsPanelCollapsed;
        if (!draft.ui.kinematicsPanelCollapsed) draft.ui.kinematicsPanelExpanded = false;
      } else if (panel === 'macros') {
        draft.ui.macrosPanelCollapsed = !draft.ui.macrosPanelCollapsed;
        draft.macroRun.playing = false;
        if (!draft.ui.macrosPanelCollapsed) draft.ui.macrosPanelExpanded = false;
      } else {
        draft.ui.printerCfgPanelCollapsed = !draft.ui.printerCfgPanelCollapsed;
      }
    });
  }

  function startResize(panel: PanelId, event: MouseEvent): void {
    event.preventDefault();
    resizingPanel = panel;
    document.body.classList.add('resizing-panels');
    window.addEventListener('mousemove', resizePanel);
    window.addEventListener('mouseup', stopResize);
  }

  function resizePanel(event: MouseEvent): void {
    if (!resizingPanel) return;
    updateMutable((draft) => {
      if (resizingPanel === 'kinematics') {
        draft.ui.kinematicsPanelCollapsed = false;
        draft.ui.kinematicsPanelExpanded = false;
        draft.ui.kinematicsPanelWidth = clamp(event.clientX, 280, 760);
      } else if (resizingPanel === 'macros') {
        draft.ui.macrosPanelCollapsed = false;
        draft.ui.macrosPanelExpanded = false;
        draft.ui.macrosPanelWidth = clamp(event.clientX - kinematicsWidth(), 320, 860);
      } else {
        draft.ui.printerCfgPanelCollapsed = false;
        draft.ui.printerCfgPanelWidth = clamp(event.clientX - kinematicsWidth() - macrosWidth(), 180, 420);
      }
    });
  }

  function stopResize(): void {
    resizingPanel = null;
    document.body.classList.remove('resizing-panels');
    window.removeEventListener('mousemove', resizePanel);
    window.removeEventListener('mouseup', stopResize);
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  return (
    <>
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div>
            <h1>Klipper Visual Kinematics</h1>
            <p>Visualize motion models, validate reach, and generate positioning config sections.</p>
          </div>
        </div>
        <MotorReadout rows={motorRows()} compact />
      </header>

      <main
        classList={{
          'output-collapsed': appState.ui.outputCollapsed,
          'kinematics-collapsed': appState.ui.kinematicsPanelCollapsed,
          'macros-collapsed': appState.ui.macrosPanelCollapsed,
          'printer-cfg-collapsed': appState.ui.printerCfgPanelCollapsed
        }}
        class="app-layout"
        style={`--kinematics-panel-width: ${kinematicsWidth()}px; --macros-panel-width: ${macrosWidth()}px; --printer-cfg-panel-width: ${printerCfgWidth()}px;`}
      >
        <aside classList={{ collapsed: appState.ui.kinematicsPanelCollapsed }} class="vertical-panel kinematics-vertical-panel">
          <div class="vertical-panel-header">
            <button type="button" class="vertical-panel-title-button" aria-expanded={!appState.ui.kinematicsPanelCollapsed} onClick={() => togglePanel('kinematics')}>Kinematics</button>
          </div>
          {appState.ui.kinematicsPanelCollapsed ? (
            <button type="button" class="panel-rail-button" onClick={() => togglePanel('kinematics')}>Kinematics</button>
          ) : (
            <>
              <KinematicsPanel state={appState} diagnostics={diagnostics()} />
              <button type="button" class="resize-handle resize-handle-right" aria-label="Resize Kinematics panel" onMouseDown={(event) => startResize('kinematics', event)}></button>
            </>
          )}
        </aside>

        <aside classList={{ collapsed: appState.ui.macrosPanelCollapsed }} class="vertical-panel macros-vertical-panel">
          <div class="vertical-panel-header">
            <button type="button" class="vertical-panel-title-button" aria-expanded={!appState.ui.macrosPanelCollapsed} onClick={() => togglePanel('macros')}>Macro Editor</button>
          </div>
          {appState.ui.macrosPanelCollapsed ? (
            <button type="button" class="panel-rail-button" onClick={() => togglePanel('macros')}>Macro Editor</button>
          ) : (
            <>
              <MacroPanel state={appState} vertical />
              <button type="button" class="resize-handle resize-handle-right" aria-label="Resize Macro Editor panel" onMouseDown={(event) => startResize('macros', event)}></button>
            </>
          )}
        </aside>

        <aside classList={{ collapsed: appState.ui.printerCfgPanelCollapsed }} class="vertical-panel printer-cfg-vertical-panel">
          <div class="vertical-panel-header">
            <button type="button" class="vertical-panel-title-button" aria-expanded={!appState.ui.printerCfgPanelCollapsed} onClick={() => togglePanel('printerCfg')}>printer.cfg</button>
          </div>
          {appState.ui.printerCfgPanelCollapsed ? (
            <button type="button" class="panel-rail-button" onClick={() => togglePanel('printerCfg')}>printer.cfg</button>
          ) : (
            <>
              <PrinterCfgPanel state={appState} generatedConfig={generatedConfig()} />
              <button type="button" class="resize-handle resize-handle-right" aria-label="Resize printer.cfg panel" onMouseDown={(event) => startResize('printerCfg', event)}></button>
            </>
          )}
        </aside>

        <section class="workspace">
          <div class="status-row">
            <span classList={{ error: errorCount() > 0, warn: errorCount() === 0 && warningCount() > 0 }} class="pill">
              {errorCount() > 0 ? `${errorCount()} error(s)` : warningCount() > 0 ? `${warningCount()} warning(s)` : 'Ready'}
            </span>
          </div>
          <VisualizerCanvas state={appState} />
          <div class="lower-grid">
            <MotorReadout rows={motorRows()} />
            <DiagnosticsPanel diagnostics={diagnostics()} />
          </div>
        </section>
      </main>

      <PrinterCfgModal state={appState} generatedConfig={generatedConfig()} />
    </>
  );
}
