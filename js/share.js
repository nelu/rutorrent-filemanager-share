export function FileManagerShare(plugin) {
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
        plugin.table.addEntries(entries);
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

        data['formatted'] = table.rowdata[id].fmtdata;
        plugin.showDialog('fsh-view', data);
    };

    this.add = (fileList, pass, duration) => {
        //let file = flm.stripJailPath(path.val());
        let filePaths = flm.ui.dialogs.getCheckedList(fileList);
        let errContainer = fileList.length > 1 ? fileList.find('input').get(0) : fileList[0];

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
            }))
                .then((r) => {
                    self.setEntriesList(r);
                    let shareId = Object.entries(self.entriesList)
                        .reduce((res, entry) => entry[1].hash === r['new'] ? entry[0] : res, false);

                    plugin.table.get().selectRowById(plugin.table.getEntryId(shareId));
                    theTabs.show(plugin.containerId);
                    r.new = shareId;
                    return r;
                }, (e, x) => {
                    console.log(arguments);
                        if(e.msg.split(" ").length === 1) {
                            e.msg = theUILang[e.msg];
                        }
                        return e;
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
