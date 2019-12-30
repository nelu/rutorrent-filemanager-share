<?php
$config = include('conf.php');
$theSettings->registerEventHook('filemanager',"remove");

$theSettings->registerPlugin("filemanager-share");

unset($config['key']);

$jResult.= 'plugin.config = '.json_encode($config) . ';';
