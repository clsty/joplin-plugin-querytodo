import joplin from 'api';
import Logger, { TargetType } from '@joplin/utils/Logger';
import {ContentScriptType, MenuItem, MenuItemLocation, SettingItemType, SettingStorage, ToolbarButtonLocation} from 'api/types';
import { SummaryBuilder } from './builder';
import { Settings } from './types';
import { update_summary } from './summary';
import { mark_current_line_as_done } from './mark_todo';
import { regexes, regexTitles, summaryTitles } from './settings_tables';
import { createQuerySummaryNote, isSummary } from './summary_note';
import { hasQuerySummary, parseQuerySummary } from './query_summary';

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('inline-todo: Index');


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_type: regexes[await joplin.settings.value('regexType')],
		summary_type: await joplin.settings.value('summaryType'),
		sort_by: await joplin.settings.value('sortBy'),
		force_sync: await joplin.settings.value('forceSync'),
		show_complete_todo: await joplin.settings.value('showCompletetodoitems'),
		auto_refresh_summary: false, // Not used for query summaries
		custom_editor: false, // Custom editor removed
	};
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.clsty.querytodo', {
			label: 'Query TODO',
			iconName: 'fa fa-check'
		});
		await joplin.settings.registerSettings({
			'regexType': {
				value: 'list',
				type: SettingItemType.String,
				isEnum: true,
				options: regexTitles,
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Choose the inline TODO style (default is recommended)',
			},
			'summaryType': {
				value: 'plain',
				type: SettingItemType.String,
				isEnum: true,
				options: summaryTitles,
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Choose a Summary Note Format. Check the project page for examples',
			},
			'sortBy': {
				value: 'category',
				type: SettingItemType.String,
				isEnum: true,
				options: {
					'category': 'Category (Default)',
					'date': 'Due Date'
				},
				section: 'settings.clsty.querytodo',
				public: true,
				label: 'Sort table display TODOs by',
			},
			'scanPeriod': {
				value: 11,
				type: SettingItemType.Int,
				section: 'settings.clsty.querytodo',
				public: true,
				advanced: true,
				minimum: 0,
				maximum: 99,
				step: 1,
				label: 'Scan Period (how many seconds to wait between bursts of scanning)',
			},
			'scanPeriodRequestCount': {
				value: 960,
				type: SettingItemType.Int,
				section: 'settings.clsty.querytodo',
				public: true,
				advanced: true,
				minimum: 1,
				maximum: 200,
				step: 1,
				label: 'Scan Period Allowed Requests (how many requests to make before taking a rest)',
			},
			'styleConfluenceTodos': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				advanced: true,
				label: 'Apply styling to metalist style todos in the markdown renderer (Restart Required)',
			},
			'forceSync': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				advanced: true,
				label: 'Force sync after summary note update (Important: do not un-check this)',
			},
			'showCompletetodoitems': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.clsty.querytodo',
				public: true,
				advanced: true,
				label: 'Include complete TODO items in TODO summary (it might take long time/long list)',
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
					console.warn("Cannot refresh: current note is not a query summary note");
					return;
				}
				
				await builder.search_in_all();
				await update_summary(builder.summary, builder.settings, currentNote.id, currentNote.body);
			}
		});

		// Create toolbar button for query summaries - visibility will be controlled dynamically
		await joplin.views.toolbarButtons.create(
			"refreshQuerySummaryToolbarButton",
			"inlineTodo.refreshQuerySummary",
			ToolbarButtonLocation.NoteToolbar
		);

		// Function to update toolbar button visibility
		const updateToolbarVisibility = async () => {
			const currentNote = await joplin.workspace.selectedNote();
			if (currentNote) {
				try {
					const note = await joplin.data.get(['notes', currentNote.id], { fields: ['body'] });
					const isQuerySummary = hasQuerySummary(note.body);
					// Show query button only for query summaries
					await joplin.views.toolbarButtons.setProperty(
						"refreshQuerySummaryToolbarButton",
						"visible",
						isQuerySummary
					);
				} catch (error) {
					// Note might not exist or error accessing it
					await joplin.views.toolbarButtons.setProperty(
						"refreshQuerySummaryToolbarButton",
						"visible",
						false
					);
				}
			} else {
				await joplin.views.toolbarButtons.setProperty(
					"refreshQuerySummaryToolbarButton",
					"visible",
					false
				);
			}
		};

		// Initial visibility check
		await updateToolbarVisibility();

		await joplin.settings.onChange(async (_) => {
			builder.settings = await getSettings();
		});

		// Track periodic reload timers for query summaries
		const reloadTimers: Map<string, NodeJS.Timeout> = new Map();

		// Helper function to refresh a query summary note
		const refreshQuerySummaryNote = async (noteId: string, noteBody: string) => {
			// Ensure the note actually has a query summary block before refreshing
			if (!hasQuerySummary(noteBody)) {
				console.warn(`Cannot refresh note ${noteId}: not a query summary note`);
				return;
			}
			await builder.search_in_all();
			await update_summary(builder.summary, builder.settings, noteId, noteBody);
		};

		// Helper function to setup periodic reload for a query summary
		const setupPeriodicReload = (noteId: string, noteBody: string, periodSeconds: number) => {
			// Clear existing timer if any
			if (reloadTimers.has(noteId)) {
				clearInterval(reloadTimers.get(noteId)!);
			}
			
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

		await joplin.workspace.onNoteSelectionChange(async () => {
			const currentNote = await joplin.workspace.selectedNote();

			// Update toolbar button visibility
			await updateToolbarVisibility();

			if (currentNote) {
				// Check if it's a query summary note
				if (hasQuerySummary(currentNote.body)) {
					const config = parseQuerySummary(currentNote.body);
					
					if (config) {
						// Handle openReload (default is false)
						if (config.openReload === true) {
							await refreshQuerySummaryNote(currentNote.id, currentNote.body);
						}
						
						// Setup periodic reload if configured
						if (config.reloadPeriodSecond && config.reloadPeriodSecond > 0) {
							setupPeriodicReload(currentNote.id, currentNote.body, config.reloadPeriodSecond);
						} else {
							// Clear any existing timer for this note
							if (reloadTimers.has(currentNote.id)) {
								clearInterval(reloadTimers.get(currentNote.id)!);
								reloadTimers.delete(currentNote.id);
							}
						}
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
