# Query Summary Note Feature

## Overview

The Query Summary Note feature extends the Joplin Inline TODO plugin with advanced JSON-based filtering and sorting capabilities. Instead of using the simple notebook name filtering (`<!-- inline-todo-plugin "notebook1" "notebook2" -->`), you can now use JSON queries to create highly customized TODO summaries.

## Usage

To create a query summary note, add a JSON code block with the special tag `json:query-summary` to your note:

\`\`\`markdown
\`\`\`json:query-summary
{
  "query": {
    "CATEGORY": "work"
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
\`\`\`
\`\`\`

The plugin will automatically detect this format and generate the summary based on your query configuration.

## Query Types

### CATEGORY Query

Match TODOs by category (e.g., `@work`, `@personal`):

\`\`\`json
{
  "CATEGORY": "work",
  "negated": false
}
\`\`\`

Example matching TODO:
\`\`\`markdown
- [ ] @work Complete the project report
\`\`\`

### TAG Query

Match TODOs that contain specific tags (e.g., `+urgent`, `+health`):

\`\`\`json
{
  "TAG": "urgent",
  "negated": false
}
\`\`\`

Example matching TODO:
\`\`\`markdown
- [ ] @work +urgent +important Finish presentation
\`\`\`

### NOTE Query

Match TODOs from a specific note by its ID:

\`\`\`json
{
  "NOTE": "2c34493c934c4a7da846fc30850bc8ce",
  "negated": false
}
\`\`\`

The note ID is the same as the one used in Joplin's external links.

### NOTEBOOK Query

Match TODOs from a specific notebook by its ID:

\`\`\`json
{
  "NOTEBOOK": "82c9a115561e4d21823183daaea32f86",
  "recursive": false,
  "negated": false
}
\`\`\`

- `recursive`: When `true`, includes TODOs from child notebooks as well
- The notebook ID is the same as the one used in Joplin's external links

### STATUS Query

Match TODOs by their completion status (following XIT standard):

\`\`\`json
{
  "STATUS": "open",
  "negated": false
}
\`\`\`

Supported statuses:
- `open`: Incomplete TODOs (`- [ ]`)
- `done`: Completed TODOs (`- [x]`)

### AND Query

Combine multiple queries with AND logic (all conditions must match):

\`\`\`json
{
  "AND": [
    {"CATEGORY": "work"},
    {"TAG": "urgent"},
    {"STATUS": "open"}
  ]
}
\`\`\`

This matches TODOs that are in the "work" category, have the "urgent" tag, AND are open.

### OR Query

Combine multiple queries with OR logic (at least one condition must match):

\`\`\`json
{
  "OR": [
    {"CATEGORY": "work"},
    {"CATEGORY": "personal"}
  ]
}
\`\`\`

This matches TODOs that are either in the "work" category OR the "personal" category.

### Negation

All query types support the `negated` option to invert the match:

\`\`\`json
{
  "CATEGORY": "work",
  "negated": true
}
\`\`\`

This matches all TODOs that are NOT in the "work" category.

### Nested Queries

You can nest AND and OR queries for complex logic:

\`\`\`json
{
  "AND": [
    {
      "OR": [
        {"CATEGORY": "work"},
        {"CATEGORY": "personal"}
      ]
    },
    {"TAG": "urgent"},
    {"STATUS": "open"}
  ]
}
\`\`\`

This matches TODOs that are (work OR personal) AND urgent AND open.

## Sorting Options

Sort options allow you to control the order and grouping of TODOs in the summary.

### Basic Sorting

\`\`\`json
{
  "query": {...},
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "ascend"
    }
  ]
}
\`\`\`

- `sortLevel`: Defines the priority of this sort rule (1 is highest priority)
- `sortBy`: Field to sort by (`category`, `tag`, `date`, `status`)
- `sortOrder`: Sort direction (`ascend`, `descend`, or `custom`)

### Sort By Options

- `category`: Sort by TODO category
- `tag`: Sort by the first tag (if multiple tags exist)
- `date`: Sort by due date (TODOs without dates appear last)
- `status`: Sort by completion status

### Custom Sort Order

You can define a custom sort order for specific values:

\`\`\`json
{
  "sortLevel": "1",
  "sortBy": "category",
  "sortOrder": "custom",
  "sortOrderCustom": "work,study,fun,health"
}
\`\`\`

TODOs will be sorted according to the specified order. Any values not in the list appear at the end.

### Multi-Level Sorting

Apply multiple sort rules in sequence:

\`\`\`json
{
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "custom",
      "sortOrderCustom": "work,study,fun,health"
    },
    {
      "sortLevel": "2",
      "sortBy": "tag",
      "sortOrder": "custom",
      "sortOrderCustom": "must,should,maybe"
    }
  ]
}
\`\`\`

This first sorts by category, then by tag within each category.

## Grouping

The `groupLevel` option controls how many sort levels create section headings:

\`\`\`json
{
  "query": {...},
  "sortOptions": [...],
  "groupLevel": 2
}
\`\`\`

- `groupLevel: 0`: No grouping, flat list of TODOs
- `groupLevel: 1`: Creates # headers for the first sort level
- `groupLevel: 2`: Creates # headers for level 1, ## headers for level 2
- And so on...

### Example with Grouping

\`\`\`json
{
  "query": {
    "STATUS": "open"
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "category",
      "sortOrder": "custom",
      "sortOrderCustom": "work,study"
    },
    {
      "sortLevel": "2",
      "sortBy": "tag",
      "sortOrder": "custom",
      "sortOrderCustom": "must,should,maybe"
    }
  ],
  "groupLevel": 2
}
\`\`\`

This produces output like:

\`\`\`markdown
# work
## must
- [ ] @work +must Task 1
- [ ] @work +must Task 2

## should
- [ ] @work +should Task 3

# study
## must
- [ ] @study +must Task 4

## maybe
- [ ] @study +maybe Task 5
\`\`\`

## Complete Examples

### Example 1: Work TODOs by Priority

\`\`\`json
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
\`\`\`

### Example 2: Upcoming Deadlines from Multiple Categories

\`\`\`json
{
  "query": {
    "OR": [
      {"CATEGORY": "work"},
      {"CATEGORY": "study"},
      {"CATEGORY": "personal"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "date",
      "sortOrder": "ascend"
    },
    {
      "sortLevel": "2",
      "sortBy": "category",
      "sortOrder": "ascend"
    }
  ],
  "groupLevel": 0
}
\`\`\`

### Example 3: Health and Fitness Tasks by Type

\`\`\`json
{
  "query": {
    "AND": [
      {"CATEGORY": "health"},
      {"STATUS": "open"}
    ]
  },
  "sortOptions": [
    {
      "sortLevel": "1",
      "sortBy": "tag",
      "sortOrder": "custom",
      "sortOrderCustom": "exercise,nutrition,sleep,mental"
    }
  ],
  "groupLevel": 1
}
\`\`\`

### Example 4: Completed Tasks This Month

\`\`\`json
{
  "query": {
    "AND": [
      {"STATUS": "done"},
      {
        "OR": [
          {"CATEGORY": "work"},
          {"CATEGORY": "personal"}
        ]
      }
    ]
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
      "sortOrder": "descend"
    }
  ],
  "groupLevel": 1
}
\`\`\`

## Migration from Simple Filter

If you're currently using the simple notebook filter:

\`\`\`markdown
<!-- inline-todo-plugin "Work" "Personal" -->
\`\`\`

This is still supported and will continue to work. The query summary format is an alternative that provides more advanced filtering capabilities.

## Tips

1. **Start Simple**: Begin with a basic query and gradually add sorting and grouping
2. **Test Incrementally**: Add one filter at a time to ensure you get the expected results
3. **Use Descriptive Names**: When creating multiple query summary notes, use clear note titles
4. **Combine with Custom Editor**: The query summary format works with both the markdown view and the custom editor
5. **Keep Queries Readable**: Use proper JSON formatting with indentation for easier maintenance

## Troubleshooting

- **Summary not updating**: Make sure the JSON is valid (no trailing commas, proper quotes)
- **TODOs not matching**: Check that your category/tag names match exactly (case-sensitive)
- **Sorting not working**: Verify `sortLevel` values are strings ("1", "2", not 1, 2)
- **Empty summary**: Check if your query is too restrictive; try simplifying it

## Technical Notes

- The query is re-evaluated each time the summary is refreshed
- For recursive notebook queries, the plugin traverses the folder hierarchy
- Query summaries preserve the JSON configuration block when updating
- The format uses ````json:query-summary` as the code block identifier
