plugin.endpoint = $type(plugin.config.endpoint) && plugin.config.endpoint !== ''
    ? plugin.config.endpoint
    : window.location.href.replace(/[\/?#]+$/, '') + '/' + plugin.path + 'share.php';

plugin.containerId = "FileShare";

plugin.table = {

    addEntries: function (data) {
        let table = this.get();
        let self = this;
        table.clearRows();

        $.each(data, function (ndx, item) {
            table.addRowById({
                file: item.file,
                downloads: parseInt(item.downloads),
                created: item.created,
                size: item.size,
                time: item.expire,
                link: plugin.endpoint + '/' + ndx
            }, self.getEntryId(ndx), flm.utils.getICO(item.file));
        });

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

let FlmFileShare = function () {
    let self = this;
    let table = plugin.table.get();

    this.api = null;
    this.entriesList = {};

    this.init = () => {
        this.api = flm.client(plugin.path + 'fsh.php');
        this.refresh();
    };

    this.showCreate = () => {
        plugin.showDialog('flm-create-share');
    };

    this.deleteEntries = () => {

        const selectedEntries = $.map(table.getSelected(), function (value) {
            return self.entriesList[value.split('_fsh_')[1]].hash;
        });
        askYesNo(theUILang.FSdel, theUILang.FSdelmsg, function () {
            // unbinding call and add flm start btn class to bind on
            $("#yesnoOK").addClass('flm-diag-start').off();

            flm.ui.dialogs
                    .onStart(() => flm.share.del(selectedEntries), 'yesnoDlg', true)
                    .enableStartButton('yesnoDlg')
                    .trigger('click', [selectedEntries]);
        });
    };

    this.getEntries = () => {
        return this.api.post({method: 'show'});
    };

    this.setEntriesList = (entries) => {
        entries = entries.list || {};

        self.entriesList = entries;
        plugin.table.addEntries(entries);
    };

    this.refresh = () => {
        this.getEntries().then(this.setEntriesList, function (err) {
            console.log(err);
            return err;
        });
    };

    this.viewDetails = (id) => {
        let target = id.split('_fsh_')[1];
        let data = flm.share.entriesList[target];

        data['formatted'] = table.rowdata[id].fmtdata;
        plugin.showDialog('fsh-view', data);
    };

    this.add = (path, pass, duration) => {
        let file = flm.stripJailPath(path.val());

        let validation = flm.actions.doValidation([
            [!file.length || flm.utils.isDir(file), theUILang.fDiagInvalidname, path],
            [this.hasLinkLimit(), theUILang.FS_link_limit_reached + ': ' + plugin.config.limits.links, path],
            [!duration.val().match(/^\d+$/), theUILang.FSvdur, duration],
            [parseInt(duration.val()) === 0 && plugin.config.limits.duration > 0, theUILang.FSnolimitoff, duration],
            [plugin.config.require_password && pass.val().length === 0, 'Required', pass]
        ]);

        return (validation.state() === "rejected")
            ? validation
            : validation.then(() => this.api.post({
                method: 'add',
                target: flm.stripJailPath(file),
                pass: pass.val(),
                duration: duration.val()
            }))
                .then((r) => {
                    self.setEntriesList(r);
                    let shareId = Object.entries(self.entriesList)
                        .filter(entry => entry[1].hash === r['new'])
                        .reduce((res, entry) => entry[0], false);
                    plugin.table.get().selectRowById(plugin.table.getEntryId(shareId));
                    theTabs.show(plugin.containerId);
                    r.new = shareId;
                    return r;
                });
    };

    this.del = (entries) => {
        let validation = flm.actions.doValidation([
            [!$type(entries) || entries.length === 0, theUILang.flm_empty_selection, $("#yesnoOK")],
        ]);

        return (validation.state() === "rejected")
            ? validation
            : validation.then(() => this.api.post({method: 'del', entries: entries}))
                .done(this.setEntriesList);
    };

    this.hasLinkLimit = (cur) => {
        cur = cur || plugin.table.get().rows
        const max = plugin.config.limits.links;
        return (max > 0) ? (cur >= max) : false;
    };

    return this;
}

plugin.setFlmContextMenu = function (menu, path) {
    if (plugin.enabled) {
        let createMenu = flm.ui.getContextMenuEntryPosition(menu, theUILang.fcreate, 1);

        (createMenu > -1) && flm.ui.addContextMenu(menu[createMenu][2],
            [theUILang.FSshare, (!flm.utils.isDir(path) && !flm.share.hasLinkLimit())
                ? () => flm.share.showCreate()
                : null
            ]
        );
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

    flmUi.filenav.onContextMenu(plugin.setFlmContextMenu);

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

plugin.init = () => {
    plugin.setUI(flm.ui);
    flm.share = new FlmFileShare();
    flm.share.init();
    plugin.markLoaded();
};

plugin.onLangLoaded = () => thePlugins.get('filemanager').loaded().done(plugin.init);

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

