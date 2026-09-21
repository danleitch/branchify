import { useEffect, useMemo, useState } from 'react';
import { BranchForm } from './components/branch-form';
import { BranchOutputs } from './components/branch-outputs';
import { RecentBranches } from './components/recent-branches';
import { ResetButton } from './components/reset-button';
import { SettingsButton } from './components/settings-button';
import { SettingsPanel } from './components/settings-panel';
import { useRecentBranches } from './hooks/use-recent-branches';
import { buildAiHandoffTargets } from './lib/ai-handoff';
import {
  DEFAULT_BRANCH_TYPES,
  generateBranchName,
  generatePullRequestTitle,
  parseBranchName
} from './lib/branch-utils';
import {
  EMPTY_FORM,
  FORM_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  parseForm,
  parseSettings,
  readStorage,
  writeStorage
} from './lib/storage';
import type { BranchSeparators, BranchSettings, PersistedForm, RecentBranch } from './types';

const AUTOSAVE_IDLE_MS = 5 * 60 * 1000;

type LoadableBranch = { form: PersistedForm; separators: BranchSeparators };

/** Uses the saved snapshot when present, otherwise tries to reverse-engineer legacy entries. */
const resolveRecentBranch = (
  item: RecentBranch,
  settings: BranchSettings
): LoadableBranch | null => {
  if (item.form && item.separators) {
    return { form: item.form, separators: item.separators };
  }

  const form = parseBranchName(item.value, settings);

  return form
    ? {
        form,
        separators: {
          typeSeparator: settings.typeSeparator,
          ticketSeparator: settings.ticketSeparator
        }
      }
    : null;
};

export const App = (): JSX.Element => {
  const [form, setForm] = useState<PersistedForm>(() => parseForm(readStorage(FORM_STORAGE_KEY)));
  const [settings, setSettings] = useState<BranchSettings>(() =>
    parseSettings(readStorage(SETTINGS_STORAGE_KEY))
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { recentBranches, addRecentBranch, removeRecentBranch } = useRecentBranches();

  const branchName = useMemo(() => generateBranchName(form, settings), [form, settings]);
  const pullRequestTitle = useMemo(
    () => generatePullRequestTitle(form, settings),
    [form, settings]
  );
  const aiTargets = useMemo(() => buildAiHandoffTargets(form, settings), [form, settings]);
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

    const timer = setTimeout(
      () =>
        addRecentBranch(branchName, {
          form,
          separators: {
            typeSeparator: settings.typeSeparator,
            ticketSeparator: settings.ticketSeparator
          }
        }),
      AUTOSAVE_IDLE_MS
    );

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

  const handleAddType = (type: string): void => {
    setSettings((current) =>
      current.branchTypes.includes(type)
        ? current
        : { ...current, branchTypes: [...current.branchTypes, type] }
    );
  };

  const handleRemoveType = (type: string): void => {
    setSettings((current) =>
      current.branchTypes.length > 1
        ? { ...current, branchTypes: current.branchTypes.filter((item) => item !== type) }
        : current
    );
  };

  const handleResetTypes = (): void => {
    handleSettingsChange({ branchTypes: [...DEFAULT_BRANCH_TYPES] });
  };

  const handleReset = (): void => {
    setForm(EMPTY_FORM);
  };

  const canLoadRecent = (item: RecentBranch): boolean =>
    resolveRecentBranch(item, settings) !== null;

  const handleLoadRecent = (item: RecentBranch): void => {
    const loadable = resolveRecentBranch(item, settings);

    if (!loadable) {
      return;
    }

    setForm(loadable.form);
    handleSettingsChange(loadable.separators);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="panel-header">
          <div className="panel-header-top">
            <h1>Branchify 🪾</h1>
            <div className="header-actions">
              <SettingsButton expanded={settingsOpen} onClick={() => setSettingsOpen(true)} />
              <ResetButton onReset={handleReset} />
            </div>
          </div>
          <p>Create consistent Git branch names in one quick step.</p>
          <p>
            <strong>'{namingPattern}'</strong> — the practical modern standard used across teams
            leveraging Jira and Linear.
          </p>
        </header>

        <BranchForm
          form={form}
          branchTypes={settings.branchTypes}
          typeSeparator={settings.typeSeparator}
          ticketSeparator={settings.ticketSeparator}
          aiTargets={aiTargets}
          showAiLinks={settings.showAiLinks}
          onChange={handleChange}
          onTypeSeparatorChange={handleTypeSeparatorChange}
          onTicketSeparatorChange={handleTicketSeparatorChange}
        />

        <BranchOutputs
          branchName={branchName}
          gitCommand={gitCommand}
          pullRequestTitle={pullRequestTitle}
        />

        <RecentBranches
          branches={recentBranches}
          canLoad={canLoadRecent}
          onLoad={handleLoadRecent}
          onRemove={removeRecentBranch}
        />
      </section>

      {settingsOpen && (
        <SettingsPanel
          branchTypes={settings.branchTypes}
          showAiLinks={settings.showAiLinks}
          onShowAiLinksChange={(showAiLinks) => handleSettingsChange({ showAiLinks })}
          onAddType={handleAddType}
          onRemoveType={handleRemoveType}
          onResetTypes={handleResetTypes}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
};
