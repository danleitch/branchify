import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { MAX_BRANCH_TYPE_LENGTH, sanitizeBranchType } from '../lib/branch-utils';
import { BACKGROUND_STYLES } from '../lib/storage';
import type { BackgroundStyle } from '../types';

const BACKGROUND_LABELS: Readonly<Record<BackgroundStyle, string>> = {
  koi: 'Koi pond',
  particles: 'Particles',
  plain: 'Plain'
};

type SettingsPanelProps = {
  branchTypes: string[];
  background: BackgroundStyle;
  onBackgroundChange: (background: BackgroundStyle) => void;
  showAiLinks: boolean;
  onShowAiLinksChange: (show: boolean) => void;
  onAddType: (type: string) => void;
  onRemoveType: (type: string) => void;
  onResetTypes: () => void;
  onClose: () => void;
};

export const SettingsPanel = ({
  branchTypes,
  background,
  onBackgroundChange,
  showAiLinks,
  onShowAiLinksChange,
  onAddType,
  onRemoveType,
  onResetTypes,
  onClose
}: SettingsPanelProps): JSX.Element => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

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

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const type = sanitizeBranchType(draft);

    if (!type) {
      setError('Use letters, numbers, "-" or "_".');
      return;
    }

    if (branchTypes.includes(type)) {
      setError(`"${type}" already exists.`);
      return;
    }

    onAddType(type);
    setDraft('');
    setError('');
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
        aria-labelledby="settings-title"
      >
        <div className="settings-panel-header">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="header-action"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <section>
          <h3>Branch types</h3>
          <ul className="type-chips">
            {branchTypes.map((type) => (
              <li key={type} className="type-chip">
                <span>{type}</span>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => onRemoveType(type)}
                  disabled={branchTypes.length === 1}
                  aria-label={`Remove type ${type}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <form className="type-add-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a type, e.g. bug"
              aria-label="New branch type"
              maxLength={MAX_BRANCH_TYPE_LENGTH}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError('');
              }}
            />
            <button type="submit" className="btn btn-secondary">
              Add
            </button>
          </form>
          {error && (
            <p className="settings-error" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="btn btn-secondary" onClick={onResetTypes}>
            Restore defaults
          </button>
        </section>

        <section>
          <h3>Description</h3>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={showAiLinks}
              onChange={(event) => onShowAiLinksChange(event.target.checked)}
            />
            Show AI shorten icons (ChatGPT &amp; Claude)
          </label>
        </section>

        <fieldset className="settings-fieldset">
          <legend>Background</legend>
          {BACKGROUND_STYLES.map((style) => (
            <label key={style} className="settings-toggle">
              <input
                type="radio"
                name="background"
                value={style}
                checked={background === style}
                onChange={() => onBackgroundChange(style)}
              />
              {BACKGROUND_LABELS[style]}
            </label>
          ))}
          <p className="settings-hint">
            The koi pond swims one fish per recent branch, coloured by its branch type.
          </p>
        </fieldset>
      </div>
    </div>
  );
};
