import joplin from 'api';
import { 
	QuerySummaryConfig, 
	QueryItem, 
	CategoryQuery, 
	TagQuery, 
	NoteQuery, 
	NotebookQuery, 
	StatusQuery, 
	AndQuery, 
	OrQuery,
	Todo,
	SortOption,
	SortBy
} from './types';

const query_summary_regex = /```json:query-summary\s*\n([\s\S]*?)\n```/gm;

/**
 * Detects if a note body contains a query summary configuration
 */
export function hasQuerySummary(body: string): boolean {
	query_summary_regex.lastIndex = 0;
	return query_summary_regex.test(body);
}

/**
 * Parses the query summary configuration from a note body
 */
export function parseQuerySummary(body: string): QuerySummaryConfig | null {
	query_summary_regex.lastIndex = 0;
	const match = query_summary_regex.exec(body);
	
	if (!match) {
		return null;
	}
	
	try {
		const config = JSON.parse(match[1]);
		return config as QuerySummaryConfig;
	} catch (error) {
		console.error('Failed to parse query summary configuration:', error);
		return null;
	}
}

/**
 * Checks if a query item is a CategoryQuery
 */
function isCategoryQuery(item: QueryItem): item is CategoryQuery {
	return 'CATEGORY' in item;
}

/**
 * Checks if a query item is a TagQuery
 */
function isTagQuery(item: QueryItem): item is TagQuery {
	return 'TAG' in item;
}

/**
 * Checks if a query item is a NoteQuery
 */
function isNoteQuery(item: QueryItem): item is NoteQuery {
	return 'NOTE' in item;
}

/**
 * Checks if a query item is a NotebookQuery
 */
function isNotebookQuery(item: QueryItem): item is NotebookQuery {
	return 'NOTEBOOK' in item;
}

/**
 * Checks if a query item is a StatusQuery
 */
function isStatusQuery(item: QueryItem): item is StatusQuery {
	return 'STATUS' in item;
}

/**
 * Checks if a query item is an AndQuery
 */
function isAndQuery(item: QueryItem): item is AndQuery {
	return 'AND' in item;
}

/**
 * Checks if a query item is an OrQuery
 */
function isOrQuery(item: QueryItem): item is OrQuery {
	return 'OR' in item;
}

/**
 * Converts XIT status from completed boolean to status string
 */
function todoToStatus(todo: Todo): string {
	// Following XIT standard: done, open
	return todo.completed ? 'done' : 'open';
}

/**
 * Matches a single todo against a category query
 */
function matchCategoryQuery(todo: Todo, query: CategoryQuery): boolean {
	const matches = todo.category === query.CATEGORY;
	return query.negated ? !matches : matches;
}

/**
 * Matches a single todo against a tag query
 */
function matchTagQuery(todo: Todo, query: TagQuery): boolean {
	const matches = todo.tags && todo.tags.includes(query.TAG);
	return query.negated ? !matches : matches;
}

/**
 * Matches a single todo against a note query
 */
function matchNoteQuery(todo: Todo, query: NoteQuery): boolean {
	const matches = todo.note === query.NOTE;
	return query.negated ? !matches : matches;
}

/**
 * Matches a single todo against a notebook query
 * For recursive matching, we need to check parent notebooks
 */
async function matchNotebookQuery(todo: Todo, query: NotebookQuery, folderCache: Map<string, string>): Promise<boolean> {
	let matches = false;
	
	if (query.recursive) {
		// Check the parent_id and all its parents
		let currentParentId = todo.parent_id;
		
		while (currentParentId) {
			if (currentParentId === query.NOTEBOOK) {
				matches = true;
				break;
			}
			
			// Get parent of current folder
			try {
				const folder = await joplin.data.get(['folders', currentParentId], { fields: ['parent_id'] });
				currentParentId = folder.parent_id;
			} catch (error) {
				// Folder not found or error, stop traversing
				break;
			}
		}
	} else {
		// Non-recursive: direct parent match only
		matches = todo.parent_id === query.NOTEBOOK;
	}
	
	return query.negated ? !matches : matches;
}

