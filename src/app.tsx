import { useEffect, useMemo, useState } from 'react';
import { CopyButton } from './components/copy-button';
import { BRANCH_TYPES, generateBranchName, generatePullRequestTitle } from './lib/branch-utils';

type RecentBranch = {
  createdAt: string;
  value: string;
};

type PersistedForm = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

const FORM_STORAGE_KEY = 'branchify-form';
const RECENT_STORAGE_KEY = 'branchify-recent';

const getInitialForm = (): PersistedForm => {
  const fallback: PersistedForm = {
    branchType: 'feat',
    ticketNumber: '',
    description: ''
  };

  const raw = localStorage.getItem(FORM_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<PersistedForm>) };
  } catch {
    return fallback;
  }
};

const getInitialRecent = (): RecentBranch[] => {
  const raw = localStorage.getItem(RECENT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RecentBranch[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
};

export const App = (): JSX.Element => {
  const [form, setForm] = useState<PersistedForm>(() => getInitialForm());
  const [submitted, setSubmitted] = useState(false);
  const [recentBranches, setRecentBranches] = useState<RecentBranch[]>(() => getInitialRecent());

  const branchName = useMemo(
    () =>
      generateBranchName({
        branchType: form.branchType,
        ticketNumber: form.ticketNumber,
        description: form.description
      }),
    [form]
  );

  const pullRequestTitle = useMemo(
    () =>
      generatePullRequestTitle({
        branchType: form.branchType,
        ticketNumber: form.ticketNumber,
        description: form.description
      }),
    [form]
  );

  const gitCommand = branchName ? `git checkout -b "${branchName}"` : '';

  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentBranches));
  }, [recentBranches]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmitted(true);

    if (!branchName) {
      return;
    }

    setRecentBranches((current) => {
      const next: RecentBranch[] = [
        { value: branchName, createdAt: new Date().toISOString() },
        ...current.filter((item) => item.value !== branchName)
      ];

      return next.slice(0, 5);
    });
  };

  const handleReset = (): void => {
    setForm({
      branchType: 'feat',
      ticketNumber: '',
      description: ''
    });
    setSubmitted(false);
  };

  const handleRemoveRecent = (createdAt: string): void => {
    setRecentBranches((current) => current.filter((item) => item.createdAt !== createdAt));
  };

  const missingFields = submitted && (!form.branchType || !form.description.trim());

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="panel-header">
          <h1>Branchify 🪾</h1>
          <p>Create consistent Git branch names in one quick step.</p>
          <p>'&lt;type&gt;/&lt;ticket-id&gt;-&lt;description&gt;' — the practical modern standard used across teams leveraging Jira and Linear.</p>
        </header>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Branch type
            <select
              value={form.branchType}
              onChange={(event) =>
                setForm((current) => ({ ...current, branchType: event.target.value }))
              }
            >
              {BRANCH_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ticket number
            <input
              type="text"
              placeholder="PROJECT-123"
              value={form.ticketNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, ticketNumber: event.target.value }))
              }
            />
          </label>

          <label>
            Description
            <input
              type="text"
              placeholder="brief summary of work"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <button className="btn" type="submit">
            Generate
          </button>

          <button className="btn btn-secondary" type="button" onClick={handleReset}>
            Reset
          </button>
        </form>

        {missingFields ? <p className="error">Please fill all fields to generate a branch.</p> : null}

        {branchName ? (
          <section className="output-grid" aria-live="polite">
            <article>
              <h2>Branch name</h2>
              <code>{branchName}</code>
              <CopyButton value={branchName} idleLabel="Copy branch" />
            </article>

            <article>
              <h2>Git command</h2>
              <code>{gitCommand}</code>
              <CopyButton value={gitCommand} idleLabel="Copy command" />
            </article>

            {pullRequestTitle ? (
              <article className="output-wide">
                <h2>PR title</h2>
                <code>{pullRequestTitle}</code>
                <CopyButton value={pullRequestTitle} idleLabel="Copy PR title" />
              </article>
            ) : null}
          </section>
        ) : null}

        {recentBranches.length > 0 ? (
          <section className="recent-list">
            <h3>Recent branches</h3>
            <ul>
              {recentBranches.map((item) => (
                <li key={item.createdAt}>
                  <code>{item.value}</code>
                  <div className="recent-actions">
                    <CopyButton value={item.value} idleLabel="Copy" />
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveRecent(item.createdAt)}
                      aria-label={`Remove ${item.value}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  );
};
