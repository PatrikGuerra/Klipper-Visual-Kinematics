import { Show } from 'solid-js';
import { Search, X } from 'lucide-solid';

interface ConfigSearchPanelProps {
  value: string;
  matchCount: number;
  onInput: (value: string) => void;
}

export default function ConfigSearchPanel(props: ConfigSearchPanelProps) {
  return (
    <section class="panel config-search-panel">
      <div class="panel-title"><span>Search config fields</span></div>
      <div class="config-search">
        <div class="search-input-row">
          <Search size={15} />
          <input id="config-search" type="text" placeholder="mesh, probe, velocity, stepper..." value={props.value} onInput={(event) => props.onInput(event.currentTarget.value)} />
          <Show when={props.value}><button type="button" class="ghost search-clear" aria-label="Clear config search" onClick={() => props.onInput('')}><X size={14} /></button></Show>
        </div>
        <Show when={props.value.trim()}><p class="help">{props.matchCount} matching config item(s)</p></Show>
      </div>
    </section>
  );
}
