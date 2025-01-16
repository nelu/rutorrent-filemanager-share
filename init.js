
plugin.endpoint = $type(plugin.config.endpoint) && plugin.config.endpoint !== ''
    ? plugin.config.endpoint
    : window.location.href.replace(/[\/?#]+$/, '') + '/' + plugin.path + 'share.php';

plugin.containerId = "FileShare";

plugin.table = {

    addEntries: function (data) {
        let table = this.get();
        let self = this;
        table.clearRows();

        $.each(data, (ndx, item) =>
            table.addRowById(flm.share.shareEntry(ndx, item), self.getEntryId(ndx), flm.utils.getICO(item.file)));

        table.refreshRows();
    },

    create: function () {
        plugin.attachPageToTabs(
            $('<div>').attr("id", plugin.containerId).addClass('table_tab').get(0),
            plugin.containerId
        );

        theWebUI.tables.fsh = {
            obj: new dxSTable(),
            columns: [{text: '', width: "210px", id: "file", type: TYPE_STRING}, {
                text: '', width: "65px", id: "downloads", type: TYPE_NUMBER
            }, {text: theUILang.Size, width: "60px", id: "size", type: TYPE_NUMBER}, {
                text: '', width: "120px", id: "created", type: TYPE_NUMBER, "align": ALIGN_CENTER
            }, {text: '', width: "120px", id: "time", type: TYPE_NUMBER, "align": ALIGN_CENTER}, {
                text: '', width: "310px", id: "link", type: TYPE_STRING
            }],
            container: plugin.containerId,
            format: this.format,
            onselect: this.entryMenu,
            ondblclick: (item) => flm.share.viewDetails(item.id),
            ondelete: () => flm.share.deleteEntries()
        };

        plugin.resizeBottom = theWebUI.resizeBottom;
        theWebUI.resizeBottom = function (w, h) {

            if (w !== null) {
                w -= 8;
            }

            if (h !== null) {
                h -= ($("#tabbar").height());
                h -= 2;
            }

            var table = theWebUI.getTable("fsh");
            if (table) {
                table.resize(w, h);
            }

            plugin.resizeBottom.call(this, w, h);
        };
    },

    getEntryId: (id) => "_fsh_" + id,

    entryMenu: function (e, id) {

        if ($type(id) && (e.button === 2)) {

            theContextMenu.clear();

            var table = plugin.table.get();

            if (table.selCount === 1) {
                theContextMenu.add([theUILang['flm_popup_fsh-view'], function () {
                    flm.share.viewDetails(id);
                }]);
                theContextMenu.add([theUILang['flm_popup_fsh-view-fm'], function () {
                    var file = table.getValueById(id, 'file');
                    flm.showPath(flm.utils.basedir(file), flm.utils.basename(file));
                }]);
            }

            theContextMenu.add([theUILang.fDelete, flm.share.deleteEntries]);

            theContextMenu.add([CMENU_SEP]);
            theContextMenu.add([theUILang.FScopylink, (table.selCount !== 1) ? null : function () {
                var link = table.getValueById(id, 'link');
                copyToClipboard(link);
            }]);

            theContextMenu.show();

            return true;
        }
        return false;
    },

    format: function (table, arr) {
        for (var i in arr) {
            if (arr[i] == null) arr[i] = ''; else switch (table.getIdByCol(i)) {
                case 'size' :
                    arr[i] = theConverter.bytes(arr[i], 2);
                    break;
                case 'created':
                    arr[i] = theConverter.date(iv(arr[i]) + theWebUI.deltaTime / 1000);
                    break;
                case 'time':
                    arr[i] = theConverter.date(iv(arr[i]) + theWebUI.deltaTime / 1000);
                    break;
            }
        }
        return (arr);
    },

    get: function () {
        return theWebUI.getTable("fsh");
    },

    updateColumnNames: function () {
        var table = this.get();

        table.renameColumnById('file', theUILang.FSfile);
        table.renameColumnById('downloads', theUILang.FSdnumb);
        table.renameColumnById('created', theUILang.FScreated);
        table.renameColumnById('time', theUILang.FSexpire);
        table.renameColumnById('link', theUILang.FSdlink);
    }
};


plugin.showDialog = function (what, templateData) {

    let dialogs = flm.ui.getDialogs();
    let diagConf = flm.ui.dialogs.getDialogConfig(what);

    diagConf.options = {
        //	public_endpoint: plugin.config.public_endpoint,
        views: "flm-share", plugin: plugin, data: templateData
    };

    return dialogs.setDialogConfig(what, diagConf).showDialog(what);
};

plugin.setUI = function (flmUi) {

    var viewsPath = plugin.path + 'views/';
    let dialogs = flmUi.dialogs;

    flm.views.namespaces['flm-share'] = viewsPath;

    dialogs.setDialogConfig('flm-create-share', {
        options: {
            views: "flm-share"
        },
        pathbrowse: false,
        modal: false,
        template: viewsPath + "dialog-create-share"
    }).setDialogConfig('fsh-view', {
        pathbrowse: false,
        modal: false,
        template: viewsPath + "dialog-view"
    });


    flm.views.getView(viewsPath + 'table-header',
        {apiUrl: flm.api.endpoint},
        (view) => {

            $('#' + plugin.containerId).prepend(view);

            setTimeout(function () {
                $('#FS_refresh').click(function () {
                    flm.share.refresh();
                });
            });
        });
    plugin.renameTab(plugin.containerId, theUILang.FSshow);
    plugin.table.updateColumnNames();
};

plugin.init = (module) => {
    plugin.setUI(flm.ui);
    flm.share = new module.FileManagerShare(plugin);
    flm.ui.filenav.onContextMenu(flm.share.setFlmContextMenu);
    flm.share.init();
    plugin.markLoaded();
};

plugin.onLangLoaded = () => Promise.all([thePlugins.get('filemanager').loaded()])
        .then(() => import('./' + plugin.path + 'js/share.js'))
        .then(plugin.init);

plugin.onRemove = function () {
    this.removePageFromTabs(this.table.containerId);
    $('[id^="FS_"]').remove();
};

if (plugin.enabled) {
    $(document).on('theWebUI:config', () => plugin.canChangeTabs() && plugin.table.create());
    $(document).on('theTabs:onShow', (id) => (id === plugin.containerId) && flm.share && flm.share.refresh());
    plugin.loadLang();
    plugin.loadCSS('share');
}

