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
      <div class="share-modal-backdrop" onClick={close} aria-hidden="true" />
      <section class="share-modal" role="dialog" aria-modal="true" aria-label="Share configuration URL">
        <header class="share-modal-header">
          <div class="share-modal-title">
            <div class="share-modal-icon" aria-hidden="true"><Link size={18} /></div>
            <div>
              <h2>Share setup</h2>
              <p>Compressed editable state link.</p>
            </div>
          </div>
          <div class="share-modal-actions">
            <Badge variant="default">Auto synced</Badge>
            <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
          </div>
        </header>

        <div class="share-modal-body">
          <section class="share-card">
            <div class="share-card-title">
              <div>
                <span>Share URL</span>
                <small>Open this URL to restore the visual setup.</small>
              </div>
              <div class="share-card-actions">
                <Badge variant={isLargeUrl() ? 'warning' : 'muted'}>{shareUrl().length} chars</Badge>
                <Button variant="success" onClick={copyShareUrl}><Copy size={15} />Copy URL</Button>
              </div>
            </div>
            <Show when={isLargeUrl()}>
              <div class="share-size-warning">
                <AlertTriangle size={14} />
                <span>Large URL: use Download .cfg for long configs/macros.</span>
              </div>
            </Show>
            <textarea class="share-url-box" readonly spellcheck={false} value={shareUrl()} onFocus={(event) => event.currentTarget.select()} />
          </section>

          <footer class="share-modal-footer">
            <Show when={status()}>
              <div classList={{ success: isPositiveStatus() }} class="share-status">
                <Show when={isPositiveStatus()} fallback={<AlertTriangle size={14} />}>
                  <Check size={14} />
                </Show>
                <span>{status()}</span>
              </div>
            </Show>
          </footer>
        </div>
      </section>
    </Show>
  );
}
