<?php
use Flm\Helper;
use Flm\Share\FileManagerShare;

include dirname(__FILE__) . '/boot.php';
$config = include(dirname(__FILE__) . '/conf.php');

$c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));

$c->handleRequest();