/**
 * Matches a single todo against a status query
 */
function matchStatusQuery(todo: Todo, query: StatusQuery): boolean {
	const todoStatus = todoToStatus(todo);
	const matches = todoStatus === query.STATUS;
	return query.negated ? !matches : matches;
}

/**
 * Recursively matches a todo against a query item
 */
async function matchQueryItem(todo: Todo, query: QueryItem, folderCache: Map<string, string>): Promise<boolean> {
	if (isCategoryQuery(query)) {
		return matchCategoryQuery(todo, query);
	} else if (isTagQuery(query)) {
		return matchTagQuery(todo, query);
	} else if (isNoteQuery(query)) {
		return matchNoteQuery(todo, query);
	} else if (isNotebookQuery(query)) {
		return matchNotebookQuery(todo, query, folderCache);
	} else if (isStatusQuery(query)) {
		return matchStatusQuery(todo, query);
	} else if (isAndQuery(query)) {
		// All sub-queries must match
		for (const subQuery of query.AND) {
			if (!await matchQueryItem(todo, subQuery, folderCache)) {
				return false;
			}
		}
		return true;
	} else if (isOrQuery(query)) {
		// At least one sub-query must match
		for (const subQuery of query.OR) {
			if (await matchQueryItem(todo, subQuery, folderCache)) {
				return true;
			}
		}
		return false;
	}
	
	return false;
}

/**
 * Filters todos based on a query
 */
export async function filterTodosByQuery(todos: Todo[], query: QueryItem): Promise<Todo[]> {
	const folderCache = new Map<string, string>();
	const filteredTodos: Todo[] = [];
	
	for (const todo of todos) {
		if (await matchQueryItem(todo, query, folderCache)) {
			filteredTodos.push(todo);
		}
	}
	
	return filteredTodos;
}

/**
 * Gets the sort key for a todo based on sortBy option
 */
function getSortKey(todo: Todo, sortBy: SortBy): string | number {
	switch (sortBy) {
		case 'category':
			return todo.category || '';
		case 'date':
			// Use MAX_SAFE_INTEGER for todos without dates to place them at the end when sorting ascending
			return todo.date ? Date.parse(todo.date) : Number.MAX_SAFE_INTEGER;
		case 'status':
			return todoToStatus(todo);
		case 'tag':
			// For tag, use the first tag or empty string
			return (todo.tags && todo.tags.length > 0) ? todo.tags[0] : '';
		default:
			return '';
	}
}

/**
 * Gets the custom sort priority for a value based on the custom order list
 */
function getCustomPriority(value: string, customOrder: string[]): number {
	const index = customOrder.indexOf(value);
	return index >= 0 ? index : customOrder.length;
}

/**
 * Compares two todos based on a single sort option
 */
function compareTodos(a: Todo, b: Todo, sortOption: SortOption): number {
	const aKey = getSortKey(a, sortOption.sortBy);
	const bKey = getSortKey(b, sortOption.sortBy);
	
	if (sortOption.sortOrder === 'custom' && sortOption.sortOrderCustom) {
		const customOrder = sortOption.sortOrderCustom.split(',').map(s => s.trim());
		const aPriority = getCustomPriority(String(aKey), customOrder);
		const bPriority = getCustomPriority(String(bKey), customOrder);
		return aPriority - bPriority;
	} else if (sortOption.sortOrder === 'descend') {
		if (typeof aKey === 'number' && typeof bKey === 'number') {
			return bKey - aKey;
		}
		return String(bKey).localeCompare(String(aKey), undefined, { sensitivity: 'accent', numeric: true });
	} else {
		// Default: ascend
		if (typeof aKey === 'number' && typeof bKey === 'number') {
			return aKey - bKey;
		}
		return String(aKey).localeCompare(String(bKey), undefined, { sensitivity: 'accent', numeric: true });
	}
}

/**
 * Sorts todos based on multiple sort options
 */
