<?php
$flmPluginDir = dirname(__FILE__) . DIRECTORY_SEPARATOR . '../filemanager';

require_once ($flmPluginDir . '/init.php');
include($flmPluginDir . '/src/FileManager.php');
require_once($flmPluginDir . '/src/BaseController.php');
require_once ($flmPluginDir . '/src/RemoteShell.php');
require_once ($flmPluginDir . '/src/Filesystem.php');
require_once ($flmPluginDir . '/../_task/task.php');


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include(dirname(__FILE__) . '/src/Crypt.php');
include(dirname(__FILE__) . '/src/FileManagerShare.php');
