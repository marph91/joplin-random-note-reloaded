import joplin from 'api';
import {
  MenuItemLocation,
  ToolbarButtonLocation,
  SettingItemType,
} from 'api/types';

function arrayFromCsv(csv: string) {
  return csv ? csv.split(',').map((value) => value.trim()) : [];
}

async function getUnpaginated(path, query) {
  // https://joplinapp.org/help/api/references/rest_api#pagination
  let unpaginatedResults = [];
  let page = 1;
  let response;
  do {
    response = await joplin.data.get(path, {
      ...query,
      page: page++,
      limit: 100,
    });
    unpaginatedResults.push(...response.items);
  } while (response.has_more);
  return unpaginatedResults;
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
      // Accessibility
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
        value: 'Ctrl+Shift+R',
        type: SettingItemType.String,
        section: 'openRandomNoteSection',
        public: true,
        description: 'Separate your keys with a +',
        label: 'Enter Custom Hotkey',
      },

      // Note selection
      rootNotebooks: {
        value: '',
        type: SettingItemType.String,
        section: 'openRandomNoteSection',
        public: true,
        description:
          'Consider notes from these notebooks only (comma separated list of notebook IDs)',
        label: 'Root Notebooks',
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

      excludeCompletedTodos: {
        value: '',
        type: SettingItemType.Bool,
        section: 'openRandomNoteSection',
        public: true,
        label: 'Exclude completed todos',
      },
    });

    // Commands
    await joplin.commands.register({
      name: 'openRandomNote',
      label: 'Open a random note',
      iconName: 'fas fa-random',
      execute: async () => {
        const rootNotebooks = arrayFromCsv(
          await joplin.settings.value('rootNotebooks')
        );
        let allNotes = [];
        if (rootNotebooks.length !== 0) {
          // get all notes in the root notebooks
          console.debug(
            `[Random Note] Get notes from root notebooks: ${rootNotebooks}`
          );

          for (const notebookId of rootNotebooks) {
            let notebookNotes: {
              id: String;
              is_todo: boolean;
              todo_colpleted: boolean;
            }[];
            try {
              notebookNotes = await getUnpaginated(
                ['folders', notebookId, 'notes'],
                { fields: ['id', 'is_todo', 'todo_completed'] }
              );
            } catch (e) {
              console.debug(
                '[Random Note] Root Notebook:',
                notebookId,
                'Error:',
                e.message
              );
              continue;
            }
            allNotes.push(...notebookNotes);
          }
        } else {
          // get all notes
          console.debug('[Random Note] Get all notes');
          allNotes = await getUnpaginated(['notes'], {
            fields: ['id', 'is_todo', 'todo_completed'],
          });
        }
        console.debug(`[Random Note] Total notes: ${allNotes.length}`);
        if (!allNotes.length) return;

        // exclude notes if they are a todo and completed
        const excludeCompletedTodos = await joplin.settings.value(
          'excludeCompletedTodos'
        );
        allNotes = excludeCompletedTodos
          ? allNotes.filter((note) => !(note.is_todo && note.todo_completed))
          : allNotes;
        console.debug(
          `[Random Note] Notes after todo filter: ${allNotes.length}`
        );

        // exclude the currently selected note(s)
        const currentNoteIds = await joplin.workspace.selectedNoteIds();
        // excluded notes from settings
        const excludedNotes = arrayFromCsv(
          await joplin.settings.value('excludedNotes')
        );
        // excluded notebooks from settings
        const excludedNotebooks = arrayFromCsv(
          await joplin.settings.value('excludedNotebooks')
        );
        // get all notes in the notebook
        const excludedNotebookNoteIds = [];
        for (const notebookId of excludedNotebooks) {
          let notes: { id: String }[];
          try {
            notes = await getUnpaginated(['folders', notebookId, 'notes'], {
              fields: ['id'],
            });
          } catch (e) {
            console.debug(
              '[Random Note] Excluded Notebook:',
              notebookId,
              'Error:',
              e.message
            );
            continue;
          }
          excludedNotebookNoteIds.push(...notes.map((note) => note.id));
        }
        // merge all excluded notes
        const allExcludedIdsUnique = Array.from(
          new Set(currentNoteIds.concat(excludedNotes, excludedNotebookNoteIds))
        );

        // finally exclude all manually specified notes
        // https://stackoverflow.com/a/1723220/7410886
        const filteredNotes = allNotes.filter(
          (note) => !allExcludedIdsUnique.includes(note.id)
        );
        console.debug(
          `[Random Note] Notes after manual filter: ${filteredNotes.length}`
        );

        // choose a random note
        // https://stackoverflow.com/a/5915122/7410886
        const randomNoteIndex = Math.floor(
          Math.random() * filteredNotes.length
        );
        console.debug(`[Random Note] Random index: ${randomNoteIndex}`);
        await joplin.commands.execute(
          'openNote',
          filteredNotes[randomNoteIndex].id
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

    await joplin.commands.register({
      name: 'notebookContextMenuAddRoot',
      label: 'Random Note: Add root notebook',
      execute: async (notebookId: string) => {
        console.debug(`[Random Note] Add root notebook: ${notebookId}`);
        const rootNotebooks = arrayFromCsv(
          await joplin.settings.value('rootNotebooks')
        );
        rootNotebooks.push(notebookId);
        // Remove duplicated IDs: https://stackoverflow.com/a/9229821/7410886
        const rootNotebooksUnique = Array.from(new Set(rootNotebooks));
        await joplin.settings.setValue(
          'rootNotebooks',
          rootNotebooksUnique.join(',')
        );
      },
    });

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

    const useCustomHotKey = await joplin.settings.value('useCustomHotkey');
    const customHotKey = await joplin.settings.value('customHotkey');
    const defaultAccelerator = 'Ctrl+Alt+R';
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
    const showToolBarIcon = await joplin.settings.value('showToolBarIcon');
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

    // Add a root notebook.
    await joplin.views.menuItems.create(
      'notebookContextMenuItem2',
      'notebookContextMenuAddRoot',
      MenuItemLocation.FolderContextMenu
    );
  },
});
