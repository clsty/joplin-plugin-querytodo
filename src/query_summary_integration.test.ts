import { update_summary } from './summary';
import { createTodo, createSummary, createSummaryMap, createSettings } from './__test-utils__/factories';
import { mockJoplinAPI } from './__test-utils__/mocks';

// Mock the Joplin API
jest.mock('api');

describe('Query Summary Integration', () => {
let joplinAPI: ReturnType<typeof mockJoplinAPI>;

beforeEach(() => {
jest.clearAllMocks();
joplinAPI = require('api').default;
joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
joplinAPI.data.put.mockResolvedValue({});
});

test('processes query summary note with category filter', async () => {
const todos = [
createTodo({ category: 'work', msg: 'Work task 1', completed: false }),
createTodo({ category: 'work', msg: 'Work task 2', completed: false }),
createTodo({ category: 'personal', msg: 'Personal task', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"CATEGORY": "work"
}
}
\`\`\`
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

expect(joplinAPI.data.put).toHaveBeenCalled();
const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).toContain('Work task 1');
expect(updatedBody).toContain('Work task 2');
expect(updatedBody).not.toContain('Personal task');
});

test('processes query summary with AND logic', async () => {
const todos = [
createTodo({ category: 'work', tags: ['urgent'], msg: 'Work urgent', completed: false }),
createTodo({ category: 'work', tags: ['later'], msg: 'Work later', completed: false }),
createTodo({ category: 'personal', tags: ['urgent'], msg: 'Personal urgent', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"AND": [
{"CATEGORY": "work"},
{"TAG": "urgent"}
]
}
}
\`\`\`
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).toContain('Work urgent');
expect(updatedBody).not.toContain('Work later');
expect(updatedBody).not.toContain('Personal urgent');
});

test('processes query summary with custom sorting', async () => {
const todos = [
createTodo({ category: 'fun', msg: 'Fun task', completed: false }),
createTodo({ category: 'work', msg: 'Work task', completed: false }),
createTodo({ category: 'study', msg: 'Study task', completed: false }),
createTodo({ category: 'health', msg: 'Health task', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"STATUS": "open"
},
"sortOptions": [
{
"sortLevel": "1",
"sortBy": "category",
"sortOrder": "custom",
"sortOrderCustom": "work,study,fun,health"
}
],
"groupLevel": 1
}
\`\`\`
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

const workIndex = updatedBody.indexOf('# work');
const studyIndex = updatedBody.indexOf('# study');
const funIndex = updatedBody.indexOf('# fun');
const healthIndex = updatedBody.indexOf('# health');

expect(workIndex).toBeGreaterThan(-1);
expect(studyIndex).toBeGreaterThan(-1);
expect(funIndex).toBeGreaterThan(-1);
expect(healthIndex).toBeGreaterThan(-1);

expect(workIndex).toBeLessThan(studyIndex);
expect(studyIndex).toBeLessThan(funIndex);
expect(funIndex).toBeLessThan(healthIndex);
});

test('processes query summary with multi-level grouping', async () => {
const todos = [
createTodo({ category: 'work', tags: ['must'], msg: 'Work must', completed: false }),
createTodo({ category: 'work', tags: ['should'], msg: 'Work should', completed: false }),
createTodo({ category: 'study', tags: ['must'], msg: 'Study must', completed: false }),
createTodo({ category: 'study', tags: ['maybe'], msg: 'Study maybe', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
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
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).toContain('# work');
expect(updatedBody).toContain('## must');
expect(updatedBody).toContain('## should');
expect(updatedBody).toContain('# study');
expect(updatedBody).toContain('## maybe');
});

test('processes query summary with negation', async () => {
const todos = [
createTodo({ category: 'work', msg: 'Work task', completed: false }),
createTodo({ category: 'personal', msg: 'Personal task', completed: false }),
createTodo({ category: 'study', msg: 'Study task', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"CATEGORY": "work",
"negated": true
}
}
\`\`\`
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).not.toContain('Work task');
expect(updatedBody).toContain('Personal task');
expect(updatedBody).toContain('Study task');
});

test('processes query summary with STATUS filter', async () => {
const todos = [
createTodo({ category: 'work', msg: 'Open work task', completed: false }),
createTodo({ category: 'work', msg: 'Done work task', completed: true }),
createTodo({ category: 'personal', msg: 'Open personal task', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"STATUS": "done"
}
}
\`\`\`
`;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).toContain('Done work task');
expect(updatedBody).toContain('[x]');
expect(updatedBody).not.toContain('Open work task');
expect(updatedBody).not.toContain('Open personal task');
});

test('preserves query block when updating summary', async () => {
const todos = [
createTodo({ category: 'work', msg: 'Task', completed: false }),
];

const summaryMap = createSummaryMap(todos);
const summary = createSummary({ map: summaryMap });

const oldBody = `
\`\`\`json:query-summary
{
"query": {
"CATEGORY": "work"
}
}
\`\`\``;

const settings = createSettings({ custom_editor: true });
await update_summary(summary, settings, 'test-id', oldBody);

const callArgs = joplinAPI.data.put.mock.calls[0];
const updatedBody = callArgs[2].body;

expect(updatedBody).toContain('```json:query-summary');
expect(updatedBody).toContain('"query"');
expect(updatedBody).toContain('"CATEGORY": "work"');
});
});
