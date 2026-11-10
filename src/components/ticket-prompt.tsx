import { CopyButton } from './copy-button';
import type { PromptBlock, TicketPromptForm } from '../types';

type TicketPromptProps = {
  prompt: TicketPromptForm;
  generatedPrompt: string;
  blocks: PromptBlock[];
  onChange: (patch: Partial<TicketPromptForm>) => void;
  onToggleBlock: (id: string) => void;
  onManageBlocks: () => void;
};

export const TicketPrompt = ({
  prompt,
  generatedPrompt,
  blocks,
  onChange,
  onToggleBlock,
  onManageBlocks
}: TicketPromptProps): JSX.Element => (
  <section className="prompt-section">
    <h2>Ticket prompt</h2>
    <p className="prompt-hint">
      Paste the title, acceptance criteria and description from the ticket to build a prompt for
      your AI assistant. The ticket ID above is included automatically, and the surrounding header
      and footer are editable in Settings.
    </p>

    <div className="form-grid">
      <label>
        Ticket title
        <input
          type="text"
          placeholder="Paste the title 🏷️"
          value={prompt.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>

      <label>
        Acceptance criteria
        <textarea
          rows={5}
          placeholder="Paste the acceptance criteria 📋"
          value={prompt.acceptanceCriteria}
          onChange={(event) => onChange({ acceptanceCriteria: event.target.value })}
        />
      </label>

      <label>
        Ticket description
        <textarea
          rows={5}
          placeholder="Paste the description 📝"
          value={prompt.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
    </div>

    <fieldset className="settings-fieldset block-picker">
      <legend>Blocks</legend>
      {blocks.length > 0 ? (
        blocks.map((block) => (
          <label key={block.id} className="settings-toggle">
            <input
              type="checkbox"
              checked={prompt.selectedBlockIds.includes(block.id)}
              onChange={() => onToggleBlock(block.id)}
            />
            {block.heading}
          </label>
        ))
      ) : (
        <p className="settings-hint">
          No blocks yet. Blocks are reusable instructions you can tick on per ticket.
        </p>
      )}
      <button type="button" className="btn btn-secondary" onClick={onManageBlocks}>
        Manage blocks
      </button>
    </fieldset>

    {generatedPrompt ? (
      <article className="prompt-output" aria-live="polite">
        <h3>Generated prompt</h3>
        <pre>{generatedPrompt}</pre>
        <CopyButton value={generatedPrompt} />
      </article>
    ) : null}
  </section>
);
