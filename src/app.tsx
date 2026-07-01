import { useEffect, useMemo, useState } from 'react';
import { BranchForm } from './components/branch-form';
import { BranchOutputs } from './components/branch-outputs';
import { RecentBranches } from './components/recent-branches';
import { useRecentBranches } from './hooks/use-recent-branches';
import { generateBranchName, generatePullRequestTitle } from './lib/branch-utils';
import { EMPTY_FORM, FORM_STORAGE_KEY, parseForm, readStorage, writeStorage } from './lib/storage';
import type { PersistedForm } from './types';

export const App = (): JSX.Element => {
  const [form, setForm] = useState<PersistedForm>(() => parseForm(readStorage(FORM_STORAGE_KEY)));
  const [submitted, setSubmitted] = useState(false);
  const { recentBranches, addRecentBranch, removeRecentBranch } = useRecentBranches();

  const branchName = useMemo(() => generateBranchName(form), [form]);
  const pullRequestTitle = useMemo(() => generatePullRequestTitle(form), [form]);
  const gitCommand = branchName ? `git checkout -b "${branchName}"` : '';

  useEffect(() => {
    writeStorage(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const handleChange = (patch: Partial<PersistedForm>): void => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (): void => {
    setSubmitted(true);
    addRecentBranch(branchName);
  };

  const handleReset = (): void => {
    setForm(EMPTY_FORM);
    setSubmitted(false);
  };

  const showError = submitted && !branchName;

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="panel-header">
          <h1>Branchify 🪾</h1>
          <p>Create consistent Git branch names in one quick step.</p>
          <p>
            <strong>'&lt;type&gt;/&lt;ticket-id&gt;/&lt;description&gt;'</strong> — the practical
            modern standard used across teams leveraging Jira and Linear.
          </p>
        </header>

        <BranchForm
          form={form}
          showError={showError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <BranchOutputs
          branchName={branchName}
          gitCommand={gitCommand}
          pullRequestTitle={pullRequestTitle}
        />

        <RecentBranches branches={recentBranches} onRemove={removeRecentBranch} />
      </section>
    </main>
  );
};
