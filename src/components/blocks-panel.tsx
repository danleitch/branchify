import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { MAX_BLOCKS, MAX_BLOCK_BODY_LENGTH, MAX_BLOCK_HEADING_LENGTH } from '../lib/prompt-blocks';
import { BlocksTransfer } from './blocks-transfer';
import type { PromptBlock } from '../types';

type BlocksPanelProps = {
  blocks: PromptBlock[];
  onAddBlock: (heading: string, body: string) => boolean;
  onUpdateBlock: (id: string, heading: string, body: string) => boolean;
  onRemoveBlock: (id: string) => void;
  onReplaceBlocks: (blocks: PromptBlock[]) => void;
  onClose: () => void;
};

const EMPTY_DRAFT = { heading: '', body: '' };

export const BlocksPanel = ({
  blocks,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onReplaceBlocks,
  onClose
}: BlocksPanelProps): JSX.Element => {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  const resetDraft = (): void => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!draft.heading.trim() || !draft.body.trim()) {
      setError('A block needs both a heading and some text.');
      return;
    }

    const saved = editingId
      ? onUpdateBlock(editingId, draft.heading, draft.body)
      : onAddBlock(draft.heading, draft.body);

    if (!saved) {
      setError(
        editingId ? 'That block could not be saved.' : `You can keep up to ${MAX_BLOCKS} blocks.`
      );
      return;
    }

    resetDraft();
    headingRef.current?.focus();
  };

  const handleEdit = (block: PromptBlock): void => {
    setDraft({ heading: block.heading, body: block.body });
    setEditingId(block.id);
    setError('');
    headingRef.current?.focus();
  };

  const handleReplaceBlocks = (imported: PromptBlock[]): void => {
    onReplaceBlocks(imported);
    resetDraft();
  };

  return (
    <div
      className="settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocks-title"
      >
        <div className="settings-panel-header">
          <h2 id="blocks-title">Blocks</h2>
          <button
            type="button"
            className="header-action"
            onClick={onClose}
            aria-label="Close blocks"
          >
            ✕
          </button>
        </div>

        <section>
          <p className="settings-hint">
            Reusable instruction blocks. Tick the ones that suit the work stream you are on and
            their text is added to the ticket prompt, above the footer.
          </p>

          {blocks.length > 0 ? (
            <ul className="block-list">
              {blocks.map((block) => (
                <li key={block.id} className="block-row">
                  <span className="block-row-heading">{block.heading}</span>
                  <span className="recent-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleEdit(block)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => onRemoveBlock(block.id)}
                      aria-label={`Remove block ${block.heading}`}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-hint">No blocks yet. Add your first one below.</p>
          )}

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Block heading
              <input
                ref={headingRef}
                type="text"
                placeholder="e.g. Creating a PR"
                maxLength={MAX_BLOCK_HEADING_LENGTH}
                value={draft.heading}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, heading: event.target.value }));
                  setError('');
                }}
              />
            </label>

            <label>
              Block text
              <textarea
                rows={6}
                placeholder="The instructions to add to the prompt when this block is ticked"
                maxLength={MAX_BLOCK_BODY_LENGTH}
                value={draft.body}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, body: event.target.value }));
                  setError('');
                }}
              />
            </label>

            <div className="recent-actions">
              <button type="submit" className="btn">
                {editingId ? 'Save block' : 'Add block'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetDraft}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {error && (
            <p className="settings-error" role="alert">
              {error}
            </p>
          )}

          <BlocksTransfer
            blocks={blocks}
            onReplaceBlocks={handleReplaceBlocks}
            onError={setError}
          />
        </section>
      </div>
    </div>
  );
};
