import joplin from 'api';
import { Settings, Summary, SummaryMap, Todo } from './types';
import { summaries } from './settings_tables';
import { insertNewSummary, filterSummaryCategories } from './summary_note';
import { hasQuerySummary, parseQuerySummary, filterTodosByQuery, generateQuerySummaryBody } from './query_summary';
// import { icalBlock } from './ical';

export async function update_summary(summary: Summary, settings: Settings, summary_id: string, old_body: string) {
	// Check if this is a query summary note
	if (hasQuerySummary(old_body)) {
		await updateQuerySummary(summary, settings, summary_id, old_body);
		return;
	}

	// Original behavior for regular summaries
	const bodyFunc = summaries[settings.summary_type].func;

	// Use the summary special comment to filter the todos for this summary note
	const filtered_map = filterSummaryCategories(old_body, summary);

	const summaryBody = await bodyFunc(filtered_map, settings);

	// if (settings.add_ical_block) {
	// 	summaryBody += icalBlock(filtered_map, settings);
	// }

	await setSummaryBody(summaryBody, summary_id, old_body, settings);
}

async function updateQuerySummary(summary: Summary, settings: Settings, summary_id: string, old_body: string) {
	const config = parseQuerySummary(old_body);
	
	if (!config || !config.query) {
		console.error("Invalid query summary configuration");
		return;
	}
	
	// Flatten all todos from the summary map
	const allTodos: Todo[] = [];
	for (const todos of Object.values(summary.map)) {
		allTodos.push(...todos);
	}
	
	// Filter todos based on the query
	const filteredTodos = await filterTodosByQuery(allTodos, config.query);
	
	// Get entryFormat from config or use default
	const entryFormat = config.entryFormat || '- {{{STATUS}}} {{{CATEGORY}}} {{{TAGS}}} {{{DATE}}} {{{CONTENT}}} [origin](:/{{{NOTE_ID}}})';
	
	// Generate the summary body with sorting, grouping, and custom format
	const summaryBody = generateQuerySummaryBody(
		filteredTodos, 
		config.sortOptions || [], 
		config.groupLevel || 0,
		entryFormat
	);
	
	await setQuerySummaryBody(summaryBody, summary_id, old_body, settings, config);
}

async function setQuerySummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings, config?: any) {
	// For query summaries, we need to clear content BEFORE the query block and insert new summary
	const queryRegex = /```json:query-summary\s*\n[\s\S]*?\n```/gm;
	const queryMatch = old_body.match(queryRegex);
	
	if (!queryMatch) {
		console.error("Query summary block not found in note body");
		return;
	}
	
	// Find the position of the query block
	const queryBlockIndex = old_body.indexOf(queryMatch[0]);
	
	// Get content after the query block (to preserve)
	const afterQueryIndex = queryBlockIndex + queryMatch[0].length;
	const afterContent = old_body.substring(afterQueryIndex);
	
	// Reconstruct: summary body + query block + content after query block
	// This clears any previous content before the query block, fixing the duplicate issue
	const body = summaryBody + '\n' + queryMatch[0] + afterContent;
	
	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	// Don't immediately swap the text when the custom_editor is enabled, it's not necessary
	// and can cause unrelated notes to be overwritten in some situations
	// https://github.com/laurent22/joplin/issues/11721
	if (!settings.custom_editor && currentNote && currentNote.id == summary_id) {
		try {
			await joplin.commands.execute('editor.setText', body);
		} catch (error) {
			console.warn("Could not update summary note with editor.setText: " + summary_id);
			console.error(error);
		}
	}

	await joplin.data.put(['notes', summary_id], null, { body: body })
			.catch((error) => {
				console.error(error);
				console.warn("Could not update summary note with api: " + summary_id);
			});

	// Use the plugin's force_sync setting
	if (settings.force_sync) {
		await joplin.commands.execute('synchronize');
	}
}

async function setSummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings) {
	const body = insertNewSummary(old_body, summaryBody);

	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// if (settings.add_ical_block) {
	// 	// UIDs in the ical block change with each generation, so need to compare without them
	// 	// TODO: When I make the UIDs stable, this can be removed
	// 	if (old_body.replace(/```ical[\s\S]*```/, '') === body.replace(/```ical[\s\S]*```/, '')) { return; }
	// }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	// Don't immediately swap the text when the custom_editor is enabled, it's not necessary
	// and can cause unrelated notes to be overwritten in some situations
	// https://github.com/laurent22/joplin/issues/11721
	if (!settings.custom_editor && currentNote && currentNote.id == summary_id) {
		try {
			await joplin.commands.execute('editor.setText', body);
		} catch (error) {
			console.warn("Could not update summary note with editor.setText: " + summary_id);
			console.error(error);
		}
	}

	await joplin.data.put(['notes', summary_id], null, { body: body })
			.catch((error) => {
				console.error(error);
				console.warn("Could not update summary note with api: " + summary_id);
			});

	if (settings.force_sync) {
		await joplin.commands.execute('synchronize');
	}
}
