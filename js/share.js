export function FileManagerShare(plugin) {
    let self = this;

    this.api = null;
    this.entriesList = {};

    this.init = () => {
        this.api = flm.client(plugin.path + 'fsh.php');

        var viewsPath = plugin.path + 'views/';
        let dialogs = flm.ui.dialogs;

        flm.ui.filenav.onContextMenu(this.setFlmContextMenu);

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
        this.table.updateColumnNames();

        this.refresh();
    };

    this.showDialog = function (what, templateData) {

        let dialogs = flm.ui.getDialogs();
        let diagConf = flm.ui.dialogs.getDialogConfig(what);

        diagConf.options = {
            //	public_endpoint: plugin.config.public_endpoint,
            views: "flm-share", plugin: plugin, data: templateData
        };

        return dialogs.setDialogConfig(what, diagConf).showDialog(what);
    };

    this.showCreate = () => {
        this.showDialog('flm-create-share');
    };

    this.deleteEntries = () => {

        const selectedEntries = $.map(self.table.get().getSelected(), function (value) {
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

    this.shareEntry = (id, item) => {
        return {
            id: id,
            file: item.file,
            downloads: parseInt(item.downloads),
            created: item.created,
            size: item.size,
            time: item.expire,
            link: [plugin.endpoint + '/' + id].join('/')
        };
    }

    this.getEntries = () => {
        return this.api.post({method: 'show'});
    };

    this.setEntriesList = (entries) => {
        entries = entries.list || {};

        self.entriesList = entries;
        this.table.addEntries(entries);
    };

    this.setFlmContextMenu = (menu, path) => {
        if (plugin.enabled) {
            let createMenu = flm.ui.getContextMenuEntryPosition(menu, theUILang.fcreate, 1);

            (createMenu > -1) && flm.ui.addContextMenu(menu[createMenu][2],
                [theUILang.FSshare, (!flm.utils.isDir(path) && !self.hasLinkLimit())
                    ? () => self.showCreate()
                    : null
                ]
            );
        }
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

        data['formatted'] = this.table.get().rowdata[id].fmtdata;
        self.showDialog('fsh-view', data);
    };

    this.add = (checkList, pass, duration) => {
        //let file = flm.stripJailPath(path.val());
        let filePaths = flm.ui.dialogs.getCheckedList(checkList);
        let errContainer = $type(checkList) === 'array' ? checkList[0] : checkList.find('input').get(0);

        let validation = flm.actions.doValidation([
            [filePaths.length === 0, theUILang.flm_empty_selection, errContainer],
            [this.hasLinkLimit(), theUILang.FS_link_limit_reached + ': ' + plugin.config.limits.links, errContainer],
            [!duration.val().match(/^\d+$/), theUILang.FSvdur, duration],
            [parseInt(duration.val()) === 0 && plugin.config.limits.duration > 0, theUILang.FSnolimitoff, duration],
            [plugin.config.require_password && pass.val().length === 0, 'Required', pass]
        ]);

        return (validation.state() === "rejected")
            ? validation
            : validation.then(() => this.api.post({
                method: 'add',
                files: filePaths,
                pass: pass.val(),
                duration: duration.val()
            })).then((r) => {
                    self.setEntriesList(r);
                    let shareId = Object.entries(self.entriesList)
                        .reduce((res, entry) => entry[1].hash === r['new'] ? entry[0] : res, false);

                    self.table.get().selectRowById(self.table.getEntryId(shareId));
                    theTabs.show(plugin.containerId);
                    r.new = shareId;
                    return r;
                }, (e) => {
                    console.log(arguments);
                    if (e.msg.split(" ").length === 1) {
                        e.msg = theUILang[e.msg];
                    }
                    return $.Deferred().reject(e);
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
        cur = cur || self.table.get().rows
        const max = plugin.config.limits.links;
        return (max > 0) ? (cur >= max) : false;
    };

    this.table = {
        addEntries: function (data) {
            let table = this.get();
            table.clearRows();

            $.each(data, (ndx, item) =>
                table.addRowById(self.shareEntry(ndx, item), self.table.getEntryId(ndx), flm.utils.getICO(item.file)));

            table.refreshRows();
        },

        getEntryId: (id) => "_fsh_" + id,

        entryMenu: function (e, id) {

            if ($type(id) && (e.button === 2)) {

                theContextMenu.clear();

                var table = this.get();

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

    return this;
}
