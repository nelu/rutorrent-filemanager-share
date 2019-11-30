<?php
$config = include('conf.php');

$theSettings->registerPlugin("filemanager-share");

$jResult.= 'plugin.config = '.json_encode($config) . ';';
