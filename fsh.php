<?php
use Flm\Helper;

include dirname(__FILE__) . '/boot.php';
$config = include(dirname(__FILE__) . '/conf.php');

$c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));

$c->handleRequest();