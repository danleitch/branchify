import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Koi3dBackground } from './koi3d-background';
import type { RecentBranch } from '../types';

const branches: RecentBranch[] = [
  { value: 'feat/BRF-1-add-auth', createdAt: '2026-01-01T00:00:00.000Z' },
  { value: 'fix/BRF-2-broken-login', createdAt: '2026-01-02T00:00:00.000Z' }
];

describe('Koi3dBackground', () => {
  // jsdom has no WebGL, so these run the path a visitor on a machine that
  // cannot give us a context takes.
  it('falls back to the 2D pond when WebGL is unavailable', () => {
    const { container } = render(<Koi3dBackground recentBranches={branches} />);
    const canvases = container.querySelectorAll('canvas');

    // The 3D pond paints water and koi on two canvases; the 2D one needs only one.
    expect(canvases).toHaveLength(1);
    expect(canvases[0]).toHaveClass('koi-pond');
    expect(canvases[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not throw when the roster changes under it', () => {
    const { rerender, container } = render(<Koi3dBackground recentBranches={branches} />);

    rerender(<Koi3dBackground recentBranches={[]} />);

    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
