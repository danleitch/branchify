import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './app';

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
  it('generates a branch name, git command, and PR title from the form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { ticket: 'BRF-123', description: 'Add user authentication' });

    expect(screen.getByText('feat/BRF-123-add-user-authentication')).toBeInTheDocument();
    expect(
      screen.getByText('git checkout -b "feat/BRF-123-add-user-authentication"')
    ).toBeInTheDocument();
    expect(screen.getByText('feat/BRF-123: Add user authentication.')).toBeInTheDocument();
  });

  it('shows a validation error on submit when the description is empty', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Generate' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/please fill all fields/i);
  });

  it('adds a generated branch to the recent list on submit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { description: 'Broken login' });
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    const recent = screen.getByRole('heading', { name: 'Recent branches' }).closest('section');
    expect(recent).not.toBeNull();
    expect(within(recent as HTMLElement).getByText('feat/broken-login')).toBeInTheDocument();
  });

  it('removes a branch from the recent list', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { description: 'Broken login' });
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    await user.click(screen.getByRole('button', { name: 'Remove feat/broken-login' }));

    // The recent list is now empty, so the whole section disappears (the branch
    // name still shows in the generated-output panel above it).
    expect(screen.queryByRole('heading', { name: 'Recent branches' })).not.toBeInTheDocument();
  });

  it('clears the form on reset', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { ticket: 'BRF-9', description: 'Some work' });
    expect(screen.getByText('feat/BRF-9-some-work')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Ticket number')).toHaveValue('');
    expect(screen.queryByText('feat/BRF-9-some-work')).not.toBeInTheDocument();
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
