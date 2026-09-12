import type { PersistedForm } from '../types';
import { BRANCH_TYPES } from '../lib/branch-utils';

type BranchFormProps = {
  form: PersistedForm;
  typeSeparator: string;
  ticketSeparator: string;
  onChange: (patch: Partial<PersistedForm>) => void;
  onTypeSeparatorChange: (value: string) => void;
  onTicketSeparatorChange: (value: string) => void;
};

export const BranchForm = ({
  form,
  typeSeparator,
  ticketSeparator,
  onChange,
  onTypeSeparatorChange,
  onTicketSeparatorChange
}: BranchFormProps): JSX.Element => {
  return (
    <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
      <div className="type-ticket-row">
        <label>
          Branch type
          <select
            value={form.branchType}
            onChange={(event) => onChange({ branchType: event.target.value })}
          >
            {BRANCH_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="separator-field">
          Separator
          <input
            type="text"
            maxLength={3}
            value={typeSeparator}
            onChange={(event) => onTypeSeparatorChange(event.target.value)}
          />
        </label>

        <label>
          Ticket number
          <input
            type="text"
            placeholder="PROJECT-123"
            value={form.ticketNumber}
            onChange={(event) => onChange({ ticketNumber: event.target.value })}
          />
        </label>

        <label className="separator-field">
          Separator
          <input
            type="text"
            maxLength={3}
            value={ticketSeparator}
            onChange={(event) => onTicketSeparatorChange(event.target.value)}
          />
        </label>
      </div>

      <label>
        Description
        <input
          type="text"
          placeholder="brief summary of work"
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
    </form>
  );
};
