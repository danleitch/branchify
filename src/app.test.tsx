import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './app';

const AUTOSAVE_IDLE_MS = 5 * 60 * 1000;

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  { ticket, description }: { ticket?: string; description: string }
): Promise<void> => {
  if (ticket !== undefined) {
    await user.type(screen.getByLabelText('Ticket number'), ticket);
  }
  await user.type(screen.getByLabelText('Description'), description);
};

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates a branch name, git command, and PR title from the form', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await fillForm(user, { ticket: 'BRF-123', description: 'Add user authentication' });

    expect(screen.getByText('feat/BRF-123-add-user-authentication')).toBeInTheDocument();
    expect(
      screen.getByText('git checkout -b "feat/BRF-123-add-user-authentication"')
    ).toBeInTheDocument();
    expect(screen.getByText('feat/BRF-123: Add user authentication.')).toBeInTheDocument();
  });

  it('adds the branch to the recent list after 5 minutes without changes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await fillForm(user, { description: 'Broken login' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS);
    });

    const recent = screen.getByRole('heading', { name: 'Recent branches' }).closest('section');
    expect(recent).not.toBeNull();
    expect(within(recent as HTMLElement).getByText('feat/broken-login')).toBeInTheDocument();
  });

  it('does not save to the recent list before the idle window elapses', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await fillForm(user, { description: 'Broken login' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS - 1000);
    });

    expect(screen.queryByRole('heading', { name: 'Recent branches' })).not.toBeInTheDocument();
  });

  it('removes a branch from the recent list', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await fillForm(user, { description: 'Broken login' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS);
    });
    await user.click(screen.getByRole('button', { name: 'Remove feat/broken-login' }));

    // The recent list is now empty, so the whole section disappears (the branch
    // name still shows in the generated-output panel above it).
    expect(screen.queryByRole('heading', { name: 'Recent branches' })).not.toBeInTheDocument();
  });

  it('clears the form on reset', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await fillForm(user, { ticket: 'BRF-9', description: 'Some work' });
    expect(screen.getByText('feat/BRF-9-some-work')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset form' }));

    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Ticket number')).toHaveValue('');
    expect(screen.queryByText('feat/BRF-9-some-work')).not.toBeInTheDocument();
  });

  it('shows the default naming pattern using the default separators', () => {
    render(<App />);

    expect(screen.getByText("'<type>/<ticket-id>-<description>'")).toBeInTheDocument();
  });

  it('updates the naming pattern to reflect chosen separators', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    const [typeSeparator, ticketSeparator] = screen.getAllByLabelText('Separator');
    await user.clear(typeSeparator);
    await user.type(typeSeparator, '_');
    await user.clear(ticketSeparator);
    await user.type(ticketSeparator, '.');

    expect(screen.getByText("'<type>_<ticket-id>.<description>'")).toBeInTheDocument();
  });

  it('places a separator field between branch type and ticket number, and after ticket number', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    const [typeSeparator, ticketSeparator] = screen.getAllByLabelText('Separator');
    await user.clear(typeSeparator);
    await user.type(typeSeparator, '_');
    await user.clear(ticketSeparator);
    await user.type(ticketSeparator, '.');
    await fillForm(user, { ticket: 'BRF-1', description: 'some work' });

    expect(screen.getByText('feat_BRF-1.some-work')).toBeInTheDocument();
  });

  it('offers both the full and abbreviated form of a type in the dropdown', async () => {
    const user = userEvent.setup({ delay: null });
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Branch type'), 'feature');
    await fillForm(user, { ticket: 'BRWT-1123', description: 'this is the branch name' });

    expect(screen.getByText('feature/BRWT-1123-this-is-the-branch-name')).toBeInTheDocument();
  });

  it('persists separator settings across a remount', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<App />);

    const [typeSeparator] = screen.getAllByLabelText('Separator');
    await user.clear(typeSeparator);
    await user.type(typeSeparator, '_');
    unmount();

    render(<App />);
    await fillForm(user, { description: 'Broken login' });

    expect(screen.getByText('feat_broken-login')).toBeInTheDocument();
  });

  it('restores persisted form values from localStorage', () => {
    window.localStorage.setItem(
      'branchify-form',
      JSON.stringify({ branchType: 'fix', ticketNumber: 'BRF-7', description: 'restore me' })
    );

    render(<App />);

    expect(screen.getByLabelText('Description')).toHaveValue('restore me');
    expect(screen.getByText('fix/BRF-7-restore-me')).toBeInTheDocument();
  });
});
