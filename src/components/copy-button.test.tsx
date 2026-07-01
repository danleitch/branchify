import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  it('renders the idle label', () => {
    render(<CopyButton value="feat/x" idleLabel="Copy branch" />);
    expect(screen.getByRole('button', { name: 'Copy branch' })).toBeInTheDocument();
  });

  it('writes the value to the clipboard and shows confirmation', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="feat/x" idleLabel="Copy branch" />);

    await user.click(screen.getByRole('button'));

    expect(await navigator.clipboard.readText()).toBe('feat/x');
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('does not attempt to copy an empty value', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<CopyButton value="" idleLabel="Copy" />);

    await user.click(screen.getByRole('button'));

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('stays in the idle state when the clipboard write fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));
    render(<CopyButton value="feat/x" idleLabel="Copy branch" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy branch' })).toBeInTheDocument()
    );
  });
});
