import { useState } from 'react';
import type { BranchSettings } from '../types';

type SettingsPanelProps = {
  settings: BranchSettings;
  onChange: (patch: Partial<BranchSettings>) => void;
};

export const SettingsPanel = ({ settings, onChange }: SettingsPanelProps): JSX.Element => {
  const [open, setOpen] = useState(false);

  return (
    <div className="settings">
      <button
        type="button"
        className="btn-icon"
        aria-label="Settings"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        ⚙
      </button>

      {open ? (
        <div className="settings-panel" role="dialog" aria-label="Branch naming settings">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.useFullTypeName}
              onChange={(event) => onChange({ useFullTypeName: event.target.checked })}
            />
            Use full type names (e.g. "feature" instead of "feat")
          </label>

          <label>
            Type / ticket separator
            <input
              type="text"
              maxLength={3}
              value={settings.typeSeparator}
              onChange={(event) => onChange({ typeSeparator: event.target.value })}
            />
          </label>

          <label>
            Ticket / description separator
            <input
              type="text"
              maxLength={3}
              value={settings.ticketSeparator}
              onChange={(event) => onChange({ ticketSeparator: event.target.value })}
            />
          </label>

          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
};
