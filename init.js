
plugin.loadCSS('share');

plugin.setMenuEntries = function (menu, path) {

	var pathIsDir = flm.utils.isDir(path);

	if(plugin.enabled) {

		var ext = flm.utils.getExt(path);

		var el = theContextMenu.get( theUILang.fcreate );
		if(el) {
			theContextMenu.add( el, [theUILang.FSshare, (!pathIsDir
				&& !theWebUI.FS.islimited(theWebUI.FS.maxlinks, theWebUI.getTable("fsh").rows))
				? function() {


					flm.ui.getDialogs().showDialog('flm-create-share');


					theWebUI.FS.show(path, 'add');

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
			views: "flm-media"
		},
		modal: false,
		template: viewsPath + "dialog-create-share"
	};

	window.flm.ui.browser.onSetEntryMenu(plugin.setMenuEntries);

	plugin.attachPageToTabs($('<div>').attr("id","FileShare").addClass('table_tab').get(0), theUILang.FSshow);
	$('#tab_lcont').append('<input type="button" id="FS_refresh" class="Button" value="'+theUILang.fRefresh+'" style="display: none;">');

};


var share = {

	downlink: '',
	clip: {},

	add: function (button) {

		var file = $('#FS_file').val();
		var duration = $('#FS_duration').val();
		var password = $('#FS_password').val();
		var maxduration = parseFloat(this.maxdur);
		var allownolimit = parseFloat(this.nolimit);

		if(!duration.match(/^\d+$/)) {alert(theUILang.FSvdur); return false;}
		if(allownolimit == 0) {
			if(duration == 0) {alert(theUILang.FSnolimitoff); return false;}
			if(this.islimited(maxduration, duration)) {alert(theUILang.FSmaxdur+' '+this.maxdur); return false;}
		} else {
			if(this.islimited(maxduration, duration)) {alert(theUILang.FSmaxdur+' '+this.maxdur+' '+theUILang.FSnolimit); return false;}
		}
		$(button).attr('disabled',true);

		this.query('action=add&file='+encodeURIComponent(file)+'&to='+encodeURIComponent(password)+'&target='+encodeURIComponent(duration),
				function() {	theDialogManager.hide('FS_main');
						log(theUILang.FSshow+': '+theUILang.FSlinkcreate);
		});
	},

	edit: function (button) {

		var duration = $('#FS_duration').val();
		var password = $('#FS_password').val();
		var linkid = $('#FS_lid').val();
                var maxduration = parseFloat(this.maxdur);
		var allownolimit = parseFloat(this.nolimit);

		if($.trim(duration) != '') {
			if (!duration.match(/^\d+$/)) {alert(theUILang.FSvdur); return false;}
			if(allownolimit == 0) {
				if(duration == 0) {alert(theUILang.FSnolimitoff); return false;}
				if(this.islimited(maxduration, duration)) {alert(theUILang.FSmaxdur+' '+this.maxdur); return false;}
			} else {
				if(this.islimited(maxduration, duration)) {alert(theUILang.FSmaxdur+' '+this.maxdur+' '+theUILang.FSnolimit); return false;}
			}
		}
		$(button).attr('disabled',true);

		this.query('action=edit&file='+encodeURIComponent(linkid)+'&to='+encodeURIComponent(password)+(duration ? '&target='+encodeURIComponent(duration) : ''),
				function() {	theDialogManager.hide('FS_main');
						log(theUILang.FSshow+': '+theUILang.FSlinkedit);
		});
	},

	del: function () {
		
		var sr = theWebUI.getTable("fsh").rowSel;
		var list = {};

		var x = 0;
		for (i in sr) {
			var id = i.split('_fsh_')[1];
			if (sr[i]) {list[x] = id; x++;}
		}

		this.query('action=del&target='+theWebUI.fManager.encode_string(list));

	},

	islimited: function (max, cur) {return (max > 0) ? ((cur <= max) ? false : true) : false;},

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

	refresh: function() {theWebUI.FS.query('action=list');},

	resize: function (w, h) {

		if(w!==null) {w-=8;}

		if(h!==null) {
			h-=($("#tabbar").height());
			h-=2;
        	}

		var table = theWebUI.getTable("fsh");
		if(table) {table.resize(w,h);}
	},


	rename: function() {
		var table = theWebUI.getTable("fsh");
		if(table.created && plugin.allStuffLoaded) {

			table.renameColumnById('time',theUILang.FSexpire);
			table.renameColumnById('name',theUILang.FSfile);
			table.renameColumnById('pass',theUILang.FSpassword);
			table.renameColumnById('link',theUILang.FSdlink);

		} else { setTimeout(arguments.callee,1000);}

	},

	tableadd: function(data) { 

		var table = theWebUI.getTable("fsh");
		table.clearRows();

		$.each(data.list, function(ndx,item) {
   			 
				table.addRowById({
					name: item.file,
					size: item.size,
					time: item.expire,
					pass: item.password,
					link: theWebUI.FS.downlink+'?uh='+encodeURIComponent(data.uh)+'&s='+ndx
				}, "_fsh_"+ndx, 'Icon_File');
		});
		
		table.refreshRows();
	},

	tablecreate: function () {

		theWebUI.tables.fsh = {
			obj: new dxSTable(),
			columns:
			[
				{ text: '',			width: "210px", id: "name",		type: TYPE_STRING },
				{ text: theUILang.Size,			width: "60px",	id: "size",		type: TYPE_NUMBER },
				{ text: '', 			width: "120px", 	id: "time",		type: TYPE_STRING, 	"align" : ALIGN_CENTER},
				{ text: '',			width: "80px", 	id: "pass",		type: TYPE_STRING },
				{ text: '',			width: "310px",	id: "link",		type: TYPE_STRING }
			],
			container:	"FileShare",
			format:		theWebUI.FS.tableformat,
			onselect:	function(e,id) { theWebUI.FS.tablemenu(e,id); }
		};


	},


	tableformat: function(table,arr) {
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

	tablemenu: function(e, id) {

		if($type(id) && (e.button == 2)) {

			theContextMenu.clear();

			var table = theWebUI.getTable("fsh");
			var target = id.split('_fsh_')[1];

			if(table.selCount == 1) {
				var link = theWebUI.getTable("fsh").getValueById('_fsh_'+target, 'link');
				ZeroClipboard.setData("text/plain", link);
			}

			theContextMenu.add([theUILang.fDelete, function() {askYesNo(theUILang.FSdel, theUILang.FSdelmsg, "theWebUI.FS.del()" );}]);
			theContextMenu.add([theUILang.FSedit, (table.selCount > 1) ? null : function() {theWebUI.FS.show(target, 'edit');}]);
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


	query: function(action, complete, err) {


			$.ajax({
  				type: 'POST',
   				url: plugin.path + '/fsh.php',
				timeout: theWebUI.settings["webui.reqtimeout"],
			       async : true,
			       cache: false,
				data: action,
   				dataType: "json",

				error: function(XMLHttpRequest, textStatus, errorThrown) {
					log('FILE SHARE: error - STATUS:'+textStatus+' MSG: '+XMLHttpRequest.responseText);			
				},

				success: function(data, textStatus) {if($type(complete)) {complete();}
										theWebUI.FS.tableadd(data);}
 		});


	}

};

theWebUI.FS = share;



plugin.config = theWebUI.config;
theWebUI.config = function(data) {

		theWebUI.FS.tablecreate();
		theWebUI.FS.rename();
		plugin.config.call(this,data);
}


plugin.resizeBottom = theWebUI.resizeBottom;
theWebUI.resizeBottom = function( w, h ) {

		theWebUI.FS.resize(w, h);
		plugin.resizeBottom.call(this,w,h);
}


plugin.onShow = theTabs.onShow;
theTabs.onShow = function(id) {

	if(id == "FileShare") {
			$('#FS_refresh').show();
			theWebUI.getTable('fsh').refreshRows();
			theWebUI.resize();
	} else {$('#FS_refresh').hide(); plugin.onShow.call(this,id);}
};

plugin.onLangLoaded = function() {

	injectScript(plugin.path + '/settings.js.php', function() {theWebUI.FS.refresh();});
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
}

plugin.loadLang();
