# Query Summary Test

This note contains a comprehensive query summary configuration to test the Query TODO plugin's various features.

## Query Summary 1: All Open Work TODOs

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
      "sortBy": "tag",
      "sortOrder": "custom",
      "sortOrderCustom": "urgent,important,review"
    }
  ],
  "groupLevel": 1,
  "entryFormat": "- {{{STATUS}}} {{{CATEGORY}}} {{{TAGS}}} {{{DATE}}} {{{CONTENT}}} [→](:/{{{NOTE_ID}}})"
}
```
````

**Expected:** Should show all open @work TODOs, grouped and sorted by tag priority (urgent > important > review)

---

## Query Summary 2: Personal TODOs with Due Dates

````markdown
```json:query-summary
{
  "query": {
    "AND": [
      {"CATEGORY": "personal"},
      {"STATUS": "open"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "date",
      "sortOrder": "ascend"
    }
  ],
  "entryFormat": "{{{STATUS}}} **{{{DATE}}}** - {{{CONTENT}}} ({{{CATEGORY}}})"
}
```
````

**Expected:** Should show all open @personal TODOs, sorted by due date (earliest first)

---

## Query Summary 3: All Urgent TODOs (Any Category)

````markdown
```json:query-summary
{
  "query": {
    "AND": [
      {"TAG": "urgent"},
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
  "groupLevel": 1
}
```
````

**Expected:** Should show all open TODOs with +urgent tag, grouped by category

---

## Query Summary 4: Multi-Level Grouping (Category > Date)

````markdown
```json:query-summary
{
  "query": {
    "STATUS": "open"
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "ascend"
    },
    {
      "sortLevel": "2",
      "sortBy": "date",
      "sortOrder": "ascend"
    }
  ],
  "groupLevel": 2,
  "entryFormat": "- {{{STATUS}}} {{{CONTENT}}} - Due: {{{DATE}}} | Tags: {{{TAGS}}}"
}
```
````

**Expected:** Should show all open TODOs, first grouped by category, then by date within each category

---

## Query Summary 5: Negated Query (NOT work)

````markdown
```json:query-summary
{
  "query": {
    "CATEGORY": "work",
    "negated": true
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "descend"
    }
  ]
}
```
````

**Expected:** Should show all TODOs that are NOT in @work category, sorted by category (descending)

---

## Query Summary 6: OR Query (Multiple Categories)

````markdown
```json:query-summary
{
  "query": {
    "OR": [
      {"CATEGORY": "study"},
      {"CATEGORY": "documentation"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "ascend"
    }
  ],
  "entryFormat": "- [{{{CONTENT}}}](:/{{{NOTE_ID}}}) - {{{CATEGORY}}} {{{TAGS}}} {{{DATE}}}"
}
```
````

**Expected:** Should show all TODOs from either @study or @documentation categories

---

## Query Summary 7: Complex AND/OR Combination

````markdown
```json:query-summary
{
  "query": {
    "AND": [
      {
        "OR": [
          {"TAG": "urgent"},
          {"TAG": "critical"}
        ]
      },
      {"STATUS": "open"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "date",
      "sortOrder": "ascend"
    }
  ],
  "entryFormat": "🔥 {{{STATUS}}} {{{CONTENT}}} ({{{CATEGORY}}}) - {{{DATE}}}"
}
```
````

**Expected:** Should show open TODOs that have either +urgent or +critical tag, sorted by date

---

## Query Summary 8: All Completed TODOs

````markdown
```json:query-summary
{
  "query": {
    "STATUS": "done"
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "ascend"
    }
  ],
  "groupLevel": 1,
  "entryFormat": "- {{{STATUS}}} ~~{{{CONTENT}}}~~ ({{{CATEGORY}}})"
}
```
````

**Expected:** Should show all completed TODOs, grouped by category, with strikethrough formatting

---

## Query Summary 9: Full Template Test (All Placeholders)

````markdown
```json:query-summary
{
  "query": {
    "AND": [
      {"CATEGORY": "work"},
      {"STATUS": "open"}
    ]
  },
  "entryFormat": "{{{STATUS}}} **{{{CONTENT}}}**\n  - Category: {{{CATEGORY}}}\n  - Tags: {{{TAGS}}}\n  - Date: {{{DATE}}}\n  - Note: [{{{NOTE_TITLE}}}](:/{{{NOTE_ID}}})\n  - Notebook: {{{NOTEBOOK}}}"
}
```
````

**Expected:** Should display all available template placeholders for each TODO

---

## Query Summary 10: Custom Sort Order

````markdown
```json:query-summary
{
  "query": {
    "STATUS": "open"
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "custom",
      "sortOrderCustom": "urgent-work,work,study,personal"
    }
  ],
  "groupLevel": 1
}
```
````

**Expected:** Should show all open TODOs grouped and ordered by custom category sequence

---

## Test Instructions

1. Copy this note into Joplin
2. Create the test/note.md in Joplin as well (it contains the actual TODO items)
3. For each query summary block above:
   - Create a new Query Summary note using the plugin
   - Replace the generated JSON with the configuration shown above
   - Verify the output matches the expected result
4. Test the following features:
   - Toolbar refresh button (should update the summary)
   - Context menu "Toggle TODO" (should toggle status and update summary)
   - Auto-refresh on note open (if enabled in settings)
   - Periodic auto-refresh (if configured in settings)
