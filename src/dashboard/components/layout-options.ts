import { LayoutGrid, List, Rows3, type LucideIcon } from 'lucide-react';
import type { BookmarkStyle } from '../lib/model';

/** The three ways a group can lay out its bookmarks. */
export const STYLE_CHOICES: readonly {
  value: BookmarkStyle;
  text: string;
  icon: LucideIcon;
  title: string;
}[] = [
  { value: 'cards', text: 'Cards', icon: Rows3, title: 'Icon, name and description' },
  { value: 'tiles', text: 'Tiles', icon: LayoutGrid, title: 'Big icons, like a launcher' },
  { value: 'list', text: 'List', icon: List, title: 'Compact rows' }
];

/** Widths a group or widget can take, as fractions of the 12-column board. */
export const WIDTH_OPTIONS = [
  { value: '3', label: '¼', title: 'A quarter of the board' },
  { value: '4', label: '⅓', title: 'A third of the board' },
  { value: '6', label: '½', title: 'Half the board' },
  { value: '8', label: '⅔', title: 'Two thirds of the board' },
  { value: '12', label: 'Full', title: 'The whole width' }
] as const;
