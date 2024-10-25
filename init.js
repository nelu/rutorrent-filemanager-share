plugin.loadCSS('share');

plugin.table = {

    addEntries: function (data) {


        let table = this.get();
        table.clearRows();

        var hostPath = $type(plugin.config.endpoint) && plugin.config.endpoint !== ''
            ? plugin.config.endpoint
            : flm.utils.rtrim(window.location.href, '/') + '/' + plugin.path + 'share.php';

        $.each(data, function (ndx, item) {

            table.addRowById({
                file: item.file,
                downloads: parseInt(item.downloads),
                created: item.created,
                size: item.size,
                time: item.expire,
                link: hostPath + '/' + ndx
            }, "_fsh_" + ndx, 'Icon_File');
        });

        table.refreshRows();
    },

    create: function () {
        plugin.attachPageToTabs($('<div>').attr("id", "FileShare").addClass('table_tab').get(0), 'FileShare');

        theWebUI.tables.fsh = {
            obj: new dxSTable(),
            columns: [{text: '', width: "210px", id: "file", type: TYPE_STRING}, {
                text: '',
                width: "65px",
                id: "downloads",
                type: TYPE_NUMBER
            }, {text: theUILang.Size, width: "60px", id: "size", type: TYPE_NUMBER}, {
                text: '',
                width: "120px",
                id: "created",
                type: TYPE_NUMBER,
                "align": ALIGN_CENTER
            }, {text: '', width: "120px", id: "time", type: TYPE_NUMBER, "align": ALIGN_CENTER}, {
                text: '',
                width: "310px",
                id: "link",
                type: TYPE_STRING
            }],
            container: "FileShare",
            format: plugin.table.format,
            onselect: plugin.table.entryMenu,
            ondblclick: function(item) { return flm.share.viewDetails(item.id);},
            ondelete: function() { return flm.share.deleteEntries();}
        };


    },

    entryMenu: function (e, id) {

        if ($type(id) && (e.button === 2)) {

            theContextMenu.clear();

            var table = plugin.table.get();

            if (table.selCount === 1) {
                theContextMenu.add([theUILang['flm_popup_fsh-view'], function () {flm.share.viewDetails(id);}]);
                theContextMenu.add([theUILang['flm_popup_fsh-view-fm'], function () {
                    var file = table.getValueById(id, 'file');
                    flm.showPath(flm.utils.basedir(file));
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
        return  theWebUI.getTable("fsh");
    },

    updateColumnNames: function () {
        var table = theWebUI.getTable("fsh");

        table.renameColumnById('file', theUILang.FSfile);
        table.renameColumnById('downloads', theUILang.FSdnumb);
        table.renameColumnById('created', theUILang.FScreated);
        table.renameColumnById('time', theUILang.FSexpire);
        table.renameColumnById('link', theUILang.FSdlink);
    }
};


plugin.FileShare = function () {
    let self = this;
    let table = plugin.table.get();

    self = {

        api: null,
        entriesList: {},


        add: function (file, pass, duration) {

            var allownolimit = parseFloat(plugin.config.nolimit);

            let hasErr;

            if (!$type(file) || file.length === 0) {
                hasErr = 'Empty paths';
            } else if (flm.utils.isDir(file)) {
                hasErr = theUILang.fDiagInvalidname + ": " +file
            } else if (!duration.match(/^\d+$/)) {
                hasErr = theUILang.FSvdur;
            } else if (allownolimit === 0 && duration === 0) {
                hasErr = theUILang.FSnolimitoff;
            } else if (this.islimited(duration)) {
                hasErr = theUILang.FSmaxdur + ' ' + this.maxdur;
            }

            if (hasErr) {
                const deferred = $.Deferred();
                deferred.reject({errcode: 'error', msg:  hasErr});
                return deferred.promise();
            }

            return this.api.post({method: 'add', target: file, pass: pass, duration: duration})
                .then(function (r) {
                    self.setEntriesList(r);
                    return r;
                });
        },

        del: function (entries) {

            var deferred = $.Deferred();

            if (!$type(entries) || entries.length === 0) {
                deferred.reject('Empty paths');
                return deferred.promise();
            }
            return this.api.post({method: 'del', entries: entries}).then(this.setEntriesList);
        },

        deleteEntries: function () {

            const selectedEntries = $.map(table.rowSel, function(value, index) {
                return  flm.share.entriesList[index.split('_fsh_')[1]].hash;
            });

            askYesNo(theUILang.FSdel, theUILang.FSdelmsg, function () {
                flm.share.del(selectedEntries);
            });
        },

        islimited: function (cur) {

            var max = plugin.config.maxlinks;

            return (max > 0) ? ((cur > max)) : false;
        },

        getEntries: function () {

            return this.api.post({method: 'show'});

        },

        setEntriesList: function (entries) {
            entries = entries.list || {};

            self.entriesList = entries;
            plugin.table.addEntries(entries);
        },

        refresh: function () {
            this.getEntries().then(this.setEntriesList, function (err) {
                return err;
            });
        },

        viewDetails: function (id) {
            let target = id.split('_fsh_')[1];
            let data = flm.share.entriesList[target];

            data.formatted = table.rowdata[id].fmtdata;
            plugin.showDialog('fsh-view', data);
        },

        init: function () {
            this.api = flm.client(plugin.path + 'fsh.php');
            this.refresh();
        }

    };

    return self;
}

plugin.setFileManagerMenuEntries = function (menu, path) {

    var pathIsDir = flm.utils.isDir(path);

    if (plugin.enabled) {

        var createPos = thePlugins.get('filemanager').ui.getContextMenuEntryPosition(menu, theUILang.fcreate, 1);

        if (createPos > -1) {
            menu[createPos][2].push([theUILang.FSshare, (!pathIsDir && !flm.share.islimited(theWebUI.getTable("fsh").rows)) ? function () {
                plugin.showDialog('flm-create-share');
            } : null]);
        }

    }

};

plugin.showDialog = function (what, templateData) {

    let dialogs = flm.ui.getDialogs();
    let diagConf = flm.ui.dialogs.getDialogConfig(what);

    diagConf.options = {
        //	public_endpoint: plugin.config.public_endpoint,
        views: "flm-share",
        plugin: plugin,
        data: templateData
    };

    return dialogs.setDialogConfig(what, diagConf).showDialog(what);
};

plugin.setUI = function (flmUi) {

    var viewsPath = plugin.path + 'views/';
    let dialogs = flm.ui.dialogs;

    flm.views.namespaces['flm-share'] = viewsPath;

    dialogs.setDialogConfig('flm-create-share',
        {
            options: {
                views: "flm-share"
            },
            pathbrowse: false,
            modal: false,
            template: viewsPath + "dialog-create-share"
        }
    ).setDialogConfig('fsh-view',
        {
            pathbrowse: false,
            modal: false,
            template: viewsPath + "dialog-view"
        }
    );

    window.flm.ui.filenav.onSetEntryMenu(plugin.setFileManagerMenuEntries);

    flm.views.getView(viewsPath + 'table-header', {apiUrl: flm.api.endpoint},
        function (view) {

        $('#FileShare').prepend(view);

        setTimeout(function () {
            $('#FS_refresh').click(function () {
                flm.share.refresh();
            });
        }, 100);

    });
    plugin.renameTab("FileShare", theUILang.FSshow);
    plugin.table.updateColumnNames();
};

plugin.flmConfig = theWebUI.config;
theWebUI.config = function (data) {
    plugin.table.create();
    plugin.flmConfig.call(this, data);
};

plugin.onShow = theTabs.onShow;
theTabs.onShow = function (id) {
    if (id === "FileShare") {
        flm.share.refresh();
    }
    plugin.onShow.call(this, id);
};

plugin.onLangLoaded = function () {

    if (this.enabled) {
        //onSetEntryMenu
        thePlugins.get('filemanager').ui.readyPromise
            .then(function (flmUi) {
                plugin.setUI(flmUi);
                flm.share = new plugin.FileShare();
                flm.share.init();
            }, function (reason) {

            });


    }
};


plugin.onRemove = function () {
    this.removePageFromTabs('FileShare');
    $('[id^="FS_"]').remove();
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

plugin.loadLang();
