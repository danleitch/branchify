import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  buyListing,
  createAccount,
  dismissWelcome,
  releaseKoi,
  type KoiAccount
} from '../lib/koi-account';
import { dailyStock } from '../lib/koi-market';
import { KoiMarket } from './koi-market';

const DAY = '2026-09-23';

/** The market over a real account, so buying and releasing actually move coins. */
const Harness = ({
  initial,
  onClose = vi.fn()
}: {
  initial: KoiAccount;
  onClose?: () => void;
}): JSX.Element => {
  const [account, setAccount] = useState(initial);

  return (
    <KoiMarket
      account={account}
      day={DAY}
      onBuy={(listing) => {
        const result = buyListing(account, listing, new Date());
        setAccount(result.account);
        return result.outcome;
      }}
      onRelease={(id) => {
        const result = releaseKoi(account, id);
        setAccount(result.account);
        return result.refund;
      }}
      onDismissWelcome={() => setAccount(dismissWelcome(account))}
      onClose={onClose}
    />
  );
};

const accountWith = (coins: number): KoiAccount => ({
  ...createAccount([], DAY),
  coins,
  welcome: null
});

/** Portraits resolve asynchronously; tests wait for them so nothing updates after they end. */
const settled = async (): Promise<void> =>
  waitFor(() => expect(document.querySelector('.koi-photo[data-state="loading"]')).toBeNull());

describe('KoiMarket', () => {
  it('shows the day’s six koi with their names, varieties and prices', async () => {
    render(<Harness initial={accountWith(50)} />);
    await settled();

    const dialog = screen.getByRole('dialog', { name: 'Koi Market' });
    const cards = within(dialog).getAllByRole('article');
    const stock = dailyStock(DAY);

    expect(cards).toHaveLength(6);
    expect(within(cards[0]!).getByRole('heading', { level: 3 })).toHaveTextContent(stock[0]!.name);
    expect(within(dialog).getByText(/restocks in/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('50 coins')).toBeInTheDocument();
  });

  it('says how much more a visitor needs for a fish they can’t afford', async () => {
    render(<Harness initial={accountWith(0)} />);
    await settled();

    const cheapest = [...dailyStock(DAY)].sort((a, b) => a.price - b.price)[0]!;

    expect(screen.getByRole('button', { name: `Need ${cheapest.price} more` })).toBeDisabled();
  });

  it('buys a koi: coins go, the fish joins the pond, and the card says so', async () => {
    const user = userEvent.setup();
    const listing = dailyStock(DAY)[0]!;
    render(<Harness initial={accountWith(5000)} />);
    await settled();

    await user.click(
      screen.getByRole('button', { name: `Buy ${listing.name} for ${listing.price} coins` })
    );

    expect(screen.getByLabelText(`${5000 - listing.price} coins`)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${listing.name} is swimming in your pond`
    );
    expect(screen.getByRole('status')).toHaveTextContent('branch koi will rest');
    expect(screen.getByRole('tab', { name: /Your pond/ })).toHaveTextContent('1/10');

    const card = screen.getByRole('article', { name: new RegExp(listing.name) });
    expect(within(card).getByRole('button', { name: /In your pond/ })).toBeDisabled();
  });

  it('releases a koi only after asking, and pays half back', async () => {
    const user = userEvent.setup();
    const listing = dailyStock(DAY)[0]!;
    const owned = buyListing(accountWith(listing.price), listing, new Date()).account;
    render(<Harness initial={owned} />);

    await user.click(screen.getByRole('tab', { name: /Your pond/ }));
    await settled();
    expect(screen.getByRole('heading', { name: listing.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Release ${listing.name}` }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByRole('heading', { name: listing.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Release ${listing.name}` }));
    await user.click(screen.getByRole('button', { name: 'Release' }));

    const refund = Math.floor(listing.price / 2 / 5) * 5;
    expect(screen.queryByRole('heading', { name: listing.name })).not.toBeInTheDocument();
    expect(screen.getByLabelText(`${refund} coins`)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('branch koi are back in the pond');
  });

  it('explains an empty pond and leads back to the tank', async () => {
    const user = userEvent.setup();
    render(<Harness initial={accountWith(0)} />);
    await settled();

    await user.click(screen.getByRole('tab', { name: /Your pond/ }));
    expect(screen.getByText(/No market koi yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "See today's koi" }));
    expect(screen.getByRole('tab', { name: "Today's koi" })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('welcomes a new account until the visitor dismisses it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={createAccount(['feat/a', 'fix/b'], DAY)} />);
    await settled();

    expect(screen.getByText(/Welcome to the market/).closest('p')).toHaveTextContent(
      'plus 25 for each of your 2 recent branches'
    );

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText(/Welcome to the market/)).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness initial={accountWith(0)} onClose={onClose} />);
    await settled();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
