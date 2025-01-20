<?php
// duration & links limits
// 0 = unlimited

// max expire time for a share in hours
$conf['duration'] = $_ENV['RU_FLM_SHARE_MAX_DURATION'] ?? 1; // 0 - unlimited

// max links per user
$conf['links'] = $_ENV['RU_FLM_SHARE_MAX_LINKS'] ?? 0; // 0 - unlimited

return [
    'limits' => $conf,

    // whether a password is mandatory for link creation
    'require_password' => false,

    // url with the path where a symlink to share.php can be found
    // example: http://mydomain.com/share.php
    // 'endpoint' = '//'.$_SERVER['HTTP_HOST'].'/rutorrent/plugins/filemanager-share/share.php',
    // relative url example
    // 'endpoint' = './plugins/filemanager-share/share.php',
    'endpoint' => $_ENV['RU_FLM_SHARE_ENDPOINT'] ?? '',

    // key used for storing encrypted data
    "key" => $_ENV['RU_FLM_SHARE_KEY'] ?? "",

    // automatically remove shares - only when removing the file or the containing directory
    "remove_share_on_file_delete" => false,

    // automatically remove expired shares - called only when removing
    "purge_expired_shares" => true
];
