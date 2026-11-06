import { CopyButton } from './copy-button';
import type { TicketPromptForm } from '../types';

type TicketPromptProps = {
  prompt: TicketPromptForm;
  generatedPrompt: string;
  onChange: (patch: Partial<TicketPromptForm>) => void;
};

export const TicketPrompt = ({
  prompt,
  generatedPrompt,
  onChange
}: TicketPromptProps): JSX.Element => (
  <section className="prompt-section">
    <h2>Ticket prompt</h2>
    <p className="prompt-hint">
      Paste the acceptance criteria and description from the Jira ticket to build a prompt for your
      AI assistant. The ticket ID above is included automatically.
    </p>

    <div className="form-grid">
      <label>
        Acceptance criteria
        <textarea
          rows={5}
          placeholder="Paste the acceptance criteria from Jira 📋"
          value={prompt.acceptanceCriteria}
          onChange={(event) => onChange({ acceptanceCriteria: event.target.value })}
        />
      </label>

      <label>
        Ticket description
        <textarea
          rows={5}
          placeholder="Paste the description from Jira 📝"
          value={prompt.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
    </div>

    {generatedPrompt ? (
      <article className="prompt-output" aria-live="polite">
        <h3>Generated prompt</h3>
        <pre>{generatedPrompt}</pre>
        <CopyButton value={generatedPrompt} />
      </article>
    ) : null}
  </section>
);
