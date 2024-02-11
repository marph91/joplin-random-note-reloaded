import joplin from 'api';
import {
  MenuItemLocation,
  ToolbarButtonLocation,
  SettingItemType,
} from 'api/types';

joplin.plugins.register({
  onStart: async function () {
    // Registering section
    await joplin.settings.registerSection('openRandomNoteSection', {
      label: 'Random Note Reloaded',
      iconName: 'fas fa-random',
    });

    // Settings
    await joplin.settings.registerSettings({
      showToolBarIcon: {
        value: true,
        type: SettingItemType.Bool,
        section: 'openRandomNoteSection',
        label: 'Show Tool Bar Button',
        public: true,
        description: 'Alternative to using Hotkeys to open random notes',
      },

      useCustomHotkey: {
        value: false,
        type: SettingItemType.Bool,
        section: 'openRandomNoteSection',
        label: 'Use Custom Hotkey',
        public: true,
        description: 'Enter custom hotkey after selecting this option',
      },

      customHotkey: {
        value: 'Ctrl+Alt+R',
        type: SettingItemType.String,
        section: 'openRandomNoteSection',
        public: true,
        description: 'Separate your keys with a +',
        label: 'Enter Custom Hotkey',
      },
    });

    // Commands
    await joplin.commands.register({
      name: 'openRandomNote',
      label: 'Open a random note',
      iconName: 'fas fa-random',
      execute: async () => {
        // get all notes
        // https://joplinapp.org/help/api/references/rest_api#pagination
        let response;
        let notes = [];
        let pageNumber = 1;
        do {
          response = await joplin.data.get(['notes'], {
            page: pageNumber++,
            limit: 100,
          });
          notes.push(...response.items);
        } while (response.has_more != false);

        console.log(`[Random Note] Total notes: ${notes.length}`);
        if (!notes.length) return;

        // exclude the currently selected note
        const currentNote = await joplin.workspace.selectedNote();
        const filteredNotes = notes.filter((note) => {
          if (currentNote.id != note.id) {
            return note;
          }
        });

        // choose a random note
        // https://stackoverflow.com/a/5915122/7410886
        const randomNoteIndex = Math.floor(
          Math.random() * filteredNotes.length
        );
        console.log(`[Random Note] Random index: ${randomNoteIndex}`);
        await joplin.commands.execute(
          'openNote',
          filteredNotes[randomNoteIndex].id
        );
      },
    });

    // get settings
    const useCustomHotKey = await joplin.settings.value('useCustomHotkey');

    const customHotKey = await joplin.settings.value('customHotkey');
    const showToolBarIcon = await joplin.settings.value('showToolBarIcon');

    const defaultAccelerator = 'Ctrl+Alt+R';

    // Open random note via hotkey.
    // validating custom hotkey
    function validate(customHotKey) {
      if (customHotKey.trim() != '') {
        // Regex to get all whitespace
        const regex = /\s+/g;
        let validatedHotKeys;
        const cleanWhiteSpace = customHotKey.replace(regex, '');
        const spaceCustom = cleanWhiteSpace.replace(/\+/g, ' ');

        const keySplit = spaceCustom.split(' ');

        const wordValidate = keySplit.map((word) => {
          return (word = word[0].toUpperCase() + word.substr(1));
        });

        validatedHotKeys = wordValidate.join('+');
        return validatedHotKeys;
      }
    }

    let key;
    if (useCustomHotKey === false) {
      key = defaultAccelerator;
    } else {
      if (customHotKey.length > 0) {
        key = validate(customHotKey);
      } else {
        await joplin.settings.setValue('customHotkey', defaultAccelerator);
        key = defaultAccelerator;
      }
    }

    // Open random note via menu.
    await joplin.views.menuItems.create(
      'openRandomNoteMenu',
      'openRandomNote',
      MenuItemLocation.EditorContextMenu,
      { accelerator: key }
    );

    await joplin.views.menus.create('myMenu', 'Open Random Note', [
      {
        commandName: 'openRandomNote',
        accelerator: key,
      },
    ]);

    // Open random note via toolbar icon.
    if (showToolBarIcon) {
      await joplin.views.toolbarButtons.create(
        'openRandomNoteMenuViaToolbar',
        'openRandomNote',
        ToolbarButtonLocation.EditorToolbar
      );
    }
  },
});
