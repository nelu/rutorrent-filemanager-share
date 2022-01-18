
plugin.loadCSS('share');

var table = {

	addEntries: function(data) {

		var table = theWebUI.getTable("fsh");
		table.clearRows();

		$.each(data.list, function(ndx,item) {

			table.addRowById({
				file: item.file,
				downloads: parseInt(item.downloads),
				created: item.created,
				size: item.size,
				time: item.expire,
				link: plugin.config.endpoint+'/'+ndx
			}, "_fsh_"+item.hash, 'Icon_File');
		});

		table.refreshRows();
	},

	entryMenu: function(e, id) {

		if($type(id) && (e.button === 2)) {

			theContextMenu.clear();

			var table = theWebUI.getTable("fsh");
			var target = id.split('_fsh_')[1];

			if(table.selCount === 1) {
				theContextMenu.add([theUILang['flm_popup_fsh-view'], function() {
					plugin.showDialog('fsh-view', table.rowdata[id].fmtdata);

				}]);

				theContextMenu.add([theUILang['flm_popup_fsh-view-fm'], function() {
					var file = table.getValueById(id, 'file');
					flm.showPath(flm.utils.basedir(file));
				}]);

			}

			theContextMenu.add([theUILang.fDelete, function() {
				askYesNo(theUILang.FSdel, theUILang.FSdelmsg, function () {
					var selectedEntries = [];
					var entryName;
					var i;

					for (i in table.rowSel) {
						if( table.rowSel[i])
						{
							entryName = i.split('_fsh_')[1];
							selectedEntries.push(entryName);
						}
					}
					share.del(selectedEntries);
				} );
			}]);
			theContextMenu.add([CMENU_SEP]);
			theContextMenu.add([theUILang.FScopylink, (table.selCount !== 1) ? null : function() {
				var link = table.getValueById(id, 'link');
				copyToClipboard(link);
			}]);

			theContextMenu.show();

			return(true);
		}
		return(false);
	},

	format: function(table,arr) {
		for(var i in arr)
		{
			if(arr[i]==null)
				arr[i] = '';
			else
				switch(table.getIdByCol(i)) {
					case 'size' :
						arr[i] = theConverter.bytes(arr[i], 2);
						break;
					case 'created':
						arr[i] = theConverter.date(iv(arr[i])+theWebUI.deltaTime/1000);
						break;
					case 'time':
						arr[i] = theConverter.date(iv(arr[i])+theWebUI.deltaTime/1000);
						break;
				}
		}
		return(arr);
	},

	updateColumnNames: function() {
		var table = theWebUI.getTable("fsh");

		table.renameColumnById('file',theUILang.FSfile);
		table.renameColumnById('downloads',theUILang.FSdnumb);
		table.renameColumnById('created',theUILang.FScreated);
		table.renameColumnById('time',theUILang.FSexpire);
		table.renameColumnById('link',theUILang.FSdlink);
	}
};

table.create =  function () {
	plugin.attachPageToTabs($('<div>').attr("id","FileShare").addClass('table_tab').get(0),'FileShare');

	theWebUI.tables.fsh = {
		obj: new dxSTable(),
		columns:
			[
				{ text: '',			width: "210px", id: "file",		type: TYPE_STRING },
				{ text: '',			width: "65px",	id: "downloads",	type: TYPE_NUMBER },
				{ text: theUILang.Size,		width: "60px",	id: "size",		type: TYPE_NUMBER },
				{ text: '', 			width: "120px",	id: "created",		type: TYPE_DATE, 	"align" : ALIGN_CENTER},
				{ text: '', 			width: "120px",	id: "time",		type: TYPE_STRING, 	"align" : ALIGN_CENTER},
				{ text: '',			width: "310px",	id: "link",		type: TYPE_STRING }
			],
		container:	"FileShare",
		format:		table.format,
		onselect:	function(e,id) { table.entryMenu(e,id); }
	};


};

