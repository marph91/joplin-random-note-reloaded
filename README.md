# Joplin Random Note Reloaded

The plugin opens a note at random from your vault, after installing the plugin you can create a custom hotkey that opens a note at random, or use the default hotkey `Ctrl+Alt+R`.

Forked from <https://github.com/Kaid00/joplin-random-note>.

## Table of contents

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
- [Development](#development)
- [Building the plugin](#building-the-plugin)

## Installation

- Open Joplin and navigate to `Preferences > Plugins`
- Search for `Random Note Reloaded` and click on install
- Restart Joplin to enable the plugin

### Uninstall

- Open Joplin and navigate to `Tools > Options > Plugins`
- Search for the `Random Note Reloaded` plugin
- Press `Delete` to remove the plugin completely
    - Alternatively you can also disable the plugin by clicking on the toggle button
- Restart Joplin

## Features

- Open random a random note by hotkey, toolbar button or menu
- Exclude notes or notebooks (by right-click)
- Exclude finished todos (by settings)
- Get random notes from specific notebooks only (by right-click)

## Usage

### Default Hotkey

By default you can use the hotkey `Ctrl+Alt+R` to open a random note.

### Tool bar button

Click on the 🔀 icon to open a random note.

### Set Hotkey

- Open Joplin and navigate to `Preferences > Plugins Settings`
- Select `Random Note Reloaded`, you will find the following options
- `Show Tool Bar Button` Shows Random Note icon on tool bar for quick shortcut to open random note
- `Use Custom Hotkey` Select this option if you want to use a custom hotkey to open random notes
- `Enter Custom Hotkey` Enter your custom Hotkey
- Click `Apply` when done, and restart Joplin for changes to take effect

## Development

The npm package of the plugin can be found [here](https://www.npmjs.com/package/joplin-plugin-random-note-reloaded).

### Building the plugin

If you want to build the plugin by your own simply run `npm run dist`.

### Install Built plugin

- Open Joplin **Configuration > Plugins** section
- Under Advanced Settings, add the plugin path in the **Development plugins** text field.
- This should be the path to your main plugin directory, i.e. `path/to/your/root/plugin/directory`.

### Updating the plugin framework

To update the plugin framework, run `npm run update`.
