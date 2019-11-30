
plugin.loadCSS('share');

var table = {

	addEntry: function(data) {

		var table = theWebUI.getTable("fsh");
		table.clearRows();

		$.each(data.list, function(ndx,item) {

			table.addRowById({
				name: item.file,
				size: item.size,
				time: item.expire,
				link: flm.share.downlink+'?uh='+encodeURIComponent(data.uh)+'&s='+ndx
			}, "_fsh_"+ndx, 'Icon_File');
		});

		table.refreshRows();
	},

	entryMenu: function(e, id) {

		if($type(id) && (e.button == 2)) {

			theContextMenu.clear();

			var table = theWebUI.getTable("fsh");
			var target = id.split('_fsh_')[1];

			if(table.selCount == 1) {
				var link = theWebUI.getTable("fsh").getValueById('_fsh_'+target, 'link');
				ZeroClipboard.setData("text/plain", link);
			}

			theContextMenu.add([theUILang.fDelete, function() {askYesNo(theUILang.FSdel, theUILang.FSdelmsg, "flm.share.del()" );}]);
			theContextMenu.add([theUILang.FSedit, (table.selCount > 1) ? null : function() {flm.share.show(target, 'edit');}]);
			theContextMenu.add([CMENU_SEP]);
			theContextMenu.add([theUILang.FScopylink,(table.selCount > 1) ? null : function() {}]);

			theContextMenu.show();

			if(table.selCount == 1) {
				var copyBtn = theContextMenu.get(theUILang.FScopylink)[0];
				new ZeroClipboard(copyBtn);
			}

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
					case 'time':
						arr[i] = theConverter.date(iv(arr[i])+theWebUI.deltaTime/1000);
						break;
				}
		}
		return(arr);
	},

	updateColumnNames: function() {
		var table = theWebUI.getTable("fsh");

		table.renameColumnById('time',theUILang.FSexpire);
		table.renameColumnById('name',theUILang.FSfile);
		table.renameColumnById('link',theUILang.FSdlink);

	}
};

table.create =  function () {
	plugin.attachPageToTabs($('<div>').attr("id","FileShare").addClass('table_tab').get(0),'FileShare');

	theWebUI.tables.fsh = {
		obj: new dxSTable(),
		columns:
			[
				{ text: '',			width: "210px", id: "name",		type: TYPE_STRING },
				{ text: theUILang.Size,			width: "60px",	id: "size",		type: TYPE_NUMBER },
				{ text: '', 			width: "120px", 	id: "time",		type: TYPE_STRING, 	"align" : ALIGN_CENTER},
				{ text: '',			width: "310px",	id: "link",		type: TYPE_STRING }
			],
		container:	"FileShare",
		format:		table.format,
		onselect:	function(e,id) { table.entryMenu(e,id); }
	};


};

var share = {

	api: null,

	downlink: '',
	clip: {},

	add: function (file, pass, duration) {

		var maxduration = parseFloat(plugin.config.maxdur);
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

		return this.api.post({method: 'add', target:file, pass: pass, duration: duration});


		this.query('action=add&file='+encodeURIComponent(file)+
			'&to='+encodeURIComponent(password)+'&target='+encodeURIComponent(duration),
				function() {	theDialogManager.hide('FS_main');
						log(theUILang.FSshow+': '+theUILang.FSlinkcreate);
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
		return this.api.post({method: 'del', entries: entries});
	},

	islimited: function (cur) {

		var max = plugin.config.maxlinks;

		return (max > 0) ? ((cur <= max) ? false : true) : false;},

	show: function (what, how) { 

		var file;
		var password;

		var edit = $('#FS_editbut');
		var add = $('#FS_addbut');

		switch(how) {

			case 'edit':
				var table = theWebUI.getTable("fsh");
				file = table.getValueById('_fsh_'+what, 'name');
				password = table.getValueById('_fsh_'+what, 'pass');
				$('#FS_downlink').val(table.getValueById('_fsh_'+what, 'link')).show();
				add.hide();
				edit.show();
				break;
			case 'add':
				file = theWebUI.fManager.homedir+theWebUI.fManager.curpath+what;
				password = '';
				$('#FS_downlink').hide();
				edit.hide();
				add.show();
				break;
		}

		$('#FS_lid').val(what);
		add.attr('disabled',false);
		edit.attr('disabled',false);
		$('#FS_duration').val('');
		$('#FS_password').val(password);
		$('#FS_file').val(file);
	},

	refresh: function() {flm.share.query('action=list');},



	init: function () {
		this.api = flm.client(plugin.path+'fsh.php');
	}

};

plugin.setMenuEntries = function (menu, path) {

	var pathIsDir = flm.utils.isDir(path);

	if(plugin.enabled) {

		var ext = flm.utils.getExt(path);

		var el = theContextMenu.get( theUILang.fcreate );
		if(el) {
			theContextMenu.add( el, [theUILang.FSshare, (!pathIsDir
				&& !flm.share.islimited(theWebUI.getTable("fsh").rows))
				? function() {
					flm.ui.getDialogs().showDialog('flm-create-share');
					flm.share.show(path, 'add');

				}
				: null]);
		}

	}

};

plugin.setUI = function(flmUi) {

	var viewsPath = plugin.path + 'views/';

	flm.views.namespaces['flm-share'] = viewsPath;

	flmUi.getDialogs().forms['flm-create-share'] = {
		options: {
			//	public_endpoint: plugin.config.public_endpoint,
			views: "flm-media",
			plugin: plugin
		},
		pathbrowse: false,
		modal: false,
		template: viewsPath + "dialog-create-share"
	};

	window.flm.ui.browser.onSetEntryMenu(plugin.setMenuEntries);


	flm.views.getView(viewsPath + '/' +'table-header',{apiUrl: flm.api.endpoint},
		function (view) {

			$('#FileShare').prepend(view);
		}
	);


	plugin.renameTab("FileShare",theUILang.FSshow);
	table.updateColumnNames()
};

plugin.flmConfig = theWebUI.config;
theWebUI.config = function(data) {

		table.create();
		plugin.flmConfig.call(this,data);
};

plugin.onShow = theTabs.onShow;
theTabs.onShow = function(id) {

	if(id == "FileShare") {
			$('#FS_refresh').show();
			theWebUI.getTable('fsh').refreshRows();
			theWebUI.resize();
	}
	plugin.onShow.call(this,id);
};

plugin.onLangLoaded = function() {

	injectScript(plugin.path + '/js/clip/ZeroClipboard.js', function() {
								ZeroClipboard.config( { swfPath: plugin.path + '/js/clip/ZeroClipboard.swf', forceHandCursor: true } );
								ZeroClipboard.on("copy", ZeroClipboard.blur);
								new ZeroClipboard();
							});

	if(this.enabled) {
		//onSetEntryMenu
		thePlugins.get('filemanager').ui.readyPromise
			.then(
				function (flmUi) {
					plugin.setUI(flmUi);
					share.init();
					flm.share = share;

				//	window.flm.media = media;
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
