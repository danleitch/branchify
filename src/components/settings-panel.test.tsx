import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './settings-panel';
import type { BranchSettings } from '../types';

const settings: BranchSettings = {
  useFullTypeName: false,
  typeSeparator: '/',
  ticketSeparator: '-'
};

describe('SettingsPanel', () => {
  it('hides the panel until the settings icon is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel settings={settings} onChange={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('dialog', { name: 'Branch naming settings' })).toBeInTheDocument();
  });

  it('reports the full type name toggle', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SettingsPanel settings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledWith({ useFullTypeName: true });
  });

  it('reports changes to the separators', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SettingsPanel settings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(screen.getByLabelText('Type / ticket separator'), '_');

    expect(onChange).toHaveBeenCalledWith({ typeSeparator: '/_' });
  });

  it('closes the panel when Done is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel settings={settings} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
