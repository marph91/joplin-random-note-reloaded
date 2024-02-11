import joplin from 'api';
import {
  MenuItemLocation,
  ToolbarButtonLocation,
  SettingItemType,
} from 'api/types';

function arrayFromCsv(csv: string) {
  return csv ? csv.split(',') : [];
}

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

      excludedNotes: {
        value: '',
        type: SettingItemType.String,
        section: 'openRandomNoteSection',
        public: true,
        description: 'Comma separated list of note IDs',
        label: 'Excluded Notes',
      },

      // TODO: find best way to store arrays
      // excludedNotes: {
      //   value: [],
      //   type: SettingItemType.Array,
      //   section: 'openRandomNoteSection',
      //   public: false,  // isn't displayed anyway
      //   label: 'Excluded Notes',
      // },

      excludedNotebooks: {
        value: '',
        type: SettingItemType.String,
        section: 'openRandomNoteSection',
        public: true,
        description: 'Comma separated list of notebook IDs',
        label: 'Excluded Notebooks',
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
        let allNoteIds = [];
        let page = 1;
        do {
          response = await joplin.data.get(['notes'], {
            page: page++,
            fields: ['id'],
            limit: 100,
          });
          for (const note of response.items) {
            allNoteIds.push(note.id);
          }
        } while (response.has_more != false);

        console.debug(`[Random Note] Total notes: ${allNoteIds.length}`);
        if (!allNoteIds.length) return;

        // exclude the currently selected note
        const currentNote = await joplin.workspace.selectedNote();
        // excluded notes from settings
        const excludedNotes = arrayFromCsv(
          await joplin.settings.value('excludedNotes')
        );
        // excluded notebooks from settings
        const excludedNotebooks = arrayFromCsv(
          await joplin.settings.value('excludedNotebooks')
        );
        // get all notes in the notebook
        const excludedNotebookNotes = [];
        for (const notebookId of excludedNotebooks) {
          page = 1;
          do {
            response = await joplin.data.get(['folders', notebookId, 'notes'], {
              page: page,
              fields: ['id'],
              limit: 100,
            });
            page += 1;
            for (const note of response.items) {
              excludedNotebookNotes.push(note.id);
            }
            // excludedNotebookNotes.push(...response.items);
          } while (response.has_more);
        }
        // merge all excluded notes
        const allExcludedIdsUnique = Array.from(
          new Set([currentNote.id].concat(excludedNotes, excludedNotebookNotes))
        );
        console.debug(
          `[Random Note] Excluding ${allExcludedIdsUnique.length} notes.`
        );

        // finally exclude all notes to exclude
        // https://stackoverflow.com/a/1723220/7410886
        const filteredNotes = allNoteIds.filter(
          (x) => !allExcludedIdsUnique.includes(x)
        );
        console.debug(`[Random Note] Selected notes: ${filteredNotes.length}`);

        // choose a random note
        // https://stackoverflow.com/a/5915122/7410886
        const randomNoteIndex = Math.floor(
          Math.random() * filteredNotes.length
        );
        console.debug(`[Random Note] Random index: ${randomNoteIndex}`);
        await joplin.commands.execute(
          'openNote',
          filteredNotes[randomNoteIndex]
        );
      },
    });

    await joplin.commands.register({
      name: 'noteContextMenuExclude',
      label: 'Random Note: Exclude',
      execute: async (noteIds: string[]) => {
        console.debug(`[Random Note] Excluding notes: ${noteIds}`);
        const excludedNotes = arrayFromCsv(
          await joplin.settings.value('excludedNotes')
        );
        excludedNotes.push(...noteIds);
        // Remove duplicated IDs: https://stackoverflow.com/a/9229821/7410886
        const excludedNotesUnique = Array.from(new Set(excludedNotes));
        await joplin.settings.setValue(
          'excludedNotes',
          excludedNotesUnique.join(',')
        );
      },
    });

    await joplin.commands.register({
      name: 'notebookContextMenuExclude',
      label: 'Random Note: Exclude',
      execute: async (notebookId: string) => {
        console.debug(`[Random Note] Excluding notebook: ${notebookId}`);
        const excludedNotebooks = arrayFromCsv(
          await joplin.settings.value('excludedNotebooks')
        );
        excludedNotebooks.push(notebookId);
        // Remove duplicated IDs: https://stackoverflow.com/a/9229821/7410886
        const excludedNotebooksUnique = Array.from(new Set(excludedNotebooks));
        await joplin.settings.setValue(
          'excludedNotebooks',
          excludedNotebooksUnique.join(',')
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

    // Modify excluded notes and notebooks.
    await joplin.views.menuItems.create(
      'noteContextMenuItem1',
      'noteContextMenuExclude',
      MenuItemLocation.NoteListContextMenu
    );
    await joplin.views.menuItems.create(
      'notebookContextMenuItem1',
      'notebookContextMenuExclude',
      MenuItemLocation.FolderContextMenu
    );
  },
});
