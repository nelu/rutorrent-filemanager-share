<?php
$flmPluginDir = dirname(__FILE__) . DIRECTORY_SEPARATOR . '../filemanager';

require_once($flmPluginDir . '/boot.php');
\Flm\Helper::registerAutoload(dirname(__FILE__) . '/src', 'Flm\\Share');
require_once (__DIR__ . '/../_task/task.php');


