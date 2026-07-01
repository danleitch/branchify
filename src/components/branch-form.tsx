import type { PersistedForm } from '../types';
import { BRANCH_TYPES } from '../lib/branch-utils';

type BranchFormProps = {
  form: PersistedForm;
  showError: boolean;
  onChange: (patch: Partial<PersistedForm>) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export const BranchForm = ({
  form,
  showError,
  onChange,
  onSubmit,
  onReset
}: BranchFormProps): JSX.Element => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit}>
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

        <label>
          Ticket number
          <input
            type="text"
            placeholder="PROJECT-123"
            value={form.ticketNumber}
            onChange={(event) => onChange({ ticketNumber: event.target.value })}
          />
        </label>

        <label>
          Description
          <input
            type="text"
            placeholder="brief summary of work"
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </label>

        <button className="btn" type="submit">
          Generate
        </button>

        <button className="btn btn-secondary" type="button" onClick={onReset}>
          Reset
        </button>
      </form>

      {showError ? (
        <p className="error" role="alert">
          Please fill all fields to generate a branch.
        </p>
      ) : null}
    </>
  );
};
