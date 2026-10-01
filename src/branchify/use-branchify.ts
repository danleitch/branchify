import { useEffect, useMemo, useState } from 'react';
import { buildAiHandoffTargets, type AiHandoffTarget } from '../lib/ai-handoff';
import {
  DEFAULT_BRANCH_TYPES,
  generateBranchName,
  generatePullRequestTitle,
  parseBranchName
} from '../lib/branch-utils';
import {
  EMPTY_FORM,
  FORM_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  parseForm,
  parseSettings,
  readStorage,
  writeStorage
} from '../lib/storage';
import type { BranchSeparators, BranchSettings, PersistedForm, RecentBranch } from '../types';

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

type UseBranchifyOptions = {
  addRecentBranch: (value: string, snapshot: LoadableBranch) => void;
  /** Pays koi coins the first time a branch is put to use. */
  rewardForBranch: (branch: string) => void;
};

export type UseBranchify = ReturnType<typeof useBranchify>;

/**
 * Branchify's state: the form, its naming settings and what comes out of
 * them. It lives with the app rather than the sheet, so a form left idle is
 * still saved to the recent list while the sheet is closed.
 */
export const useBranchify = ({ addRecentBranch, rewardForBranch }: UseBranchifyOptions) => {
  const [form, setForm] = useState<PersistedForm>(() => parseForm(readStorage(FORM_STORAGE_KEY)));
  const [settings, setSettings] = useState<BranchSettings>(() =>
    parseSettings(readStorage(SETTINGS_STORAGE_KEY))
  );

  const branchName = useMemo(() => generateBranchName(form, settings), [form, settings]);
  const pullRequestTitle = useMemo(
    () => generatePullRequestTitle(form, settings),
    [form, settings]
  );
  const aiTargets = useMemo<AiHandoffTarget[]>(
    () =>
      buildAiHandoffTargets(form, settings).filter((target) =>
        settings.aiHandoffTargets.includes(target.id)
      ),
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

  // Saves the current branch name to the recent list once the form has sat
  // idle for a while, so users get history without an explicit save step.
  useEffect(() => {
    if (!branchName) {
      return;
    }

    const timer = setTimeout(() => {
      addRecentBranch(branchName, {
        form,
        separators: {
          typeSeparator: settings.typeSeparator,
          ticketSeparator: settings.ticketSeparator
        }
      });
      // A branch worth keeping is a branch worth paying for; a name that was
      // already copied has been paid for and earns nothing twice.
      rewardForBranch(branchName);
    }, AUTOSAVE_IDLE_MS);

    return () => clearTimeout(timer);
  }, [form, settings, branchName, addRecentBranch, rewardForBranch]);

  const changeForm = (patch: Partial<PersistedForm>): void => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const changeSettings = (patch: Partial<BranchSettings>): void => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const addType = (type: string): void => {
    setSettings((current) =>
      current.branchTypes.includes(type)
        ? current
        : { ...current, branchTypes: [...current.branchTypes, type] }
    );
  };

  const removeType = (type: string): void => {
    setSettings((current) =>
      current.branchTypes.length > 1
        ? { ...current, branchTypes: current.branchTypes.filter((item) => item !== type) }
        : current
    );
  };

  const resetTypes = (): void => {
    changeSettings({ branchTypes: [...DEFAULT_BRANCH_TYPES] });
  };

  const resetForm = (): void => {
    setForm(EMPTY_FORM);
  };

  const canLoadRecent = (item: RecentBranch): boolean =>
    resolveRecentBranch(item, settings) !== null;

  const loadRecent = (item: RecentBranch): boolean => {
    const loadable = resolveRecentBranch(item, settings);

    if (!loadable) {
      return false;
    }

    setForm(loadable.form);
    changeSettings(loadable.separators);
    return true;
  };

  return {
    form,
    settings,
    branchName,
    pullRequestTitle,
    aiTargets,
    gitCommand,
    namingPattern,
    changeForm,
    changeSettings,
    addType,
    removeType,
    resetTypes,
    resetForm,
    canLoadRecent,
    loadRecent
  };
};
