import type { PersistedForm } from '../types';

type BranchFormProps = {
  form: PersistedForm;
  branchTypes: string[];
  typeSeparator: string;
  ticketSeparator: string;
  onChange: (patch: Partial<PersistedForm>) => void;
  onTypeSeparatorChange: (value: string) => void;
  onTicketSeparatorChange: (value: string) => void;
};

export const BranchForm = ({
  form,
  branchTypes,
  typeSeparator,
  ticketSeparator,
  onChange,
  onTypeSeparatorChange,
  onTicketSeparatorChange
}: BranchFormProps): JSX.Element => {
  // Keep the current type selectable even if it was removed from settings or came from history.
  const typeOptions = branchTypes.includes(form.branchType)
    ? branchTypes
    : [form.branchType, ...branchTypes];

  return (
    <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
      <div className="type-ticket-row">
        <label>
          Branch type
          <select
            value={form.branchType}
            onChange={(event) => onChange({ branchType: event.target.value })}
          >
            {typeOptions.map((type) => (
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
          Ticket ID
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
          placeholder="Brief summary of work ✒️"
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
    </form>
  );
};
