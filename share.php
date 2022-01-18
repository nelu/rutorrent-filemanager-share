<?php
use Flm\Helper;
use Flm\Share\Crypt;
include dirname(__FILE__) . '/boot.php';
include(dirname(__FILE__) . '/conf.php');
$config = include('conf.php');

if(!isset($_SERVER['PATH_INFO']) || empty($_SERVER['PATH_INFO']))
{
    die('No such file or it expired');
}

Crypt::setEncryptionKey($config['key']);

try {

    $data = json_decode(Crypt::fromEncoded(trim($_SERVER['PATH_INFO'],'/'))->getString(), true);

    list($user, $token) = $data;

    $_SERVER['REMOTE_USER'] = $user;

    $c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));

    $c->downloadFile($token);

} catch (Exception) {

    die('No such file or it expired');

}
