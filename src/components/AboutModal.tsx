import { For, Show, createMemo } from 'solid-js';
import { ExternalLink, Info, X } from 'lucide-solid';
import { credits } from '../credits';
import { updateMutable } from '../store';
import Button from '../lib/components/ui/Button';
import type { AppState } from '../kinematics/types';

interface AboutModalProps {
  state: AppState;
}

export default function AboutModal(props: AboutModalProps) {
  const orderedCredits = createMemo(() => [...credits].sort((a, b) => a.usageRank - b.usageRank));

  function close(): void {
    updateMutable((draft) => {
      draft.ui.aboutModalOpen = false;
    });
  }

  return (
    <Show when={props.state.ui.aboutModalOpen}>
      <div class="about-modal-backdrop" onClick={close} aria-hidden="true" />
      <section class="about-modal" role="dialog" aria-modal="true" aria-label="About and credits">
        <header class="about-modal-header">
          <div class="about-modal-title">
            <div class="about-modal-icon" aria-hidden="true"><Info size={18} /></div>
            <div>
              <h2>About Klipper Visual Kinematics</h2>
              <p>Open source credits.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
        </header>

        <div class="about-modal-body">
          <ul class="credits-bullet-list">
            <For each={orderedCredits()}>
              {(credit) => (
                <li>
                  <a href={credit.repoUrl} target="_blank" rel="noreferrer">
                    <span>{credit.name}</span>
                    <ExternalLink size={13} />
                  </a>
                </li>
              )}
            </For>
          </ul>
        </div>
      </section>
    </Show>
  );
}
