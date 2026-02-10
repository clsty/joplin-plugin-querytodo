# Query TODO

Advanced TODO management for Joplin with JSON-based query summaries, filtering, sorting, and grouping.

<img width="1041" height="1617" alt="image" src="https://github.com/user-attachments/assets/38834c0c-b454-495f-9cfe-b5cbddae3999" />

**NOTE: This plugin is in early stage and should be considered alpha quality.**

## Features

- **Write TODOs anywhere** in your notes using markdown checkbox syntax
- **Query-based summaries** with JSON configuration for advanced filtering
- **Multi-level sorting and grouping** with custom sort orders
- **Customizable entry format** with template placeholders

## Installation

**Recommended method:**
1. Go to `Tools -> Options -> Plugins` (macOS: Joplin -> Preferences -> Plugins)
2. Search for "Query TODO"
3. Click Install and restart Joplin
4. Create a query summary note: `Tools -> Create Query summary note`

**Alternative method:**
Download `*.jpl` from [pre-release]() and install it from Joplin `Tools -> Options -> Plugins`, install from file and select this jpl file.

## Quick Start

### Basic TODO Format

Write inline TODO entries **everywhere** you want using the style like:
```markdown
- [ ] @category +tag1 +tag2 //2026-02-15 Your TODO text here
```

Components:
- `@category` - Single category (optional)
- `+tag` - Multiple tags (optional)
- `//YYYY-MM-DD` - Due date (optional)  
- Checkbox state: `[ ]` = open, `[x]` = done

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
  "entryFormat": "- {{{STATUS}}} {{{CATEGORY}}} {{{TAGS}}} {{{CONTENT}}} [link](:/{{{NOTE_ID}}})"
}
```
````

After reloading, the plugin will query your inline TODOs according to the config written in the `json:query-summary` block, and show the results above the block on this summary page (only for viewing, not editable).

## Query Configuration

### Query Types

Filter TODOs by:
- `CATEGORY` - Filter by category (`@work`, `@personal`, etc.)
- `TAG` - Filter by tag (`+urgent`, `+important`, etc.)
- `STATUS` - Filter by status (`open`, `done`)
- `NOTE` - Filter by note ID
  - _Summary notes themselves are already excluded from TODO extraction to prevent self-referencing._
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

## Plugin Settings

Access via `Tools -> Options -> Query TODO`

- **Apply styling to metalist style todos** - Apply styling in the markdown renderer (Restart Required) (default: true)
- **Force sync after summary note update** - Important for data consistency (default: true)
- **Refresh query summary notes when opening them** - Auto-refresh on note selection (default: false)
- **Auto-refresh query summary notes every N seconds** - Periodic auto-refresh (default: 0 = disabled, max: 86400)

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

## License

MIT

## Credits and History
This plugin was originally a fork of [Inline TODOs](https://github.com/CalebJohn/joplin-inline-todo) in terms of GitHub repo. It's been largely modified since then. Note that Query TODO is not a "plus" version of Inline TODOs, but a very different plugin.

This plugin has also been inspired by [Inline Tag Navigator](https://github.com/alondmnt/joplin-plugin-tag-navigator).

I created Query TODO because I spent days tweaking and switching between Inline TODOs and Inline Tag Navigator, and unfortunately neither suited my needs.