export function sortTodosByOptions(todos: Todo[], sortOptions: SortOption[]): Todo[] {
	if (!sortOptions || sortOptions.length === 0) {
		return todos;
	}
	
	// Sort options by sortLevel
	const sortedOptions = [...sortOptions].sort((a, b) => {
		return parseInt(a.sortLevel) - parseInt(b.sortLevel);
	});
	
	// Create a copy and sort
	const sortedTodos = [...todos];
	sortedTodos.sort((a, b) => {
		for (const sortOption of sortedOptions) {
			const comparison = compareTodos(a, b, sortOption);
			if (comparison !== 0) {
				return comparison;
			}
		}
		return 0;
	});
	
	return sortedTodos;
}

/**
 * Groups todos by a sort option's sortBy field
 */
function groupTodosByKey(todos: Todo[], sortBy: SortBy): Map<string, Todo[]> {
	const groups = new Map<string, Todo[]>();
	
	for (const todo of todos) {
		const key = String(getSortKey(todo, sortBy));
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(todo);
	}
	
	return groups;
}

/**
 * Formats a single todo for output
 */
function formatTodo(todo: Todo): string {
	const checkbox = todo.completed ? '[x]' : '[ ]';
	const category = todo.category ? `@${todo.category}` : '';
	const tags = todo.tags ? todo.tags.map(t => `+${t}`).join(' ') : '';
	const date = todo.date ? `//${todo.date}` : '';
	
	const parts = [checkbox, category, tags, date, todo.msg].filter(p => p);
	return `- ${parts.join(' ')}`;
}

/**
 * Generates the summary body from sorted and grouped todos
 */
export function generateQuerySummaryBody(todos: Todo[], sortOptions: SortOption[], groupLevel: number): string {
	if (todos.length === 0) {
		return '# All done!\n\n';
	}
	
	// Sort todos first
	const sortedTodos = sortTodosByOptions(todos, sortOptions);
	
	// If no grouping, just output all todos
	if (!sortOptions || sortOptions.length === 0 || groupLevel < 1) {
		return sortedTodos.map(formatTodo).join('\n') + '\n';
	}
	
	// Group by levels
	let body = '';
	const sortedOptions = [...sortOptions].sort((a, b) => parseInt(a.sortLevel) - parseInt(b.sortLevel));
	
	// Build a hierarchical structure based on groupLevel
	function buildHierarchy(todos: Todo[], level: number): string {
		if (level > groupLevel || level > sortedOptions.length) {
			// No more grouping, just list todos
			return todos.map(formatTodo).join('\n') + '\n';
		}
		
		const sortOption = sortedOptions[level - 1];
		const groups = groupTodosByKey(todos, sortOption.sortBy);
		
		// Sort group keys according to the sort option
		const groupKeys = Array.from(groups.keys());
		const sortedKeys = groupKeys.sort((a, b) => {
			// Create dummy todos for comparison
			const dummyA = { [sortOption.sortBy]: a } as any;
			const dummyB = { [sortOption.sortBy]: b } as any;
			
			if (sortOption.sortOrder === 'custom' && sortOption.sortOrderCustom) {
				const customOrder = sortOption.sortOrderCustom.split(',').map(s => s.trim());
				return getCustomPriority(a, customOrder) - getCustomPriority(b, customOrder);
			} else if (sortOption.sortOrder === 'descend') {
				return b.localeCompare(a, undefined, { sensitivity: 'accent', numeric: true });
			} else {
				return a.localeCompare(b, undefined, { sensitivity: 'accent', numeric: true });
			}
		});
		
		let result = '';
		for (const key of sortedKeys) {
			const groupTodos = groups.get(key)!;
			
			// Add heading based on level (# for level 1, ## for level 2, etc.)
			const heading = '#'.repeat(level);
			result += `${heading} ${key}\n`;
			
			// Recursively process next level
			result += buildHierarchy(groupTodos, level + 1);
			result += '\n';
		}
		
		return result;
	}
	
	body = buildHierarchy(sortedTodos, 1);
	
	return body;
}
