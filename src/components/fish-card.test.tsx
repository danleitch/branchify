import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FishCard as FishCardData } from '../lib/koi-inspect';
import { FishCard } from './fish-card';

const NOW = new Date('2026-03-10T12:00:00.000Z');

const branchKoi: FishCardData = {
  key: 'feat/BRF-1-add-auth',
  kind: 'branch',
  name: 'Sora',
  nameMeaning: 'sky',
  species: 'Taisho Sanke',
  kanji: '大正三色',
  speciesMeaning: 'tricolour of the Taisho era',
  group: 'Gosanke',
  rarity: 'uncommon',
  traits: [],
  personality: ['Bold', 'Sociable'],
  blurb: 'Red and black on white.',
  ageClass: 'Nisai',
  lengthCm: 42,
  adultCm: null,
  worth: 180,
  appraised: true,
  paid: null,
  perDay: 0,
  acquiredAt: null,
  branch: 'feat/BRF-1-add-auth',
  activity: 'resting',
  genome: null
};

const marketKoi: FishCardData = {
  ...branchKoi,
  key: 'market:2026-03-01#0.0.0',
  kind: 'koi',
  name: 'Hana',
  nameMeaning: 'flower',
  species: 'Gin Rin Kohaku',
  traits: [{ label: 'Gin Rin', blurb: 'Sparkling scales.' }],
  rarity: 'rare',
  adultCm: 70,
  worth: 520,
  appraised: false,
  paid: 400,
  perDay: 6,
  acquiredAt: '2026-03-09T09:00:00.000Z',
  branch: null,
  activity: 'cruising'
};

const renderCard = (card: FishCardData, onClose = vi.fn()) =>
  render(<FishCard card={card} anchor={{ x: 100, y: 100 }} now={NOW} onClose={onClose} />);

describe('FishCard', () => {
  it('introduces a branch koi by name, variety, personality and the branch it swims for', () => {
    renderCard(branchKoi);
    const card = screen.getByRole('dialog', { name: /Sora/ });

    expect(within(card).getByText('Taisho Sanke')).toBeInTheDocument();
    expect(within(card).getByText('Branch koi')).toBeInTheDocument();
    expect(within(card).getByText('Resting in the water')).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Personality' })).toHaveTextContent(
      'BoldSociable'
    );
    expect(within(card).getByText('Appraised at')).toBeInTheDocument();
    expect(within(card).getByText(/not for sale/)).toBeInTheDocument();
    expect(within(card).getByText('feat/BRF-1-add-auth')).toBeInTheDocument();
    expect(within(card).queryByText('Paid')).not.toBeInTheDocument();
  });

  it('shows what a bought koi cost, what it is worth, and how long it has been in the pond', () => {
    renderCard(marketKoi);
    const card = screen.getByRole('dialog', { name: /Hana/ });

    expect(within(card).getByText('Rare')).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Traits' })).toHaveTextContent('Gin Rin');
    expect(within(card).getByText('Worth')).toBeInTheDocument();
    expect(within(card).getByText('520')).toBeInTheDocument();
    expect(within(card).getByText('400')).toBeInTheDocument();
    expect(within(card).getByText(/\+6 a day/)).toBeInTheDocument();
    expect(within(card).getByText('Joined yesterday')).toBeInTheDocument();
    expect(within(card).getByText('Nisai · 42 cm, could reach 70 cm')).toBeInTheDocument();
  });

  it('closes from its button and from Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderCard(branchKoi, onClose);

    await user.click(screen.getByRole('button', { name: "Close Sora's card" }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('only suggests dragging where the pond allows it', () => {
    const { rerender } = renderCard(branchKoi);
    expect(screen.getByText(/Drag a fish/)).toBeInTheDocument();

    rerender(
      <FishCard
        card={branchKoi}
        anchor={{ x: 100, y: 100 }}
        now={NOW}
        canDrag={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText(/Drag a fish/)).not.toBeInTheDocument();
  });
});
