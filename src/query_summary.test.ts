import {
	hasQuerySummary,
	parseQuerySummary,
	filterTodosByQuery,
	sortTodosByOptions,
	generateQuerySummaryBody,
} from './query_summary';
import { createTodo } from './__test-utils__/factories';
import { QueryItem, SortOption, Todo } from './types';

describe('query_summary', () => {
	describe('hasQuerySummary', () => {
		test('detects query summary with valid JSON', () => {
			const body = `# My Query Summary

\`\`\`json:query-summary
{
	"query": {
		"CATEGORY": "work"
	}
}
\`\`\`

Some other content`;
			
			expect(hasQuerySummary(body)).toBe(true);
		});

		test('returns false for regular summary', () => {
			const body = '<!-- inline-todo-plugin -->';
			expect(hasQuerySummary(body)).toBe(false);
		});

		test('returns false for regular code block', () => {
			const body = '```json\n{"test": "data"}\n```';
			expect(hasQuerySummary(body)).toBe(false);
		});
	});

	describe('parseQuerySummary', () => {
		test('parses simple category query', () => {
			const body = `\`\`\`json:query-summary
{
	"query": {
		"CATEGORY": "work"
	}
}
\`\`\``;
			
			const config = parseQuerySummary(body);
			expect(config).not.toBeNull();
			expect(config!.query).toHaveProperty('CATEGORY', 'work');
		});

		test('parses query with sort options', () => {
			const body = `\`\`\`json:query-summary
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
\`\`\``;
			
			const config = parseQuerySummary(body);
			expect(config).not.toBeNull();
			expect(config!.sortOptions).toHaveLength(1);
			expect(config!.groupLevel).toBe(1);
		});

		test('returns null for invalid JSON', () => {
			const body = '```json:query-summary\ninvalid json\n```';
			const config = parseQuerySummary(body);
			expect(config).toBeNull();
		});

		test('returns null when no query block', () => {
			const body = 'Just regular content';
			const config = parseQuerySummary(body);
			expect(config).toBeNull();
		});
	});

	describe('filterTodosByQuery', () => {
		describe('CATEGORY query', () => {
			test('matches todos with specified category', async () => {
				const todos = [
					createTodo({ category: 'work', msg: 'Work task' }),
					createTodo({ category: 'personal', msg: 'Personal task' }),
				];

				const query: QueryItem = { CATEGORY: 'work' };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].category).toBe('work');
			});

			test('handles negated category query', async () => {
				const todos = [
					createTodo({ category: 'work', msg: 'Work task' }),
					createTodo({ category: 'personal', msg: 'Personal task' }),
				];

				const query: QueryItem = { CATEGORY: 'work', negated: true };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].category).toBe('personal');
			});
		});

		describe('TAG query', () => {
			test('matches todos with specified tag', async () => {
				const todos = [
					createTodo({ tags: ['urgent', 'important'], msg: 'Tagged task 1' }),
					createTodo({ tags: ['later'], msg: 'Tagged task 2' }),
				];

				const query: QueryItem = { TAG: 'urgent' };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].tags).toContain('urgent');
			});

			test('handles negated tag query', async () => {
				const todos = [
					createTodo({ tags: ['urgent'], msg: 'Task 1' }),
					createTodo({ tags: ['later'], msg: 'Task 2' }),
				];

				const query: QueryItem = { TAG: 'urgent', negated: true };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].tags).toContain('later');
			});
		});

		describe('NOTE query', () => {
			test('matches todos from specified note', async () => {
				const todos = [
					createTodo({ note: 'note-1', msg: 'Task 1' }),
					createTodo({ note: 'note-2', msg: 'Task 2' }),
				];

				const query: QueryItem = { NOTE: 'note-1' };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].note).toBe('note-1');
			});

			test('handles negated note query', async () => {
				const todos = [
					createTodo({ note: 'note-1', msg: 'Task 1' }),
					createTodo({ note: 'note-2', msg: 'Task 2' }),
				];

				const query: QueryItem = { NOTE: 'note-1', negated: true };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].note).toBe('note-2');
			});
		});

		describe('NOTEBOOK query', () => {
			test('matches todos from specified notebook (non-recursive)', async () => {
				const todos = [
					createTodo({ parent_id: 'notebook-1', msg: 'Task 1' }),
					createTodo({ parent_id: 'notebook-2', msg: 'Task 2' }),
				];

				const query: QueryItem = { NOTEBOOK: 'notebook-1', recursive: false };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].parent_id).toBe('notebook-1');
			});

			test('handles negated notebook query', async () => {
				const todos = [
					createTodo({ parent_id: 'notebook-1', msg: 'Task 1' }),
					createTodo({ parent_id: 'notebook-2', msg: 'Task 2' }),
				];

				const query: QueryItem = { NOTEBOOK: 'notebook-1', negated: true };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].parent_id).toBe('notebook-2');
			});
		});

		describe('STATUS query', () => {
			test('matches todos with "open" status', async () => {
				const todos = [
					createTodo({ completed: false, msg: 'Open task' }),
					createTodo({ completed: true, msg: 'Done task' }),
				];

				const query: QueryItem = { STATUS: 'open' };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].completed).toBe(false);
			});

			test('matches todos with "done" status', async () => {
				const todos = [
					createTodo({ completed: false, msg: 'Open task' }),
					createTodo({ completed: true, msg: 'Done task' }),
				];

				const query: QueryItem = { STATUS: 'done' };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].completed).toBe(true);
			});

			test('handles negated status query', async () => {
				const todos = [
					createTodo({ completed: false, msg: 'Open task' }),
					createTodo({ completed: true, msg: 'Done task' }),
				];

				const query: QueryItem = { STATUS: 'done', negated: true };
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].completed).toBe(false);
			});
		});

		describe('AND query', () => {
			test('matches todos that satisfy all conditions', async () => {
				const todos = [
					createTodo({ category: 'work', tags: ['urgent'], msg: 'Work urgent' }),
					createTodo({ category: 'work', tags: ['later'], msg: 'Work later' }),
					createTodo({ category: 'personal', tags: ['urgent'], msg: 'Personal urgent' }),
				];

				const query: QueryItem = {
					AND: [
						{ CATEGORY: 'work' },
						{ TAG: 'urgent' },
					],
				};
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(1);
				expect(filtered[0].msg).toBe('Work urgent');
			});

			test('returns empty array when no todos match all conditions', async () => {
				const todos = [
					createTodo({ category: 'work', tags: ['later'], msg: 'Work later' }),
					createTodo({ category: 'personal', tags: ['urgent'], msg: 'Personal urgent' }),
				];

				const query: QueryItem = {
					AND: [
						{ CATEGORY: 'work' },
						{ TAG: 'urgent' },
					],
				};
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(0);
			});
		});

		describe('OR query', () => {
			test('matches todos that satisfy any condition', async () => {
				const todos = [
					createTodo({ category: 'work', msg: 'Work task' }),
					createTodo({ category: 'personal', tags: ['urgent'], msg: 'Personal urgent' }),
					createTodo({ category: 'hobby', msg: 'Hobby task' }),
				];

				const query: QueryItem = {
					OR: [
						{ CATEGORY: 'work' },
						{ TAG: 'urgent' },
					],
				};
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(2);
				expect(filtered.map(t => t.msg)).toContain('Work task');
				expect(filtered.map(t => t.msg)).toContain('Personal urgent');
			});

			test('returns empty array when no todos match any condition', async () => {
				const todos = [
					createTodo({ category: 'hobby', tags: ['later'], msg: 'Hobby later' }),
				];

				const query: QueryItem = {
					OR: [
						{ CATEGORY: 'work' },
						{ TAG: 'urgent' },
					],
				};
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(0);
			});
		});

		describe('nested queries', () => {
			test('handles nested AND/OR queries', async () => {
				const todos = [
					createTodo({ category: 'work', tags: ['urgent'], completed: false, msg: 'Work urgent open' }),
					createTodo({ category: 'work', tags: ['later'], completed: false, msg: 'Work later open' }),
					createTodo({ category: 'personal', tags: ['urgent'], completed: false, msg: 'Personal urgent open' }),
					createTodo({ category: 'work', tags: ['urgent'], completed: true, msg: 'Work urgent done' }),
				];

				// (work OR personal) AND urgent AND open
				const query: QueryItem = {
					AND: [
						{
							OR: [
								{ CATEGORY: 'work' },
								{ CATEGORY: 'personal' },
							],
						},
						{ TAG: 'urgent' },
						{ STATUS: 'open' },
					],
				};
				const filtered = await filterTodosByQuery(todos, query);

				expect(filtered).toHaveLength(2);
				expect(filtered.map(t => t.msg).sort()).toEqual(['Personal urgent open', 'Work urgent open']);
			});
		});
	});

	describe('sortTodosByOptions', () => {
		test('sorts by category ascending', () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Work' }),
				createTodo({ category: 'personal', msg: 'Personal' }),
				createTodo({ category: 'hobby', msg: 'Hobby' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'ascend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].category).toBe('hobby');
			expect(sorted[1].category).toBe('personal');
			expect(sorted[2].category).toBe('work');
		});

		test('sorts by category descending', () => {
			const todos = [
				createTodo({ category: 'hobby', msg: 'Hobby' }),
				createTodo({ category: 'personal', msg: 'Personal' }),
				createTodo({ category: 'work', msg: 'Work' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'descend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].category).toBe('work');
			expect(sorted[1].category).toBe('personal');
			expect(sorted[2].category).toBe('hobby');
		});

		test('sorts by category with custom order', () => {
			const todos = [
				createTodo({ category: 'fun', msg: 'Fun' }),
				createTodo({ category: 'work', msg: 'Work' }),
				createTodo({ category: 'study', msg: 'Study' }),
				createTodo({ category: 'health', msg: 'Health' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'custom',
					sortOrderCustom: 'work,study,fun,health',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].category).toBe('work');
			expect(sorted[1].category).toBe('study');
			expect(sorted[2].category).toBe('fun');
			expect(sorted[3].category).toBe('health');
		});

		test('sorts items not in custom order to the end', () => {
			const todos = [
				createTodo({ category: 'other', msg: 'Other' }),
				createTodo({ category: 'work', msg: 'Work' }),
				createTodo({ category: 'unknown', msg: 'Unknown' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'custom',
					sortOrderCustom: 'work',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].category).toBe('work');
			// Other two can be in any order but should be after 'work'
			expect(['other', 'unknown']).toContain(sorted[1].category);
			expect(['other', 'unknown']).toContain(sorted[2].category);
		});

		test('sorts by date ascending', () => {
			const todos = [
				createTodo({ date: '2026-01-15', msg: 'Task 2' }),
				createTodo({ date: '2026-01-10', msg: 'Task 1' }),
				createTodo({ date: '2026-01-20', msg: 'Task 3' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'date',
					sortOrder: 'ascend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].date).toBe('2026-01-10');
			expect(sorted[1].date).toBe('2026-01-15');
			expect(sorted[2].date).toBe('2026-01-20');
		});

		test('puts todos without date at the end when sorting by date ascending', () => {
			const todos = [
				createTodo({ date: '2026-01-15', msg: 'Task 2' }),
				createTodo({ date: '', msg: 'Task no date' }),
				createTodo({ date: '2026-01-10', msg: 'Task 1' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'date',
					sortOrder: 'ascend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].date).toBe('2026-01-10');
			expect(sorted[1].date).toBe('2026-01-15');
			expect(sorted[2].date).toBe('');
		});

		test('sorts by tag with first tag', () => {
			const todos = [
				createTodo({ tags: ['zebra', 'alpha'], msg: 'Task 1' }),
				createTodo({ tags: ['beta'], msg: 'Task 2' }),
				createTodo({ tags: ['alpha'], msg: 'Task 3' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'tag',
					sortOrder: 'ascend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].tags[0]).toBe('alpha');
			expect(sorted[1].tags[0]).toBe('beta');
			expect(sorted[2].tags[0]).toBe('zebra');
		});

		test('sorts by status', () => {
			const todos = [
				createTodo({ completed: true, msg: 'Done task' }),
				createTodo({ completed: false, msg: 'Open task' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'status',
					sortOrder: 'ascend',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			// 'done' comes before 'open' alphabetically
			expect(sorted[0].completed).toBe(true);
			expect(sorted[1].completed).toBe(false);
		});

		test('sorts with multiple levels', () => {
			const todos = [
				createTodo({ category: 'work', tags: ['should'], msg: 'Work should' }),
				createTodo({ category: 'work', tags: ['must'], msg: 'Work must' }),
				createTodo({ category: 'study', tags: ['must'], msg: 'Study must' }),
				createTodo({ category: 'study', tags: ['maybe'], msg: 'Study maybe' }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'custom',
					sortOrderCustom: 'work,study',
				},
				{
					sortLevel: '2',
					sortBy: 'tag',
					sortOrder: 'custom',
					sortOrderCustom: 'must,should,maybe',
				},
			];

			const sorted = sortTodosByOptions(todos, sortOptions);

			expect(sorted[0].msg).toBe('Work must');
			expect(sorted[1].msg).toBe('Work should');
			expect(sorted[2].msg).toBe('Study must');
			expect(sorted[3].msg).toBe('Study maybe');
		});
	});

	describe('generateQuerySummaryBody', () => {
		test('returns "All done!" for empty todos', () => {
			const body = generateQuerySummaryBody([], [], 0, undefined);
			expect(body).toContain('All done!');
		});

		test('generates simple list without grouping', () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Task 1', completed: false }),
				createTodo({ category: 'personal', msg: 'Task 2', completed: false }),
			];

			const body = generateQuerySummaryBody(todos, [], 0, undefined);

			expect(body).toContain('- [ ]');
			expect(body).toContain('@work');
			expect(body).toContain('@personal');
		});

		test('generates grouped output with single level', () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Task 1', completed: false }),
				createTodo({ category: 'work', msg: 'Task 2', completed: false }),
				createTodo({ category: 'personal', msg: 'Task 3', completed: false }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'ascend',
				},
			];

			const body = generateQuerySummaryBody(todos, sortOptions, 1, undefined);

			expect(body).toContain('# personal');
			expect(body).toContain('# work');
		});

		test('generates grouped output with multiple levels', () => {
			const todos = [
				createTodo({ category: 'work', tags: ['urgent'], msg: 'Task 1', completed: false }),
				createTodo({ category: 'work', tags: ['later'], msg: 'Task 2', completed: false }),
				createTodo({ category: 'personal', tags: ['urgent'], msg: 'Task 3', completed: false }),
			];

			const sortOptions: SortOption[] = [
				{
					sortLevel: '1',
					sortBy: 'category',
					sortOrder: 'ascend',
				},
				{
					sortLevel: '2',
					sortBy: 'tag',
					sortOrder: 'ascend',
				},
			];

			const body = generateQuerySummaryBody(todos, sortOptions, 2, undefined);

			expect(body).toContain('# personal');
			expect(body).toContain('## urgent');
			expect(body).toContain('# work');
			expect(body).toContain('## later');
		});

		test('formats completed todos correctly', () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Done task', completed: true }),
			];

			const body = generateQuerySummaryBody(todos, [], 0, undefined);

			expect(body).toContain('- [x]');
		});

		test('includes tags in output', () => {
			const todos = [
				createTodo({ category: 'work', tags: ['urgent', 'important'], msg: 'Task', completed: false }),
			];

			const body = generateQuerySummaryBody(todos, [], 0, undefined);

			expect(body).toContain('+urgent');
			expect(body).toContain('+important');
		});

		test('includes date in output', () => {
			const todos = [
				createTodo({ category: 'work', date: '2026-01-23', msg: 'Task', completed: false }),
			];

			const body = generateQuerySummaryBody(todos, [], 0, undefined);

			expect(body).toContain('//2026-01-23');
		});
	});
});
