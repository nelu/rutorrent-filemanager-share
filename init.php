<?php
$config = include('conf.php');
$theSettings->registerEventHook($plugin["name"],"File_remove", 10, true);

$theSettings->registerPlugin($plugin["name"]);

unset($config['key']);

$jResult.= 'plugin.config = '.json_encode($config) . ';';
