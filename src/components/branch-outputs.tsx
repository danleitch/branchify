import { CopyButton } from './copy-button';

type BranchOutputsProps = {
  branchName: string;
  gitCommand: string;
  pullRequestTitle: string;
};

export const BranchOutputs = ({
  branchName,
  gitCommand,
  pullRequestTitle
}: BranchOutputsProps): JSX.Element | null => {
  if (!branchName) {
    return null;
  }

  return (
    <section className="output-grid" aria-live="polite">
      <article>
        <h2>Branch name</h2>
        <code>{branchName}</code>
        <CopyButton value={branchName} idleLabel="Copy branch" />
      </article>

      <article>
        <h2>Git command</h2>
        <code>{gitCommand}</code>
        <CopyButton value={gitCommand} idleLabel="Copy command" />
      </article>

      {pullRequestTitle ? (
        <article className="output-wide">
          <h2>PR title</h2>
          <code>{pullRequestTitle}</code>
          <CopyButton value={pullRequestTitle} idleLabel="Copy PR title" />
        </article>
      ) : null}
    </section>
  );
};
