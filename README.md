# Mobile Sidebar Notes

Open notes or new tabs in the sidebar on Obsidian mobile. Maintains full editor functionality, works with all editor types including canvases!
While this plugin works as expected on desktop for loading notes in the sidebar and adds commands, this functionality is already built-in on desktop.

## Features

- Pin specific notes to auto-open in sidebar tabs
- Automatic tab population on startup (configurable)
- Smart duplicate prevention - won't open the same note twice
- Command to open new empty sidebar tabs for browsing
- Autocomplete path suggestions when configuring notes

## Installation

1. Download the latest release from the Releases page
2. Extract files to `.obsidian/plugins/mobile-sidebar-notes/` in your vault
3. Reload Obsidian and enable the plugin in Settings

## Usage

1. Go to Settings → Mobile Sidebar Note
2. Click "Add Note" to configure a sidebar note
3. Enter a display name and note path (autocomplete helps find notes)
4. Notes automatically open in sidebar tabs on startup

**or simply:**

1. Run the command "Open new sidebar tab"
2. Select the note you'd like to show

### Commands

- **Open [Note Name]**: Opens configured notes in sidebar
- **Open new sidebar tab**: Creates empty sidebar tab for browsing

## Settings

- **Auto-open on load**: Toggle automatic opening of configured notes when Obsidian starts
- **Configured Notes**: Add/remove notes to pin in sidebar tabs and add as commands

## Tips

- Within the sidebar, press and hold on the dropdown of the note for options such as closing, pinning and renaming.
- Tabs tend to persist between sessions / after open unless closed even without the auto-loading enabled.
- Duplicate tabs are prevented, auto load will reopen the desired tabs and prevent copies.
- This is a standard editor tab, so most core note functionality should be preserved.
- Any notes opened will continue to work as normal even if the plugin is disabled.