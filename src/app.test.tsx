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
    await user.type(screen.getByLabelText('Ticket ID'), ticket);
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
    expect(screen.getByLabelText('Ticket ID')).toHaveValue('');
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

  describe('branch type settings', () => {
    const openSettings = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      return screen.getByRole('dialog', { name: 'Settings' });
    };

    it('adds a custom type that can be used in the branch name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);
      await user.type(within(dialog).getByLabelText('New branch type'), 'Bug{Enter}');
      await user.click(within(dialog).getByRole('button', { name: 'Close settings' }));

      await user.selectOptions(screen.getByLabelText('Branch type'), 'bug');
      await fillForm(user, { description: 'Broken login' });

      expect(screen.getByText('bug/broken-login')).toBeInTheDocument();
    });

    it('rejects duplicate and invalid types', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);
      await user.type(within(dialog).getByLabelText('New branch type'), 'feat{Enter}');
      expect(within(dialog).getByRole('alert')).toHaveTextContent('already exists');

      await user.clear(within(dialog).getByLabelText('New branch type'));
      await user.type(within(dialog).getByLabelText('New branch type'), '!!!{Enter}');
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Use letters');
    });

    it('removes a type and restores the defaults', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('button', { name: 'Remove type style' }));
      expect(screen.queryByRole('option', { name: 'style' })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: 'Remove type style' })).toBeNull();

      await user.click(within(dialog).getByRole('button', { name: 'Restore defaults' }));
      expect(within(dialog).getByRole('button', { name: 'Remove type style' })).toBeInTheDocument();
    });

    it('closes on Escape and returns focus to the settings button', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      await openSettings(user);
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
    });

    it('persists custom types across a remount', async () => {
      const user = userEvent.setup({ delay: null });
      const { unmount } = render(<App />);

      const dialog = await openSettings(user);
      await user.type(within(dialog).getByLabelText('New branch type'), 'bug{Enter}');
      unmount();

      render(<App />);

      expect(screen.getByRole('option', { name: 'bug' })).toBeInTheDocument();
    });

    it('keeps a removed type selectable while it is the current selection', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('button', { name: 'Remove type feat' }));

      expect(screen.getByLabelText('Branch type')).toHaveValue('feat');
    });
  });

  describe('AI shorten icons setting', () => {
    const openSettings = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      return screen.getByRole('dialog', { name: 'Settings' });
    };

    it('shows the icons by default and hides them when the toggle is turned off', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);
      expect(screen.getByRole('group', { name: 'Shorten with AI' })).toBeInTheDocument();

      const dialog = await openSettings(user);
      const toggle = within(dialog).getByRole('checkbox', { name: /AI shorten icons/ });
      expect(toggle).toBeChecked();

      await user.click(toggle);
      expect(screen.queryByRole('group', { name: 'Shorten with AI' })).not.toBeInTheDocument();

      await user.click(toggle);
      expect(screen.getByRole('group', { name: 'Shorten with AI' })).toBeInTheDocument();
    });

    it('persists the choice across a remount', async () => {
      const user = userEvent.setup({ delay: null });
      const { unmount } = render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('checkbox', { name: /AI shorten icons/ }));
      unmount();

      render(<App />);

      expect(screen.queryByRole('group', { name: 'Shorten with AI' })).not.toBeInTheDocument();
    });
  });

  describe('loading recent branches', () => {
    const recentSection = (): HTMLElement =>
      screen.getByRole('heading', { name: 'Recent branches' }).closest('section') as HTMLElement;

    it('loads a saved branch back into the form so all outputs are available', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      await fillForm(user, { ticket: 'BRF-5', description: 'Old work' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS);
      });
      await user.click(screen.getByRole('button', { name: 'Reset form' }));
      expect(screen.queryByText('git checkout -b "feat/BRF-5-old-work"')).not.toBeInTheDocument();

      await user.click(
        within(recentSection()).getByRole('button', { name: 'Load feat/BRF-5-old-work' })
      );

      expect(screen.getByLabelText('Ticket ID')).toHaveValue('BRF-5');
      expect(screen.getByLabelText('Description')).toHaveValue('Old work');
      expect(screen.getByText('git checkout -b "feat/BRF-5-old-work"')).toBeInTheDocument();
      expect(screen.getByText('feat/BRF-5: Old work.')).toBeInTheDocument();
    });

    it('restores the separators used when the branch was saved', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const [typeSeparator] = screen.getAllByLabelText('Separator');
      await user.clear(typeSeparator);
      await user.type(typeSeparator, '_');
      await fillForm(user, { description: 'Some work' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS);
      });

      await user.clear(screen.getAllByLabelText('Separator')[0]);
      await user.type(screen.getAllByLabelText('Separator')[0], '/');
      await user.click(
        within(recentSection()).getByRole('button', { name: 'Load feat_some-work' })
      );

      expect(screen.getAllByLabelText('Separator')[0]).toHaveValue('_');
      expect(screen.getByText('git checkout -b "feat_some-work"')).toBeInTheDocument();
    });

    it('loads legacy entries that were saved without a form snapshot', async () => {
      const user = userEvent.setup({ delay: null });
      window.localStorage.setItem(
        'branchify-recent',
        JSON.stringify([{ value: 'fix/BRF-7-restore-me', createdAt: '2026-01-01T00:00:00.000Z' }])
      );
      render(<App />);

      await user.click(
        within(recentSection()).getByRole('button', { name: 'Load fix/BRF-7-restore-me' })
      );

      expect(screen.getByLabelText('Branch type')).toHaveValue('fix');
      expect(screen.getByLabelText('Ticket ID')).toHaveValue('BRF-7');
      expect(screen.getByLabelText('Description')).toHaveValue('restore me');
    });

    it('disables Load for legacy entries that cannot be parsed', () => {
      window.localStorage.setItem(
        'branchify-recent',
        JSON.stringify([{ value: 'weird-name', createdAt: '2026-01-01T00:00:00.000Z' }])
      );
      render(<App />);

      expect(
        within(recentSection()).getByRole('button', { name: 'Load weird-name' })
      ).toBeDisabled();
    });
  });

  describe('AI shortening links', () => {
    it('shows inert ChatGPT and Claude icons until there is a branch name', () => {
      render(<App />);

      expect(screen.getByRole('link', { name: 'Shorten in ChatGPT' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByRole('link', { name: 'Shorten in Claude' })).not.toHaveAttribute('href');
    });

    it('links out to both assistants with the branch name in the prompt', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      await fillForm(user, { ticket: 'BRF-1', description: 'Add user authentication' });

      const claude = screen.getByRole('link', { name: 'Shorten in Claude' });
      const chatgpt = screen.getByRole('link', { name: 'Shorten in ChatGPT' });
      const prompt = (link: HTMLElement): string =>
        new URL(link.getAttribute('href') as string).searchParams.get('q') as string;

      expect(claude.getAttribute('href')).toMatch(/^https:\/\/claude\.ai\/new\?q=/);
      expect(chatgpt.getAttribute('href')).toMatch(/^https:\/\/chatgpt\.com\/\?q=/);
      expect(prompt(claude)).toContain('Add user authentication');
      expect(claude).toHaveAttribute('target', '_blank');
      expect(claude).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('background setting', () => {
    const openSettings = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      return screen.getByRole('dialog', { name: 'Settings' });
    };

    it('swims the koi pond by default', () => {
      const { container } = render(<App />);

      expect(container.querySelector('canvas.koi-pond')).toBeInTheDocument();
    });

    it('switches to a plain background and drops the pond', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('radio', { name: 'Plain' }));

      expect(container.querySelector('canvas.koi-pond')).not.toBeInTheDocument();
    });

    it('remembers the chosen background across a remount', async () => {
      const user = userEvent.setup({ delay: null });
      const { unmount } = render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('radio', { name: 'Plain' }));
      unmount();

      const { container } = render(<App />);

      expect(container.querySelector('canvas.koi-pond')).not.toBeInTheDocument();
    });

    it('falls back to the koi pond when the stored value is nonsense', () => {
      window.localStorage.setItem('branchify-background', 'aquarium');

      const { container } = render(<App />);

      expect(container.querySelector('canvas.koi-pond')).toBeInTheDocument();
    });
  });

  describe('base fish count setting', () => {
    const openSettings = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      return screen.getByRole('dialog', { name: 'Settings' });
    };

    it('defaults to 2 fish always in the pond', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);

      expect(within(dialog).getByRole('combobox', { name: 'Fish always in the pond' })).toHaveValue(
        '2'
      );
    });

    it('only offers the setting while the koi pond is selected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);
      await user.click(within(dialog).getByRole('radio', { name: 'Plain' }));

      expect(
        within(dialog).queryByRole('combobox', { name: 'Fish always in the pond' })
      ).not.toBeInTheDocument();

      await user.click(within(dialog).getByRole('radio', { name: 'Koi pond' }));

      expect(
        within(dialog).getByRole('combobox', { name: 'Fish always in the pond' })
      ).toBeInTheDocument();
    });

    it('remembers a raised base fish count across a remount', async () => {
      const user = userEvent.setup({ delay: null });
      const { unmount } = render(<App />);

      const dialog = await openSettings(user);
      await user.selectOptions(
        within(dialog).getByRole('combobox', { name: 'Fish always in the pond' }),
        '5'
      );
      unmount();

      render(<App />);
      const reopened = await openSettings(user);

      expect(
        within(reopened).getByRole('combobox', { name: 'Fish always in the pond' })
      ).toHaveValue('5');
    });

    it('falls back to the default for a corrupt stored value', async () => {
      window.localStorage.setItem('branchify-koi-base-fish', 'a lot');
      const user = userEvent.setup({ delay: null });
      render(<App />);

      const dialog = await openSettings(user);

      expect(within(dialog).getByRole('combobox', { name: 'Fish always in the pond' })).toHaveValue(
        '2'
      );
    });
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
