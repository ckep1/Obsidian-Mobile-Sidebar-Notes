import { App, Plugin, PluginSettingTab, Setting, TFile, TextComponent, Notice, WorkspaceLeaf, debounce } from 'obsidian';

interface NoteEntry {
	path: string;
	displayName: string;
	id: string;
}

interface MobileSidebarNotesSettings {
	noteEntries: NoteEntry[];
	tipDismissed: boolean;
	autoPinTabs: boolean;
}

const DEFAULT_SETTINGS: MobileSidebarNotesSettings = {
	noteEntries: [],
	tipDismissed: false,
	autoPinTabs: true
}


export default class MobileSidebarNotesPlugin extends Plugin {
	settings: MobileSidebarNotesSettings;
	private leafMap: Map<string, WorkspaceLeaf> = new Map();
	private debounceTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new MobileSidebarNotesSettingTab(this.app, this));

		// Add commands to open each note
		this.addCommands();

		// Add command to open new empty tab
		this.addCommand({
			id: 'open-new-sidebar-tab',
			name: 'Open new sidebar tab',
			callback: () => {
				const leaf = this.app.workspace.getRightLeaf(false);
				if (leaf) {
					this.app.workspace.revealLeaf(leaf);
				}
			}
		});

		// Listen for leaf changes to clean up our leaf map
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.cleanupClosedLeaves();
			})
		);

	}

	onunload() {
		// Clean up leaf references
		this.leafMap.clear();

		// Clear any pending timers
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}
	}

	async openNoteInSidebar(noteEntry: NoteEntry) {
		try {
			if (!noteEntry.path || !noteEntry.path.trim()) {
				return;
			}

			const file = this.app.vault.getAbstractFileByPath(noteEntry.path);
			if (!(file instanceof TFile)) {
				return;
			}

			// Check if this file is already open in the right sidebar
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			const existingLeaf = leaves.find(leaf =>
				leaf.view.getState()?.file === file.path &&
				leaf.getRoot() === this.app.workspace.rightSplit
			);

			if (existingLeaf) {
				this.app.workspace.revealLeaf(existingLeaf);
				this.leafMap.set(noteEntry.id, existingLeaf);
				return;
			}

			// Create a new leaf in the right sidebar
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.openFile(file);
				// Store the leaf reference for this entry
				this.leafMap.set(noteEntry.id, leaf);

				// Auto-pin the tab if setting is enabled
				if (this.settings.autoPinTabs) {
					leaf.setPinned(true);
				}
			}
		} catch (error) {
			console.error('Error opening note in sidebar:', error);
			new Notice(`Failed to open note: ${error.message}`);
		}
	}

	cleanupClosedLeaves() {
		// Remove closed leaves from our tracking map
		const activeLeaves = this.app.workspace.getLeavesOfType('markdown')
			.filter(leaf => leaf.getRoot() === this.app.workspace.rightSplit);

		// Find entries whose leaves no longer exist
		const toRemove: string[] = [];
		this.leafMap.forEach((leaf, id) => {
			if (!activeLeaves.includes(leaf)) {
				toRemove.push(id);
			}
		});

		// Remove stale references
		toRemove.forEach(id => {
			this.leafMap.delete(id);
		});
	}

	addCommands() {
		this.settings.noteEntries.forEach(noteEntry => {
			// Only register command if path is not empty and file exists
			if (!noteEntry.path || !noteEntry.path.trim()) {
				return;
			}

			// Check if file exists
			const sanitizedPath = noteEntry.path.trim().replace(/\\/g, '/');
			const file = this.app.vault.getAbstractFileByPath(sanitizedPath);
			if (!(file instanceof TFile)) {
				return;
			}

			// Use displayName if provided, otherwise use file path
			const title = noteEntry.displayName.trim() || noteEntry.path || 'Untitled';
			this.addCommand({
				id: `open-${noteEntry.id}`,
				name: `Open ${title} in Sidebar`,
				callback: () => {
					this.openNoteInSidebar(noteEntry);
				}
			});
		});
	}


	async refreshViews() {
		// Debounce refresh to prevent rapid successive calls
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(async () => {
			// Close existing sidebar notes
			this.leafMap.forEach((leaf) => {
				if (leaf) {
					leaf.detach();
				}
			});
			this.leafMap.clear();

			// Re-add commands and open notes
			this.addCommands();

			// Open notes sequentially to avoid race conditions
			for (const entry of this.settings.noteEntries) {
				await this.openNoteInSidebar(entry);
			}
		}, 300);
	}

	async loadSettings() {
		try {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		} catch (error) {
			console.error('Failed to load settings:', error);
			this.settings = DEFAULT_SETTINGS;
			new Notice('Failed to load settings, using defaults');
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
			await this.refreshViews();
		} catch (error) {
			console.error('Failed to save settings:', error);
			new Notice('Failed to save settings');
		}
	}
}

