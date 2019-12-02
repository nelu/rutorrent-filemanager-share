<?php


use Flm\Helper;
use Flm\Share\Crypt;

$flmPluginDir = dirname(__FILE__) . DIRECTORY_SEPARATOR . '../filemanager';
require_once ($flmPluginDir . '/src/Helper.php');
require_once ($flmPluginDir . '/src/RemoteShell.php');
require_once ($flmPluginDir . '/src/Filesystem.php');
require_once ($flmPluginDir . '/src/WebController.php');
include ($flmPluginDir . '/flm.class.php');

require_once ($flmPluginDir . '/../_task/task.php');


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include(dirname(__FILE__) . '/src/Crypt.php');
include(dirname(__FILE__) . '/src/FileManagerShare.php');
include(dirname(__FILE__) . '/conf.php');
$config = include('conf.php');

if(!isset($_SERVER['PATH_INFO']))
{
    die('No such file or it expired');
}

Crypt::setEncryptionKey($config['key']);

$data = json_decode(Crypt::fromEncoded(trim($_SERVER['PATH_INFO'],'/'))->getString(), true);

list($user, $token) = $data;

$_SERVER['REMOTE_USER'] = $user;


$c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));
$c->downloadFile($token);
