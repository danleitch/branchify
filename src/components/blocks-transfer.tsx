import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { parseBlocks, serializeBlocks } from '../lib/prompt-blocks';
import type { PromptBlock } from '../types';

type BlocksTransferProps = {
  blocks: PromptBlock[];
  onReplaceBlocks: (blocks: PromptBlock[]) => void;
  onError: (message: string) => void;
};

/**
 * Export and import for the block library. Blocks live in `localStorage`, which
 * a cleared cache wipes without warning, so a library worth building is a
 * library worth being able to keep a copy of.
 */
export const BlocksTransfer = ({
  blocks,
  onReplaceBlocks,
  onError
}: BlocksTransferProps): JSX.Element => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = (): void => {
    const url = URL.createObjectURL(
      new Blob([serializeBlocks(blocks)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'branchify-blocks.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again after a failed import still fires.
    event.target.value = '';

    if (!file) {
      return;
    }

    void file.text().then((text) => {
      const imported = parseBlocks(text);

      if (imported.length === 0) {
        onError('That file had no usable blocks in it.');
        return;
      }

      onReplaceBlocks(imported);
    });
  };

  return (
    <>
      <div className="recent-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={blocks.length === 0}
          onClick={handleExport}
        >
          Export blocks
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
        >
          Import blocks
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Import blocks from a file"
          onChange={handleImport}
        />
      </div>
      <p className="settings-hint">
        Blocks live in this browser only. Export keeps a copy; import replaces the whole list.
      </p>
    </>
  );
};
