<?php
use Flm\Helper;
use Flm\Share\FileManagerShare;

include dirname(__FILE__) . '/boot.php';
$config = include('conf.php');

if (!isset($_SERVER['PATH_INFO']) || empty($_SERVER['PATH_INFO']))
{
    die('No such file or it expired');
}

try {
    $share = FileManagerShare::From($_SERVER['PATH_INFO'], $config['key']);

    $_SERVER['REMOTE_USER'] = $share['user'];

    $c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));
    $c->downloadShare($share['token']);

} catch (Throwable $err) {

    FileUtil::toLog($err);
    die('No such file or it expired');

}
