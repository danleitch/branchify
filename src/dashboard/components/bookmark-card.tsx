import { forwardRef, type HTMLAttributes, type MouseEvent, type PointerEvent } from 'react';
import { ArrowUpRight, Pencil, X } from 'lucide-react';
import type { Bookmark, BookmarkStyle } from '../lib/model';
import { displayUrl, hostOf } from '../lib/urls';
import { BookmarkIcon } from './bookmark-icon';
import { noDrag } from './no-drag';

type BookmarkCardProps = HTMLAttributes<HTMLLIElement> & {
  bookmark: Bookmark;
  variant: BookmarkStyle;
  newTab: boolean;
  editing?: boolean;
  /** The lifted copy that follows the pointer while dragging. */
  overlay?: boolean;
  /** The empty slot a dragged card will land in. */
  placeholder?: boolean;
  onEdit?: (bookmark: Bookmark) => void;
  onDelete?: (bookmark: Bookmark) => void;
  onMenu?: (bookmark: Bookmark, event: MouseEvent) => void;
};

/** Moves the card's soft spotlight to follow the pointer. */
const trackSpotlight = (event: PointerEvent<HTMLElement>): void => {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
};

export const BookmarkCard = forwardRef<HTMLLIElement, BookmarkCardProps>(
  (
    {
      bookmark,
      variant,
      newTab,
      editing = false,
      overlay = false,
      placeholder = false,
      onEdit,
      onDelete,
      onMenu,
      className,
      ...rest
    },
    ref
  ) => {
    const subtitle = bookmark.description || displayUrl(bookmark.url);

    return (
      <li
        ref={ref}
        className={[
          'bm',
          `bm--${variant}`,
          overlay && 'bm--overlay',
          placeholder && 'bm--placeholder',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerMove={trackSpotlight}
        {...rest}
      >
        <a
          className="bm-link"
          href={bookmark.url}
          target={newTab ? '_blank' : undefined}
          rel="noreferrer noopener"
          draggable={false}
          title={variant === 'tiles' ? `${bookmark.name}\n${subtitle}` : bookmark.url}
          onContextMenu={(event) => {
            if (onMenu) {
              event.preventDefault();
              onMenu(bookmark, event);
            }
          }}
        >
          <span className="bm-icon">
            <BookmarkIcon icon={bookmark.icon} url={bookmark.url} name={bookmark.name} />
          </span>
          <span className="bm-text">
            <span className="bm-name">{bookmark.name}</span>
            {variant === 'cards' && <span className="bm-desc">{subtitle}</span>}
          </span>
          {variant === 'list' && <span className="bm-host">{hostOf(bookmark.url)}</span>}
          {variant === 'cards' && <ArrowUpRight className="bm-go" size={15} aria-hidden="true" />}
        </a>

        {editing && !overlay && (
          <span className="bm-tools">
            <button
              type="button"
              className="bm-tool"
              aria-label={`Edit ${bookmark.name}`}
              {...noDrag}
              onClick={() => onEdit?.(bookmark)}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              className="bm-tool bm-tool--danger"
              aria-label={`Delete ${bookmark.name}`}
              {...noDrag}
              onClick={() => onDelete?.(bookmark)}
            >
              <X size={12} />
            </button>
          </span>
        )}
      </li>
    );
  }
);

BookmarkCard.displayName = 'BookmarkCard';
