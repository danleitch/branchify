/**
 * Every change a visitor can make to the board, as pure functions from one
 * config to the next. The hook keeps the previous config for undo, so none of
 * these need to worry about taking anything back.
 */
import {
  clampSpan,
  createBookmark,
  createGroup,
  createWidget,
  type Bookmark,
  type DashboardConfig,
  type Group,
  type Widget,
  type WidgetType
} from './model';

export const arrayMove = <T>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
};

export const findBookmark = (
  groups: readonly Group[],
  bookmarkId: string
): { group: Group; bookmark: Bookmark; index: number } | null => {
  for (const group of groups) {
    const index = group.bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);

    if (index !== -1) {
      return { group, bookmark: group.bookmarks[index], index };
    }
  }

  return null;
};

const mapGroup = (
  config: DashboardConfig,
  groupId: string,
  change: (group: Group) => Group
): DashboardConfig => ({
  ...config,
  groups: config.groups.map((group) => (group.id === groupId ? change(group) : group))
});

export type BookmarkFields = Omit<Bookmark, 'id'>;

/** Adds a bookmark to the end of a group; a group that doesn't exist yet is created by name. */
export const addBookmark = (
  config: DashboardConfig,
  target: { groupId: string } | { newGroup: string },
  fields: BookmarkFields
): { config: DashboardConfig; bookmark: Bookmark; groupId: string } => {
  const bookmark = createBookmark(fields);

  if ('newGroup' in target) {
    const group = { ...createGroup(target.newGroup), bookmarks: [bookmark] };
    return {
      config: { ...config, groups: [...config.groups, group] },
      bookmark,
      groupId: group.id
    };
  }

  return {
    config: mapGroup(config, target.groupId, (group) => ({
      ...group,
      collapsed: false,
      bookmarks: [...group.bookmarks, bookmark]
    })),
    bookmark,
    groupId: target.groupId
  };
};

export const updateBookmark = (
  config: DashboardConfig,
  bookmarkId: string,
  patch: Partial<BookmarkFields>
): DashboardConfig => ({
  ...config,
  groups: config.groups.map((group) =>
    group.bookmarks.some((bookmark) => bookmark.id === bookmarkId)
      ? {
          ...group,
          bookmarks: group.bookmarks.map((bookmark) =>
            bookmark.id === bookmarkId ? { ...bookmark, ...patch } : bookmark
          )
        }
      : group
  )
});

export const deleteBookmark = (config: DashboardConfig, bookmarkId: string): DashboardConfig => ({
  ...config,
  groups: config.groups.map((group) => ({
    ...group,
    bookmarks: group.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
  }))
});

/** Moves a bookmark to a place in a group, which may be the one it is already in. */
export const moveBookmark = (
  groups: readonly Group[],
  bookmarkId: string,
  toGroupId: string,
  toIndex: number
): Group[] => {
  const found = findBookmark(groups, bookmarkId);

  if (!found) {
    return [...groups];
  }

  if (found.group.id === toGroupId) {
    return groups.map((group) =>
      group.id === toGroupId
        ? { ...group, bookmarks: arrayMove(group.bookmarks, found.index, toIndex) }
        : group
    );
  }

  return groups.map((group) => {
    if (group.id === found.group.id) {
      return { ...group, bookmarks: group.bookmarks.filter((item) => item.id !== bookmarkId) };
    }

    if (group.id === toGroupId) {
      const bookmarks = [...group.bookmarks];
      bookmarks.splice(Math.max(0, Math.min(toIndex, bookmarks.length)), 0, found.bookmark);
      return { ...group, bookmarks };
    }

    return group;
  });
};

export const addGroup = (
  config: DashboardConfig,
  name: string,
  patch: Partial<Omit<Group, 'id' | 'bookmarks'>> = {}
): { config: DashboardConfig; group: Group } => {
  const group = { ...createGroup(name), ...patch };
  return { config: { ...config, groups: [...config.groups, group] }, group };
};

export const updateGroup = (
  config: DashboardConfig,
  groupId: string,
  patch: Partial<Omit<Group, 'id'>>
): DashboardConfig =>
  mapGroup(config, groupId, (group) => ({
    ...group,
    ...patch,
    ...(patch.width !== undefined ? { width: clampSpan(patch.width) } : {})
  }));

export const deleteGroup = (config: DashboardConfig, groupId: string): DashboardConfig => ({
  ...config,
  groups: config.groups.filter((group) => group.id !== groupId)
});

export const moveGroup = (config: DashboardConfig, from: number, to: number): DashboardConfig => ({
  ...config,
  groups: arrayMove(config.groups, from, to)
});

export const addWidget = (
  config: DashboardConfig,
  type: WidgetType
): { config: DashboardConfig; widget: Widget } => {
  const widget = createWidget(type);
  return { config: { ...config, widgets: [...config.widgets, widget] }, widget };
};

export const updateWidget = (
  config: DashboardConfig,
  widgetId: string,
  patch: Partial<Widget>
): DashboardConfig => ({
  ...config,
  widgets: config.widgets.map((widget) =>
    widget.id === widgetId
      ? ({
          ...widget,
          ...patch,
          ...(patch.width !== undefined ? { width: clampSpan(patch.width) } : {}),
          id: widget.id,
          type: widget.type
        } as Widget)
      : widget
  )
});

export const deleteWidget = (config: DashboardConfig, widgetId: string): DashboardConfig => ({
  ...config,
  widgets: config.widgets.filter((widget) => widget.id !== widgetId)
});

export const moveWidget = (config: DashboardConfig, from: number, to: number): DashboardConfig => ({
  ...config,
  widgets: arrayMove(config.widgets, from, to)
});

/** Adds imported groups after the existing ones, merging into any group with the same name. */
export const mergeGroups = (
  config: DashboardConfig,
  incoming: readonly Group[]
): DashboardConfig => {
  const groups = config.groups.map((group) => ({ ...group, bookmarks: [...group.bookmarks] }));

  for (const group of incoming) {
    const existing = groups.find(
      (candidate) => candidate.name.toLowerCase() === group.name.toLowerCase()
    );

    if (!existing) {
      groups.push(group);
      continue;
    }

    const known = new Set(existing.bookmarks.map((bookmark) => bookmark.url));
    existing.bookmarks.push(...group.bookmarks.filter((bookmark) => !known.has(bookmark.url)));
  }

  return { ...config, groups };
};
