import { useState, type FocusEvent } from 'react';

type Wakers = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

/**
 * Pointing at a koi's card, or tabbing into it, wakes its koi.
 *
 * Spread `wakers` onto the card and hand `awake` to its portrait. Focus moving
 * between two controls inside the same card keeps the koi awake.
 */
export const useAwake = (): { awake: boolean; wakers: Wakers } => {
  const [awake, setAwake] = useState(false);

  return {
    awake,
    wakers: {
      onPointerEnter: () => setAwake(true),
      onPointerLeave: () => setAwake(false),
      onFocus: () => setAwake(true),
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setAwake(false);
        }
      }
    }
  };
};