var share = {

	api: null,

	add: function (file, pass, duration) {

		var allownolimit = parseFloat(plugin.config.nolimit);


		var deferred = $.Deferred();
		//flm.manager.logStart(theUILang.fStarts.archive);

		if(!$type(file) || file.length === 0)
		{
			deferred.reject('Empty paths');
			return deferred.promise();
		}

		if (flm.utils.isDir(file)) {
			deferred.reject( theUILang.fDiagInvalidname);
			return deferred.promise();
		}

		if(!duration.match(/^\d+$/))
		{
			deferred.reject( theUILang.FSvdur);
			return deferred.promise();
		} else if(allownolimit === 0 && duration === 0)
		{
			deferred.reject( theUILang.FSnolimitoff);
			return deferred.promise();
		}
		else if(this.islimited(duration))
		{
			deferred.reject(theUILang.FSmaxdur+' '+this.maxdur);
			return deferred.promise();
		}

		flm.manager.logAction(theUILang.FSshow, theUILang.FSlinkcreate);

		return this.api.post({method: 'add', target:file, pass: pass, duration: duration}).then(function (value) {
			table.addEntries(value);
		});

	},

	del: function (entries) {

		var deferred = $.Deferred();
		//flm.manager.logStart(theUILang.fStarts.archive);

		if(!$type(entries) || entries.length === 0)
		{
			deferred.reject('Empty paths');
			return deferred.promise();
		}
		return this.api.post({method: 'del', entries: entries}).then(function (value) {
			table.addEntries(value);
		});
	},

	islimited: function (cur) {

		var max = plugin.config.maxlinks;

		return (max > 0) ? ((cur <= max) ? false : true) : false;},

	getEntries: function () {

		return this.api.post({method: 'show'});

	},

	refresh: function() {
		this.getEntries().then(function (response) {
			table.addEntries(response);
			return response;
		}, function (reason) { return reason; });

	},

	init: function () {
		this.api = flm.client(plugin.path+'fsh.php');

		this.refresh();
	}

};

plugin.setFileManagerMenuEntries = function(menu, path) {

	var pathIsDir = flm.utils.isDir(path);

	if(plugin.enabled) {

		var createPos = thePlugins.get('filemanager').ui.getContextMenuEntryPosition(menu, theUILang.fcreate, 1);

		if(createPos > -1)
		{
			menu[createPos][2].push([theUILang.FSshare, (!pathIsDir
				&& !flm.share.islimited(theWebUI.getTable("fsh").rows))
				? function() {
					plugin.showDialog('flm-create-share');
				}
				: null]);
		}

	}

};

plugin.showDialog = function(what, templateData) {

	var dialogs = flm.ui.getDialogs();
	dialogs.forms[what].options=  {
			//	public_endpoint: plugin.config.public_endpoint,
			views: "flm-share",
			plugin: plugin,
			data: templateData

	};

	return dialogs.showDialog(what);
};

plugin.setUI = function(flmUi) {

	var viewsPath = plugin.path + 'views/';

	flm.views.namespaces['flm-share'] = viewsPath;

	var forms = flmUi.getDialogs().forms;

	forms['flm-create-share'] = {
		options: {
			views: "flm-share"
		},
		pathbrowse: false,
		modal: false,
		template: viewsPath + "dialog-create-share"
	};

	forms['fsh-view'] = {
		pathbrowse: false,
		modal: false,
		template: viewsPath + "dialog-view"
	};

	window.flm.ui.browser.onSetEntryMenu(plugin.setFileManagerMenuEntries);

	flm.views.getView(viewsPath + 'table-header',{apiUrl: flm.api.endpoint},
		function (view) {

			$('#FileShare').prepend(view);

			setTimeout(function () {
				$('#FS_refresh').click(function () {
					flm.share.refresh();
				});
			}, 100);

		}
	);
	plugin.renameTab("FileShare",theUILang.FSshow);
	table.updateColumnNames();
};

plugin.flmConfig = theWebUI.config;
theWebUI.config = function(data) {
	table.create();
	plugin.flmConfig.call(this,data);
};

plugin.onShow = theTabs.onShow;
theTabs.onShow = function(id) {

	if(id === "FileShare") {
            share.refresh();
			theWebUI.resize();
	}
	plugin.onShow.call(this,id);
};

plugin.onLangLoaded = function() {

	if(this.enabled) {
		//onSetEntryMenu
		thePlugins.get('filemanager').ui.readyPromise
			.then(
				function (flmUi) {
					plugin.setUI(flmUi);
					share.init();
					flm.share = share;
					},
				function (reason) {

				}
			);



	}
};


plugin.onRemove = function() {
	this.removePageFromTabs('FileShare');
	$('[id^="FS_"]').remove();
};


plugin.resizeBottom = theWebUI.resizeBottom;
theWebUI.resizeBottom = function( w, h ) {

		if(w!==null) {w-=8;}

		if(h!==null) {
			h-=($("#tabbar").height());
			h-=2;
		}

		var table = theWebUI.getTable("fsh");
		if(table) {table.resize(w,h);}

	plugin.resizeBottom.call(this,w,h);
};

plugin.loadLang();
