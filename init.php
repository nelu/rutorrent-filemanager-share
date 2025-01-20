<?php
$config = include('conf.php');
$theSettings->registerEventHook($plugin["name"], "File_remove", 10, true);
$theSettings->registerEventHook($plugin["name"], "File_rename", 10, true);
$theSettings->registerEventHook($plugin["name"], "File_move", 10, true);

$theSettings->registerPlugin($plugin["name"]);


if(!empty($config['key'])) {unset($config['key']);}

$jResult .= 'plugin.config = ' . json_encode($config) . ';';

