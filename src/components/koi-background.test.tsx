import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KoiBackground } from './koi-background';

describe('KoiBackground', () => {
  // jsdom has no 2D context, so this proves the component degrades instead of throwing.
  it('renders a canvas that is hidden from assistive technology', () => {
    const { container } = render(<KoiBackground recentBranches={[]} />);
    const canvas = container.querySelector('canvas');

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('survives the roster changing under it', () => {
    const { rerender, container } = render(<KoiBackground recentBranches={[]} />);

    rerender(
      <KoiBackground
        recentBranches={[{ value: 'feat/new', createdAt: '2026-01-01T00:00:00.000Z' }]}
      />
    );

    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
