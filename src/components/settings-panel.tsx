import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AI_PROVIDERS, AI_PROVIDER_LABELS } from '../lib/ai-handoff';
import { MAX_BRANCH_TYPE_LENGTH, sanitizeBranchType } from '../lib/branch-utils';
import { MAX_BASE_FISH, MIN_BASE_FISH } from '../lib/koi';
import { BACKGROUND_STYLES } from '../lib/storage';
import type { AiProvider, BackgroundStyle } from '../types';

const BACKGROUND_LABELS: Readonly<Record<BackgroundStyle, string>> = {
  koi: 'Koi pond',
  particles: 'Particles',
  plain: 'Plain'
};

/** One option per fish count the pond can be floored at. */
const BASE_FISH_OPTIONS: readonly number[] = Array.from(
  { length: MAX_BASE_FISH - MIN_BASE_FISH + 1 },
  (_unused, index) => MIN_BASE_FISH + index
);

type SettingsPanelProps = {
  branchTypes: string[];
  background: BackgroundStyle;
  onBackgroundChange: (background: BackgroundStyle) => void;
  /** How many koi swim at minimum; more join as branches are saved, up to the pond's cap. */
  baseFishCount: number;
  onBaseFishCountChange: (count: number) => void;
  /** How many market koi the visitor owns; while there are any, they are the whole pond. */
  marketKoiCount?: number;
  onOpenMarket?: () => void;
  aiHandoffTargets: AiProvider[];
  onAiHandoffTargetsChange: (targets: AiProvider[]) => void;
  onAddType: (type: string) => void;
  onRemoveType: (type: string) => void;
  onResetTypes: () => void;
  onClose: () => void;
};

export const SettingsPanel = ({
  branchTypes,
  background,
  onBackgroundChange,
  baseFishCount,
  onBaseFishCountChange,
  marketKoiCount = 0,
  onOpenMarket,
  aiHandoffTargets,
  onAiHandoffTargetsChange,
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

        <fieldset className="settings-fieldset">
          <legend>AI shorten icons</legend>
          {AI_PROVIDERS.map((provider) => (
            <label key={provider} className="settings-toggle">
              <input
                type="checkbox"
                checked={aiHandoffTargets.includes(provider)}
                onChange={(event) => {
                  onAiHandoffTargetsChange(
                    event.target.checked
                      ? [...aiHandoffTargets, provider]
                      : aiHandoffTargets.filter((target) => target !== provider)
                  );
                }}
              />
              {AI_PROVIDER_LABELS[provider]}
            </label>
          ))}
          <p className="settings-hint">
            Choose which AI icons appear beside the description field.
          </p>
        </fieldset>

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
            The koi pond swims one fish per recent branch, each in its own colour, or the koi you
            buy at the market. Click the water and they come to look; right-click to feed them.
          </p>

          {background === 'koi' && (
            <>
              <label className="settings-select">
                Fish always in the pond
                <select
                  value={baseFishCount}
                  disabled={marketKoiCount > 0}
                  onChange={(event) => onBaseFishCountChange(Number(event.target.value))}
                >
                  {BASE_FISH_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <p className="settings-hint">
                {marketKoiCount === 1
                  ? 'Your market koi has the pond to itself, so branch koi and residents are resting until you release it.'
                  : marketKoiCount > 1
                    ? `Your ${marketKoiCount} market koi fill the pond, so branch koi and residents are resting until you release them.`
                    : `The pond never drops below this many. Recent branches fill in past it, up to ${MAX_BASE_FISH} at once.`}
              </p>
              {onOpenMarket && (
                <button type="button" className="btn btn-secondary" onClick={onOpenMarket}>
                  Open the koi market
                </button>
              )}
            </>
          )}
        </fieldset>
      </div>
    </div>
  );
};
