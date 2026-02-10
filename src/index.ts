import joplin from 'api';
import Logger, { TargetType } from '@joplin/utils/Logger';
import {ContentScriptType, MenuItem, MenuItemLocation, SettingItemType, SettingStorage, ToolbarButtonLocation} from 'api/types';
import { SummaryBuilder } from './builder';
import { Settings } from './types';
import { update_summary } from './summary';
import { mark_current_line_as_done } from './mark_todo';
import { regexes } from './settings_tables';
import { createQuerySummaryNote, isSummary } from './summary_note';
import { hasQuerySummary, parseQuerySummary } from './query_summary';

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('inline-todo: Index');


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: 0, // Not used for query summaries
		scan_period_c: 999999, // Set high to effectively disable rate limiting
		todo_type: regexes['list'], // Only metalist style is supported
		summary_type: 'plain', // Not used for query summaries
		sort_by: 'category', // Not used for query summaries
		force_sync: await joplin.settings.value('forceSync'),
		show_complete_todo: false, // Not used for query summaries
		auto_refresh_summary: false, // Not used for query summaries
		custom_editor: false, // Custom editor removed
		open_reload: await joplin.settings.value('openReload'),
		reload_period_second: await joplin.settings.value('reloadPeriodSecond'),
	};
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.clsty.querytodo', {
			label: 'Query TODO',
			iconName: 'fa fa-check'
		});
		await joplin.settings.registerSettings({
			'styleConfluenceTodos': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Apply styling to metalist style todos in the markdown renderer (Restart Required)',
			},
			'forceSync': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Force sync after summary note update (Important: do not un-check this)',
			},
			'openReload': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Refresh query summary notes when opening them',
			},
			'reloadPeriodSecond': {
				value: 0,
				type: SettingItemType.Int,
				section: 'settings.clsty.querytodo',
				public: true,
				minimum: 0,
				maximum: 86400,
				step: 1,
				label: 'Auto-refresh query summary notes every N seconds (0 = disabled)',
			},
		});

		const builder = new SummaryBuilder(await getSettings());

		await joplin.commands.register({
			name: "inlineTodo.createQuerySummaryNote",
			label: "Create Query summary note",
			execute: async () => {
				await createQuerySummaryNote();
			},
		});

		await joplin.views.menuItems.create(
			"createQuerySummaryNoteMenuTools",
			"inlineTodo.createQuerySummaryNote",
			MenuItemLocation.Tools
		);

		await joplin.commands.register({
			name: "inlineTodo.markDone",
			label: "Toggle TODO",
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();
				if (!currentNote || !isSummary(currentNote)) { return; }
				mark_current_line_as_done(builder, currentNote);
			},
		});

		joplin.workspace.filterEditorContextMenu(async (object: any) => {
			const currentNote = await joplin.workspace.selectedNote();
			if (!currentNote || !isSummary(currentNote)) { return object; }

			const newItems: MenuItem[] = [
				{
					type: 'separator',
				},
				{
					label: 'Toggle TODO',
					accelerator: 'Ctrl+Alt+D',
					commandName: 'inlineTodo.markDone',
					commandArgs: [],
				},
			];

			object.items = object.items.concat(newItems);

			return object;
		});

		await joplin.views.menuItems.create(
			"markDoneMenuTools",
			"inlineTodo.markDone",
			MenuItemLocation.Note,
			{ accelerator: 'Ctrl+Alt+D' }
		);

		// Add refresh command for query summaries
		await joplin.commands.register({
			name: "inlineTodo.refreshQuerySummary",
			label: "Refresh Query Summary",
			iconName: "fas fa-sync-alt",
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();
				if (!currentNote) return;
				
				// Only refresh if the note actually has a query summary block
				if (!hasQuerySummary(currentNote.body)) {
					logger.warn("Cannot refresh: current note is not a query summary note");
					return;
				}
				
				await builder.search_in_all();
				await update_summary(builder.summary, builder.settings, currentNote.id, currentNote.body);
			}
		});

		// Create toolbar button for query summaries
		// Note: Toolbar button visibility cannot be dynamically controlled via API
		await joplin.views.toolbarButtons.create(
			"refreshQuerySummaryToolbarButton",
			"inlineTodo.refreshQuerySummary",
			ToolbarButtonLocation.NoteToolbar
		);

		// Track periodic reload timers for query summaries
		const reloadTimers: Map<string, NodeJS.Timeout> = new Map();

		// Helper function to refresh a query summary note
		const refreshQuerySummaryNote = async (noteId: string, noteBody: string) => {
			// Ensure the note actually has a query summary block before refreshing
			if (!hasQuerySummary(noteBody)) {
				logger.warn(`Cannot refresh note ${noteId}: not a query summary note`);
				return;
			}
			await builder.search_in_all();
			await update_summary(builder.summary, builder.settings, noteId, noteBody);
		};

		// Helper function to setup periodic reload for a query summary
		const setupPeriodicReload = (noteId: string, noteBody: string, periodSeconds: number) => {
			// Clear all existing timers first (only one note should have periodic reload at a time)
			for (const [id, timer] of reloadTimers.entries()) {
				clearInterval(timer);
			}
			reloadTimers.clear();
			
			if (periodSeconds > 0) {
				const timer = setInterval(async () => {
					try {
						// Get fresh note body in case it changed
						const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });
						await refreshQuerySummaryNote(noteId, note.body);
					} catch (error) {
						console.error('Error in periodic reload:', error);
					}
				}, periodSeconds * 1000);
				
				reloadTimers.set(noteId, timer);
			}
		};

		await joplin.settings.onChange(async (event) => {
			// console.log('[QueryTODO] Settings changed:', event.keys.join(', '));
			builder.settings = await getSettings();
			
			// If reload-related settings changed, update the current note's reload behavior
			if (event.keys.includes('openReload') || event.keys.includes('reloadPeriodSecond')) {
				// console.log('[QueryTODO] Reload settings changed, updating current note behavior');
				const currentNote = await joplin.workspace.selectedNote();
				if (currentNote && hasQuerySummary(currentNote.body)) {
					// Use the already updated builder.settings
					const settings = builder.settings;
					// console.log('[QueryTODO] New settings - openReload:', settings.open_reload, 'reloadPeriod:', settings.reload_period_second);
					
					// Update periodic reload if configured
					if (settings.reload_period_second && settings.reload_period_second > 0) {
						// console.log('[QueryTODO] Setting up periodic reload every', settings.reload_period_second, 'seconds');
						setupPeriodicReload(currentNote.id, currentNote.body, settings.reload_period_second);
					} else {
						// Clear any existing timer for this note
						if (reloadTimers.has(currentNote.id)) {
							// console.log('[QueryTODO] Clearing existing timer');
							clearInterval(reloadTimers.get(currentNote.id)!);
							reloadTimers.delete(currentNote.id);
						}
					}
				}
			}
		});

		joplin.workspace.onNoteSelectionChange(async () => {
			// console.log('[QueryTODO] Note selection changed - handler triggered');
			const currentNote = await joplin.workspace.selectedNote();
			// console.log('[QueryTODO] Current note:', currentNote ? currentNote.id : 'none');

			if (currentNote) {
				// Check if it's a query summary note
				const hasQuery = hasQuerySummary(currentNote.body);
				// console.log('[QueryTODO] Note has query summary:', hasQuery);
				
				if (hasQuery) {
					const settings = await getSettings();
					// console.log('[QueryTODO] Settings - openReload:', settings.open_reload, 'reloadPeriod:', settings.reload_period_second);
					
					// Handle openReload (default is false)
					if (settings.open_reload === true) {
						// console.log('[QueryTODO] Triggering refresh on note open');
						await refreshQuerySummaryNote(currentNote.id, currentNote.body);
					}
					
					// Setup periodic reload if configured
					if (settings.reload_period_second && settings.reload_period_second > 0) {
						// console.log('[QueryTODO] Setting up periodic reload every', settings.reload_period_second, 'seconds');
						setupPeriodicReload(currentNote.id, currentNote.body, settings.reload_period_second);
					} else {
						// Clear any existing timer for this note
						if (reloadTimers.has(currentNote.id)) {
							// console.log('[QueryTODO] Clearing existing timer');
							clearInterval(reloadTimers.get(currentNote.id)!);
							reloadTimers.delete(currentNote.id);
						}
					}
				} else {
					// Clear any existing timer if the note is not a query summary
					if (reloadTimers.has(currentNote.id)) {
						// console.log('[QueryTODO] Clearing timer for non-query note');
						clearInterval(reloadTimers.get(currentNote.id)!);
						reloadTimers.delete(currentNote.id);
					}
				}
			}
		});

		if (await joplin.settings.value('styleConfluenceTodos')) {
			await joplin.contentScripts.register(
				ContentScriptType.MarkdownItPlugin,
				'conference_style_renderer',
				'./todoRender/index.js'
			);
		}
	},
});
