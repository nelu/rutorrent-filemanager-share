<?php


if(!isset($_GET['uh'])) {die('Invalid link');}
$_SERVER['REMOTE_USER'] = base64_decode($_GET['uh']);

$_POST['action'] = 'downloadFile';

include_once dirname(__FILE__) . '/fsh.php';
