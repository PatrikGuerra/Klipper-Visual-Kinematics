import { createMemo, createSignal, Show } from 'solid-js';
import { Check, Copy, Link, RefreshCw, Upload, X } from 'lucide-solid';
import { updateMutable } from '../store';
import { applyPortableShareState, createShareUrl, decodeShareState, encodeShareState, extractSharePayload, readShareHash, writeShareHash } from '../share/shareState';
import Button from '../lib/components/ui/Button';
import Badge from '../lib/components/ui/Badge';
import type { AppState } from '../kinematics/types';

interface ShareModalProps {
  state: AppState;
}

export default function ShareModal(props: ShareModalProps) {
  const [importText, setImportText] = createSignal('');
  const [status, setStatus] = createSignal('');
  const payload = createMemo(() => encodeShareState(props.state));
  const shareUrl = createMemo(() => createShareUrl(payload()));

  function close(): void {
    updateMutable((draft) => {
      draft.ui.shareModalOpen = false;
    });
  }

  async function copyShareUrl(): Promise<void> {
    await copyText(shareUrl());
    setStatus('Share URL copied to clipboard.');
  }

  function refreshBrowserUrl(): void {
    writeShareHash(payload());
    setStatus('Browser URL refreshed.');
  }

  function importCurrentUrl(): void {
    const currentPayload = readShareHash();
    if (!currentPayload) {
      setStatus('No #s= payload found in the current URL.');
      return;
    }
    applyPayload(currentPayload);
  }

  function importPasted(): void {
    const extracted = extractSharePayload(importText());
    if (!extracted) {
      setStatus('Paste a full share URL or the compressed payload.');
      return;
    }
    applyPayload(extracted);
  }

  function applyPayload(nextPayload: string): void {
    try {
      const portable = decodeShareState(nextPayload);
      updateMutable((draft) => {
        applyPortableShareState(portable, draft);
        draft.ui.shareModalOpen = true;
      });
      writeShareHash(nextPayload);
      setStatus('Share URL imported into the visual state.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid share URL payload.');
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
              <h2>Share editable setup</h2>
              <p>The browser URL is compressed with Pako and updates automatically while you edit.</p>
            </div>
          </div>
          <div class="share-modal-actions">
            <Badge variant="default">Auto URL sync</Badge>
            <Button variant="ghost" size="icon" onClick={close} ariaLabel="Close"><X size={16} /></Button>
          </div>
        </header>

        <div class="share-modal-body">
          <section class="share-card">
            <div class="share-card-title">
              <span>Current share URL</span>
              <small>{payload().length} chars payload</small>
            </div>
            <textarea class="share-url-box" readonly spellcheck={false} value={shareUrl()} />
            <div class="share-action-row">
              <Button variant="success" onClick={copyShareUrl}><Copy size={15} />Copy URL</Button>
              <Button variant="secondary" onClick={refreshBrowserUrl}><RefreshCw size={15} />Refresh URL</Button>
            </div>
          </section>

          <section class="share-card">
            <div class="share-card-title">
              <span>Import share URL</span>
              <small>Paste a full URL or raw #s payload</small>
            </div>
            <textarea class="share-import-box" spellcheck={false} placeholder="Paste share URL or payload..." value={importText()} onInput={(event) => setImportText(event.currentTarget.value)} />
            <div class="share-action-row">
              <Button variant="outline" onClick={importCurrentUrl}><Upload size={15} />Import Current URL</Button>
              <Button onClick={importPasted}><Upload size={15} />Import Pasted</Button>
            </div>
          </section>

          <Show when={status()}>
            <div classList={{ success: status().includes('copied') || status().includes('imported') || status().includes('refreshed') }} class="share-status">
              <Check size={14} />
              <span>{status()}</span>
            </div>
          </Show>
        </div>
      </section>
    </Show>
  );
}
