import { useEffect, useMemo, useState } from 'react';
import { BranchForm } from './components/branch-form';
import { BranchOutputs } from './components/branch-outputs';
import { RecentBranches } from './components/recent-branches';
import { ResetButton } from './components/reset-button';
import { useRecentBranches } from './hooks/use-recent-branches';
import { generateBranchName, generatePullRequestTitle } from './lib/branch-utils';
import {
  EMPTY_FORM,
  FORM_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  parseForm,
  parseSettings,
  readStorage,
  writeStorage
} from './lib/storage';
import type { BranchSettings, PersistedForm } from './types';

const AUTOSAVE_IDLE_MS = 5 * 60 * 1000;

export const App = (): JSX.Element => {
  const [form, setForm] = useState<PersistedForm>(() => parseForm(readStorage(FORM_STORAGE_KEY)));
  const [settings, setSettings] = useState<BranchSettings>(() =>
    parseSettings(readStorage(SETTINGS_STORAGE_KEY))
  );
  const { recentBranches, addRecentBranch, removeRecentBranch } = useRecentBranches();

  const branchName = useMemo(() => generateBranchName(form, settings), [form, settings]);
  const pullRequestTitle = useMemo(
    () => generatePullRequestTitle(form, settings),
    [form, settings]
  );
  const gitCommand = branchName ? `git checkout -b "${branchName}"` : '';
  const namingPattern = `<type>${settings.typeSeparator}<ticket-id>${settings.ticketSeparator}<description>`;

  useEffect(() => {
    writeStorage(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    writeStorage(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Auto-saves the current branch name to the recent list once the form has
  // sat idle for a while, so users get history without an explicit save step.
  useEffect(() => {
    if (!branchName) {
      return;
    }

    const timer = setTimeout(() => addRecentBranch(branchName), AUTOSAVE_IDLE_MS);

    return () => clearTimeout(timer);
  }, [form, settings, branchName, addRecentBranch]);

  const handleChange = (patch: Partial<PersistedForm>): void => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleSettingsChange = (patch: Partial<BranchSettings>): void => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const handleTypeSeparatorChange = (value: string): void => {
    handleSettingsChange({ typeSeparator: value });
  };

  const handleTicketSeparatorChange = (value: string): void => {
    handleSettingsChange({ ticketSeparator: value });
  };

  const handleReset = (): void => {
    setForm(EMPTY_FORM);
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="panel-header">
          <div className="panel-header-top">
            <h1>Branchify 🪾</h1>
            <ResetButton onReset={handleReset} />
          </div>
          <p>Create consistent Git branch names in one quick step.</p>
          <p>
            <strong>'{namingPattern}'</strong> — the practical modern standard used across teams
            leveraging Jira and Linear.
          </p>
        </header>

        <BranchForm
          form={form}
          typeSeparator={settings.typeSeparator}
          ticketSeparator={settings.ticketSeparator}
          onChange={handleChange}
          onTypeSeparatorChange={handleTypeSeparatorChange}
          onTicketSeparatorChange={handleTicketSeparatorChange}
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
