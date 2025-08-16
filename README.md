# Mobile Sidebar Notes

Open notes or new tabs in the sidebar on Obsidian mobile. Maintains full editor functionality, works with all editor types including canvases!
While this plugin works as expected on desktop for loading notes in the sidebar and adds commands, this functionality is already built-in on desktop.

## Features

- Command to open new empty sidebar tabs for browsing
- Set specific notes as commands for easy sidebar access (compatible with hotkeys)
- Smart duplicate prevention - won't open the same note twice
- Autocomplete path suggestions when configuring notes

## Installation

1. Download the latest release from the Releases page
2. Extract files to `.obsidian/plugins/mobile-sidebar-notes/` in your vault
3. Reload Obsidian and enable the plugin in Settings

## Usage

1. Go to Settings → Mobile Sidebar Note
2. Click "Add Command" to configure a sidebar note command
3. Enter a display name and note path (autocomplete helps find notes)
4. Use commands or "Open new sidebar tab" to access notes

**or simply:**

1. Run the command "Open new sidebar tab"
2. Select the note you'd like to show

### Commands

- **Open [Note Name] in Sidebar**: Opens configured notes in sidebar
- **Open new sidebar tab**: Creates empty sidebar tab for browsing

## Settings

### General

- **Auto-pin tabs**: Automatically pin notes opened in the sidebar to open links in new tabs (enabled by default)

### Commands

- **Commands**: Add/remove notes to create commands for sidebar access

## Tips

- Within the sidebar, press and hold on the dropdown of the note for options such as closing, pinning and renaming.
- Tabs tend to persist between sessions / after opening unless manually closed.
- Duplicate tabs are prevented when opening the same note multiple times.
- This is a standard editor tab, so most core note functionality should be preserved.
- Any notes opened will continue to work as normal even if the plugin is disabled.

# Contributing

Feel free to make suggestions and issues/PRs, though please consider that I'd like to keep this plugin simple and focused.