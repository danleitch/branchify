import { useEffect, useState } from 'react';

type CopyButtonProps = {
  value: string;
};

export const CopyButton = ({ value }: CopyButtonProps): JSX.Element => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async (): Promise<void> => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button className="btn btn-secondary" type="button" onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};
