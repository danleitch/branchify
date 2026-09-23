import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KoiMarketButton } from './koi-market-button';

describe('KoiMarketButton', () => {
  it('says how many coins the visitor has, and when there is new stock', () => {
    const { rerender } = render(
      <KoiMarketButton coins={120} hasNewStock reward={null} expanded={false} onClick={vi.fn()} />
    );

    expect(
      screen.getByRole('button', { name: 'Koi market, 120 coins, new koi today' })
    ).toBeInTheDocument();

    rerender(
      <KoiMarketButton
        coins={95}
        hasNewStock={false}
        reward={null}
        expanded={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Koi market, 95 coins' })).toBeInTheDocument();
  });

  it('opens the market when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <KoiMarketButton
        coins={0}
        hasNewStock={false}
        reward={null}
        expanded={false}
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /Koi market/ }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('announces a payout as it lands', () => {
    render(
      <KoiMarketButton
        coins={125}
        hasNewStock={false}
        reward={{ id: 1, coins: 25 }}
        expanded={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Earned 25 coins for a new branch.');
  });
});
