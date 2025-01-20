plugin.endpoint = plugin.config && plugin.config.endpoint && plugin.config.endpoint !== ''
    ? plugin.config.endpoint
    : window.location.href.replace(/[\/?#]+$/, '') + '/' + plugin.path + 'share.php';

plugin.containerId = "FileShare";

plugin.createTable = () => {
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
        format: (table, arr) => flm.share.table.format(table, arr),
        onselect: (e, id) => flm.share.table.entryMenu(e, id),
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
};

plugin.init = (module) => {
    flm.share = new module.FileManagerShare(plugin);
    flm.share.init();
    plugin.markLoaded();
};

plugin.onLangLoaded = () => Promise.all([thePlugins.get('filemanager').loaded()])
    .then(() => import('./' + plugin.path + 'js/share.js'))
    .then(plugin.init);

plugin.onRemove = function () {
    this.removePageFromTabs(plugin.containerId);
    $('[id^="FS_"]').remove();
};


if (plugin.enabled) {

    if (!$type(plugin.config.key) && plugin.config.key !== '') {
        plugin.onTaskFinished = (task) => flm.triggerEvent('taskDone', [task]);
        plugin.canChangeTabs() && $(document).on('theWebUI:config', () => plugin.createTable());
        $(document).on('theTabs:onShow', (id) => (id === plugin.containerId) && flm.share && flm.share.refresh());
        plugin.loadLang();
        plugin.loadCSS('share');
    } else {
        log(plugin.name + ': Encryption \'key\' not set in conf.php. Plugin disabled');
        plugin.remove();
    }
}

