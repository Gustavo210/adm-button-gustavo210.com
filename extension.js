const {GObject, St, Gio, GLib} = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _('menu-top'));

      this.add_child(
        new St.Icon({
          icon_name: 'battery-level-100-symbolic',
          style_class: 'system-status-icon',
        })
      );
      let homeDirectory = GLib.get_home_dir();
      try {
        this.listFilesInDirectory(this.menu, `${homeDirectory}/scripts`);
      } catch (error) {
        Main.notify(
          _(
            `Criar o diretório ${homeDirectory}/scripts e adicione os scripts dentro dele`
          )
        );
      }
    }
    listFilesInDirectory(menu, directoryPath) {
      try {
        let dir = Gio.File.new_for_path(directoryPath);
        let enumerator = dir.enumerate_children(
          'standard::*',
          Gio.FileQueryInfoFlags.NONE,
          null
        );

        let fileInfo;
        while ((fileInfo = enumerator.next_file(null))) {
          let parentPath = dir.get_path();
          let fileName = fileInfo.get_name();
          let absolutePath = `${parentPath}/${fileName}`;

          let name = fileInfo.get_name();
          let type = fileInfo.get_file_type();

          if (type === Gio.FileType.DIRECTORY) {
            let mySubmenu = new PopupMenu.PopupSubMenuMenuItem(
              this.formatName(name)
            );
            this.listFilesInDirectory(mySubmenu.menu, absolutePath);
            menu.addMenuItem(mySubmenu);
          } else if (type === Gio.FileType.REGULAR) {
            this.addMenuItem(menu, fileName, absolutePath);
          }
        }

        enumerator.close(null);
      } catch (e) {
        logError('Erro ao listar os arquivos: ' + e.message);
      }
    }
    addMenuItem(menu, label, absolutePath) {
      let item = new PopupMenu.PopupMenuItem(_(this.formatName(label)));
      item.connect('activate', () => {
        execCommand(`${absolutePath}`);
      });
      menu.addMenuItem(item);
    }
    formatName(name) {
      return name.replace('.sh', '').replace(/-/g, ' ');
    }
  }
);

/**
 *
 * @param {String} command
 */
function execCommand(command) {
  let [success, pid] = GLib.spawn_async(
    null,
    ['bash', command],
    null,
    GLib.SpawnFlags.SEARCH_PATH,
    null
  );
  if (success) {
    GLib.child_watch_add(GLib.PRIORITY_LOW, pid, (pid, status) => {
      if (status == 0) {
        // O script foi executado com sucesso, você pode ocultar o indicador de carregamento
      } else {
        Main.notify(_(`Falha ao executar o script ${command}`));
      }
    });
  } else {
    Main.notify(_(`Falha ao executar o script ${command}`));
  }
}

class Extension {
  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
