import { For, Show, createMemo } from 'solid-js';
import { ExternalLink, X } from 'lucide-solid';
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
      <div class="fixed inset-0 z-[60] bg-slate-950/40" onClick={close} aria-hidden="true" />
      <section
        class="fixed left-1/2 top-1/2 z-[70] flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="About and credits"
      >
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="m-0 text-base font-extrabold leading-tight text-slate-900">About</h2>
            <p class="mt-1 text-sm leading-snug text-slate-500">
              Open-source packages used by Klipper Visual Kinematics.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="divide-y divide-slate-100" role="list">
            <For each={orderedCredits()}>
              {(credit) => (
                <article
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 hover:bg-slate-50 max-sm:grid-cols-1 max-sm:items-start max-sm:gap-2"
                  role="listitem"
                >
                  <div class="min-w-0">
                    <h3 class="m-0 text-sm font-extrabold leading-tight text-slate-900">{credit.name}</h3>
                    <p class="mt-1 text-sm leading-snug text-slate-500">{credit.usage}</p>
                  </div>
                  <a
                    class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 no-underline hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 max-sm:w-fit"
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
    </Show>
  );
}
