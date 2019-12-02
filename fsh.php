<?php

use Flm\Helper;

$flmPluginDir = dirname(__FILE__) . DIRECTORY_SEPARATOR . '../filemanager';

require_once ($flmPluginDir . '/init.php');
include ($flmPluginDir . '/flm.class.php');
require_once ($flmPluginDir . '/src/RemoteShell.php');
require_once ($flmPluginDir . '/src/Filesystem.php');
require_once ($flmPluginDir . '/../_task/task.php');


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include(dirname(__FILE__) . '/src/Crypt.php');
include(dirname(__FILE__) . '/src/FileManagerShare.php');
$config = include(dirname(__FILE__) . '/conf.php');

$c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));

$c->handleRequest();