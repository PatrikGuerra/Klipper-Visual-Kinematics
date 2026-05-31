import { createMemo, createSignal, Show } from 'solid-js';
import { AlertTriangle, Check, Copy, Link, X } from 'lucide-solid';
import { updateMutable } from '../store';
import { SHARE_URL_WARNING_LENGTH, createShareUrl, encodeShareState } from '../share/shareState';
import Button from '../lib/components/ui/Button';
import Badge from '../lib/components/ui/Badge';
import type { AppState } from '../kinematics/types';

interface ShareModalProps {
  state: AppState;
}

export default function ShareModal(props: ShareModalProps) {
  const [status, setStatus] = createSignal('');
  const payload = createMemo(() => encodeShareState(props.state));
  const shareUrl = createMemo(() => createShareUrl(payload()));
  const isLargeUrl = createMemo(() => shareUrl().length > SHARE_URL_WARNING_LENGTH);
  const isPositiveStatus = createMemo(() => status().includes('copied'));

  function close(): void {
    updateMutable((draft) => {
      draft.ui.shareModalOpen = false;
    });
  }

  async function copyShareUrl(): Promise<void> {
    try {
      await copyText(shareUrl());
      setStatus('Share URL copied to clipboard.');
    } catch (error) {
      setStatus(error instanceof Error ? `Could not copy share URL: ${error.message}` : 'Could not copy share URL.');
    }
  }

  async function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  return (
    <Show when={props.state.ui.shareModalOpen}>
      <section class="modal modal-open" role="dialog" aria-modal="true" aria-label="Share configuration URL">
        <div class="modal-box flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col overflow-hidden p-0">
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 px-5 py-4">
            <div class="flex min-w-0 items-start gap-3">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-box border border-primary/20 bg-primary/10 text-primary" aria-hidden="true"><Link size={18} /></div>
              <div class="min-w-0">
                <h2 class="m-0 text-base font-extrabold leading-tight">Share setup</h2>
                <p class="mt-1 text-sm leading-snug opacity-70">Compressed editable state link.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="default">Auto synced</Badge>
              <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto bg-base-200 p-4">
            <section class="card border border-base-300 bg-base-100 shadow-sm">
              <div class="card-body gap-3 p-4">
                <div class="flex items-start justify-between gap-3 max-sm:flex-col">
                  <div>
                    <h3 class="m-0 text-sm font-extrabold">Share URL</h3>
                    <p class="mt-1 text-xs font-semibold opacity-60">Open this URL to restore the visual setup.</p>
                  </div>
                  <div class="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={isLargeUrl() ? 'warning' : 'muted'}>{shareUrl().length} chars</Badge>
                    <Button variant="success" onClick={copyShareUrl}><Copy size={15} />Copy URL</Button>
                  </div>
                </div>
                <Show when={isLargeUrl()}>
                  <div class="alert alert-warning py-2 text-xs">
                    <AlertTriangle size={14} />
                    <span>Large URL: use Download .cfg for long configs/macros.</span>
                  </div>
                </Show>
                <textarea
                  class="textarea textarea-bordered min-h-24 w-full resize-y font-mono text-xs leading-relaxed"
                  readonly
                  spellcheck={false}
                  value={shareUrl()}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            </section>

            <Show when={status()}>
              <div class={isPositiveStatus() ? 'alert alert-success mt-3 py-2 text-xs' : 'alert alert-warning mt-3 py-2 text-xs'}>
                <Show when={isPositiveStatus()} fallback={<AlertTriangle size={14} />}>
                  <Check size={14} />
                </Show>
                <span>{status()}</span>
              </div>
            </Show>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop" onClick={close}>
          <button type="button" class="modal-close-button">close</button>
        </form>
      </section>
    </Show>
  );
}
