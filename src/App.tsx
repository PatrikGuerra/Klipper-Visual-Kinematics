import { createMemo } from 'solid-js';
import { Info, Link } from 'lucide-solid';
import { appState, persistAppState, syncShareUrl, updateMutable } from './store';
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
import ShareModal from './components/ShareModal';
import AboutModal from './components/AboutModal';
import PanelDock, { type PanelDockItem } from './components/PanelDock';
import Button from './lib/components/ui/Button';

export default function App() {
  persistAppState();
  syncShareUrl();

  const diagnostics = createMemo(() => [...validateState(appState), ...validateMacros(appState)]);
  const motorRows = createMemo(() => getMotorReadout(appState));
  const macroConfig = createMemo(() => generateMacrosConfig(appState.macros));
  const generatedConfig = createMemo(() => appendUnmanagedConfig([generateConfig(appState), macroConfig()].filter(Boolean).join('\n\n'), String(appState.ui.unmanagedConfigText || '')));
  const dockPanels = createMemo<PanelDockItem[]>(() => [
    { id: 'kinematics', title: 'Kinematics', content: <KinematicsPanel state={appState} diagnostics={diagnostics()} /> },
    { id: 'macros', title: 'Macro Editor', content: <MacroPanel state={appState} vertical /> },
    { id: 'printerCfg', title: 'printer.cfg', content: <PrinterCfgPanel state={appState} generatedConfig={generatedConfig()} /> }
  ]);

  return (
    <div data-theme="klipper">
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div>
            <div class="header-title-row">
              <h1>Klipper Visual Kinematics</h1>
              <Button variant="outline" size="sm" onClick={() => updateMutable((draft) => (draft.ui.aboutModalOpen = true))}><Info size={14} />About</Button>
              <Button variant="outline" size="sm" onClick={() => updateMutable((draft) => (draft.ui.shareModalOpen = true))}><Link size={14} />Share</Button>
            </div>
            <p>Visualize motion models, validate reach, and generate positioning config sections.</p>
          </div>
        </div>
      </header>

      <PanelDock
        panels={dockPanels()}
        state={appState.ui.dockPanels}
        workspace={
          <section class="workspace">
            <VisualizerCanvas state={appState} />
            <div class="lower-grid">
              <MotorReadout rows={motorRows()} />
              <DiagnosticsPanel diagnostics={diagnostics()} />
            </div>
          </section>
        }
      />

      <PrinterCfgModal state={appState} generatedConfig={generatedConfig()} />
      <AboutModal state={appState} />
      <ShareModal state={appState} />
    </div>
  );
}
