<?php
$config = include('conf.php');

$theSettings->registerPlugin("filemanager-share");

unset($config['key']);

$jResult.= 'plugin.config = '.json_encode($config) . ';';
