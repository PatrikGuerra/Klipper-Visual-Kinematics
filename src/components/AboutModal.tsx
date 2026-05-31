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
      <section
        class="modal modal-open"
        role="dialog"
        aria-modal="true"
        aria-label="About and credits"
      >
        <div class="modal-box flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden p-0">
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 px-5 py-4">
            <div class="flex min-w-0 items-start gap-3">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-box border border-primary/20 bg-primary/10 text-primary" aria-hidden="true"><Info size={18} /></div>
              <div class="min-w-0">
                <h2 class="m-0 text-base font-extrabold leading-tight">About</h2>
                <p class="mt-1 text-sm leading-snug opacity-70">
                  Open-source packages used by Klipper Visual Kinematics.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto bg-base-200 p-4">
            <section class="card border border-base-300 bg-base-100 shadow-sm">
              <div class="card-body p-0">
                <div class="divide-y divide-base-200" role="list">
                  <For each={orderedCredits()}>
                    {(credit) => (
                      <article
                        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 max-sm:grid-cols-1 max-sm:items-start max-sm:gap-2"
                        role="listitem"
                      >
                        <div class="min-w-0">
                          <h3 class="m-0 text-sm font-extrabold leading-tight">{credit.name}</h3>
                          <p class="mt-1 text-sm leading-snug opacity-70">{credit.usage}</p>
                        </div>
                        <a
                          class="btn btn-outline btn-xs max-sm:w-fit"
                          href={credit.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${credit.name} repository`}
                        >
                          <span>Open</span>
                          <ExternalLink size={13} />
                        </a>
                      </article>
                    )}
                  </For>
                </div>
              </div>
            </section>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop" onClick={close}>
          <button type="button" class="modal-close-button">close</button>
        </form>
      </section>
    </Show>
  );
}