class MobileSidebarNotesSettingTab extends PluginSettingTab {
	plugin: MobileSidebarNotesPlugin;
	private currentSuggestionEl: HTMLElement | null = null;
	private suggestionClickInProgress = false;
	private debouncedGetSuggestions: (value: string, inputEl: HTMLElement, textComponent: TextComponent, entry: NoteEntry) => void;

	constructor(app: App, plugin: MobileSidebarNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		// Create debounced suggestion function
		this.debouncedGetSuggestions = debounce(
			(value: string, inputEl: HTMLElement, textComponent: TextComponent, entry: NoteEntry) => {
				if (!this.suggestionClickInProgress && document.activeElement === inputEl) {
					const suggestions = this.getPathSuggestions(value);
					if (suggestions.length > 0) {
						this.showSuggestions(inputEl, suggestions, textComponent, entry);
					}
				}
			},
			300,
			true
		);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Auto-pin tabs setting
		new Setting(containerEl)
			.setName('Auto-pin tabs')
			.setDesc('Automatically pin notes opened in the sidebar to open links in new tabs')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPinTabs)
				.onChange(async (value) => {
					this.plugin.settings.autoPinTabs = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Commands' });

		// Show tip if not dismissed
		if (!this.plugin.settings.tipDismissed) {
			const tipEl = containerEl.createDiv({ cls: 'setting-item-description' });
			tipEl.style.marginBottom = '1rem';
			tipEl.style.padding = '0.75rem';
			tipEl.style.backgroundColor = 'var(--background-secondary)';
			tipEl.style.borderRadius = '4px';
			tipEl.style.fontSize = '0.9em';
			tipEl.style.position = 'relative';

			const tipContent = tipEl.createDiv();
			tipContent.createSpan({ text: '📌 ' });
			tipContent.createEl('strong', { text: 'Tip:' });
			tipContent.createSpan({ text: ' To close/pin/rename/manage sidebar tabs, press and hold the note title in the sidebar source dropdown.' });

			const dismissBtn = tipEl.createEl('button', {
				cls: 'tip-dismiss-btn',
				text: '×'
			});
			dismissBtn.style.position = 'absolute';
			dismissBtn.style.top = '0.5rem';
			dismissBtn.style.right = '0.5rem';
			dismissBtn.style.border = 'none';
			dismissBtn.style.background = 'none';
			dismissBtn.style.fontSize = '1.2em';
			dismissBtn.style.cursor = 'pointer';
			dismissBtn.style.opacity = '0.7';
			dismissBtn.title = 'Dismiss tip';

			dismissBtn.addEventListener('click', async () => {
				this.plugin.settings.tipDismissed = true;
				await this.plugin.saveSettings();
				this.display();
			});

			dismissBtn.addEventListener('mouseenter', () => {
				dismissBtn.style.opacity = '1';
			});

			dismissBtn.addEventListener('mouseleave', () => {
				dismissBtn.style.opacity = '0.7';
			});
		}

		// Add new note entry button
		new Setting(containerEl)
			.setName('Add specific notes as a command')
			.setDesc('Registers a command to open a specific note in the sidebar in the command palette or as a hotkey.')
			.addButton(button => button
				.setButtonText('Add Command')
				.onClick(async () => {
					const newEntry: NoteEntry = {
						path: '',
						displayName: 'Title',
						id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
					};
					this.plugin.settings.noteEntries.push(newEntry);
					await this.plugin.saveSettings();
					this.display();
				}));

		// Display existing note entries
		this.plugin.settings.noteEntries.forEach((entry, index) => {
			const setting = new Setting(containerEl)
				.setName(`Note ${index + 1}`)
				.addText(text => text
					.setPlaceholder('Title (in command)')
					.setValue(entry.displayName)
					.onChange(async (value) => {
						entry.displayName = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => {
					text.setPlaceholder('Note path (e.g., folder/note.md)')
						.setValue(entry.path)
						.onChange(async (value) => {
							entry.path = value;
							this.validatePath(text, value, false); // Don't show toast on change
							await this.plugin.saveSettings();
						});

					// Add autocomplete functionality
					this.addPathAutocomplete(text, entry);

					// Initial validation
					this.validatePath(text, entry.path, false);

					return text;
				})
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.noteEntries.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));

			setting.settingEl.addClass('mobile-sidebar-setting-item');
		});
	}

	validatePath(textComponent: TextComponent, path: string, showToast = true) {
		const inputEl = textComponent.inputEl;
		inputEl.removeClass('valid', 'invalid');

		if (!path.trim()) {
			inputEl.addClass('mobile-sidebar-path-input', 'invalid');
			inputEl.title = 'Path is required to register command';
			if (showToast) {
				new Notice('Please specify a note path');
			}
			return false;
		}

		// Sanitize path
		const sanitizedPath = path.trim().replace(/\\/g, '/');
		const file = this.app.vault.getAbstractFileByPath(sanitizedPath);

		if (file instanceof TFile) {
			inputEl.addClass('mobile-sidebar-path-input', 'valid');
			inputEl.title = 'Valid note path';
			return true;
		} else {
			inputEl.addClass('mobile-sidebar-path-input', 'invalid');
			inputEl.title = 'Note not found - command will not be registered';
			if (showToast) {
				new Notice(`Note not found: ${path}`);
			}
			return false;
		}
	}

	addPathAutocomplete(textComponent: TextComponent, entry: NoteEntry) {
		const inputEl = textComponent.inputEl;
		inputEl.addClass('mobile-sidebar-path-input');

		inputEl.addEventListener('input', () => {
			// Don't show suggestions if we're in the middle of a click
			if (this.suggestionClickInProgress) return;

			this.hideSuggestions();

			const value = inputEl.value.trim();
			if (value.length < 2) return;

			this.debouncedGetSuggestions(value, inputEl, textComponent, entry);
		});

		inputEl.addEventListener('blur', () => {
			// Don't hide immediately if clicking on suggestion
			if (!this.suggestionClickInProgress) {
				setTimeout(() => {
					if (!this.suggestionClickInProgress) {
						this.hideSuggestions();
					}
				}, 200);
			}
		});

		// Handle keyboard navigation
		inputEl.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				const isValid = this.validatePath(textComponent, inputEl.value, true);
				if (isValid) {
					// Open the note in sidebar when Enter is pressed on valid path
					await this.plugin.openNoteInSidebar(entry);
				}
			} else if (e.key === 'Escape' && this.currentSuggestionEl) {
				e.preventDefault();
				this.hideSuggestions();
			}
		});
	}

	getPathSuggestions(query: string): string[] {
		const files = this.app.vault.getMarkdownFiles();
		return files
			.map(file => file.path)
			.filter(path => path.toLowerCase().includes(query.toLowerCase()))
			.slice(0, 5);
	}

	showSuggestions(inputEl: HTMLElement, suggestions: string[], textComponent: TextComponent, entry: NoteEntry) {
		this.hideSuggestions();

		const suggestionEl = document.createElement('div');
		suggestionEl.addClass('mobile-sidebar-suggestion-container');

		// Set dynamic width independent of input size
		const windowWidth = window.innerWidth;
		const desiredWidth = Math.min(windowWidth * 0.85, 400);
		suggestionEl.style.width = `${desiredWidth}px`;

		suggestions.forEach(suggestion => {
			const item = suggestionEl.createDiv();
			item.addClass('mobile-sidebar-suggestion-item');
			item.textContent = suggestion;

			item.addEventListener('mousedown', (e) => {
				e.preventDefault(); // Prevent blur
				this.suggestionClickInProgress = true;
			});

			item.addEventListener('click', async () => {
				// Update the entry directly
				entry.path = suggestion;

				// Set value in UI
				textComponent.setValue(suggestion);

				// Save settings to persist the change
				await this.plugin.saveSettings();

				this.hideSuggestions();
				this.suggestionClickInProgress = false;
				// Trigger validation without showing suggestions
				this.validatePath(textComponent, suggestion, false);
				// Remove focus from input
				inputEl.blur();
			});
		});

		document.body.appendChild(suggestionEl);
		const rect = inputEl.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const suggestionWidth = desiredWidth;

		// Calculate available space below and above the input
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const suggestionHeight = Math.min(200, suggestions.length * 40); // Approximate height

		// Position vertically - below if there's enough space, otherwise position above
		if (spaceBelow >= suggestionHeight || spaceBelow >= spaceAbove) {
			// Position below
			suggestionEl.style.top = `${rect.bottom + 2}px`;
		} else {
			// Position above
			suggestionEl.style.bottom = `${window.innerHeight - rect.top + 2}px`;
			suggestionEl.style.top = 'auto';
		}

		// Position horizontally - ensure it fits within viewport
		let leftPosition = rect.left;

		// If suggestion box would extend past right edge, adjust position
		if (leftPosition + suggestionWidth > viewportWidth) {
			leftPosition = viewportWidth - suggestionWidth - 10; // 10px margin from edge
		}

		// Ensure it doesn't go past left edge
		if (leftPosition < 10) {
			leftPosition = 10; // 10px margin from left edge
		}

		suggestionEl.style.left = `${leftPosition}px`;

		this.currentSuggestionEl = suggestionEl;
	}

	hideSuggestions() {
		if (this.currentSuggestionEl) {
			this.currentSuggestionEl.remove();
			this.currentSuggestionEl = null;
		}
	}

}
