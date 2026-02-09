# Query TODO

Advanced TODO management for Joplin with JSON-based query summaries, filtering, sorting, and grouping.

## Features

- **Write TODOs anywhere** in your notes using markdown checkbox syntax
- **Query-based summaries** with JSON configuration for advanced filtering
- **Multi-level sorting and grouping** with custom sort orders
- **Customizable entry format** with template placeholders
- **Auto-reload** with configurable intervals
- **Multiple summary types** including regular summaries and query summaries

## Installation

1. Go to `Tools -> Options -> Plugins` (macOS: Joplin -> Preferences -> Plugins)
2. Search for "Query TODO"
3. Click Install and restart Joplin
4. Create a summary note: `Tools -> Create TODO summary note` or `Tools -> Create Query summary note`

## Quick Start

### Basic TODO Format

Use metalist style (recommended):
```markdown
- [ ] @category +tag1 +tag2 //2026-02-15 Your TODO text here
```

Components:
- `@category` - Single category (required for plugin to detect)
- `+tag` - Multiple tags (optional)
- `//YYYY-MM-DD` - Due date (optional)  
- Checkbox state: `[ ]` = open, `[x]` = done

### Regular Summary Note

Create with `Tools -> Create TODO summary note`:
```markdown
<!-- inline-todo-plugin -->
```

Automatically shows all TODOs from all notes.

### Query Summary Note

Create with `Tools -> Create Query summary note`:
````markdown
```json:query-summary
{
  "query": {
    "AND": [
      {"CATEGORY": "work"},
      {"STATUS": "open"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "ascend"
    }
  ],
  "groupLevel": 1,
  "entryFormat": "- {{{STATUS}}} {{{CATEGORY}}} {{{TAGS}}} {{{CONTENT}}} [link](:/{{{NOTE_ID}}})",
  "openReload": false,
  "reloadPeriodSecond": 0,
  "forceSyncWhenReload": true
}
```
````

## Query Configuration

### Query Types

Filter TODOs by:
- `CATEGORY` - Filter by category (`@work`, `@personal`, etc.)
- `TAG` - Filter by tag (`+urgent`, `+important`, etc.)
- `STATUS` - Filter by status (`open`, `done`)
- `NOTE` - Filter by note ID
- `NOTEBOOK` - Filter by notebook ID (supports `recursive: true`)
- `AND` - All conditions must match
- `OR` - At least one condition must match

All queries support `negated: true` to invert the match.

### Sorting

Sort by `category`, `tag`, `date`, or `status` with:
- `ascend` - Ascending order
- `descend` - Descending order
- `custom` - Custom order with `sortOrderCustom: "val1,val2,val3"`

### Entry Format

Customize TODO display with placeholders:
- `{{{STATUS}}}` - `[ ]` or `[x]`
- `{{{CATEGORY}}}` - `@category`
- `{{{TAGS}}}` - `+tag1 +tag2`
- `{{{DATE}}}` - `//YYYY-MM-DD`
- `{{{CONTENT}}}` - TODO text
- `{{{NOTE_ID}}}` - Source note ID
- `{{{NOTE_TITLE}}}` - Source note title
- `{{{NOTEBOOK}}}` - Parent notebook name

### Auto-Reload

- `openReload: true` - Refresh when opening the note (default: false)
- `reloadPeriodSecond: 30` - Auto-refresh every N seconds (default: 0 = disabled)
- `forceSyncWhenReload: true` - Sync after refresh (default: true)

## Examples

### Filter work TODOs by priority
```json
{
  "query": {
    "AND": [
      {"CATEGORY": "work"},
      {"STATUS": "open"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "tag",
      "sortOrder": "custom",
      "sortOrderCustom": "urgent,high,normal,low"
    }
  ],
  "groupLevel": 1
}
```

### Show TODOs NOT from work
```json
{
  "query": {
    "CATEGORY": "work",
    "negated": true
  }
}
```

### Multi-level grouping
```json
{
  "query": {"STATUS": "open"},
  "sortOptions": [
    {"sortLevel": "1", "sortBy": "category", "sortOrder": "ascend"},
    {"sortLevel": "2", "sortBy": "date", "sortOrder": "ascend"}
  ],
  "groupLevel": 2
}
```

### Custom format with links
```json
{
  "query": {"STATUS": "open"},
  "entryFormat": "[{{{CONTENT}}}](:/{{{NOTE_ID}}}) - {{{CATEGORY}}} {{{DATE}}}"
}
```

## Settings

Access via `Tools -> Options -> Query TODO`

- **TODO Style** - Choose metalist, link, or plain style
- **Summary Format** - Choose display format (list, table, diary)
- **Sort By** - Default sort order
- **Auto Refresh** - Refresh summary when opening notes
- **Custom Editor** - Use custom summary editor UI

## Notes

- Summary notes are excluded from TODO extraction to prevent self-referencing
- **Query summary refresh**: Enable "Custom editor for summary notes" in settings (Tools -> Options -> Query TODO). When viewing a query summary note, a "Toggle editor plugin" button (eye icon) will appear in the note toolbar. Click it to switch to the custom editor view, which includes a refresh button.
- The "Toggle editor plugin" button only appears on query summary notes (not on regular notes or regular summary notes)
- Regular summaries use global settings, query summaries use per-note JSON config
- TODOs without special fields (@, +, //) won't be detected

## License

MIT
