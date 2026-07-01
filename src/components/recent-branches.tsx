import type { RecentBranch } from '../types';
import { CopyButton } from './copy-button';

type RecentBranchesProps = {
  branches: RecentBranch[];
  onRemove: (createdAt: string) => void;
};

export const RecentBranches = ({ branches, onRemove }: RecentBranchesProps): JSX.Element | null => {
  if (branches.length === 0) {
    return null;
  }

  return (
    <section className="recent-list">
      <h3>Recent branches</h3>
      <ul>
        {branches.map((item) => (
          <li key={item.createdAt}>
            <code>{item.value}</code>
            <div className="recent-actions">
              <CopyButton value={item.value} idleLabel="Copy" />
              <button
                className="btn-remove"
                type="button"
                onClick={() => onRemove(item.createdAt)}
                aria-label={`Remove ${item.value}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
