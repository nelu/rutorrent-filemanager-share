<?php

// duration & links limits
// 0 = unlimited
$limits['duration'] = 750;        // maximum duration hours
$limits['links'] = 0;   //maximum sharing links per user

// extra
$limits['nolimit'] = 0; // allow unlimited duration (=~ 100 years) with duration = 0 (the maximum duration limit is kept) [1 = yes | 0 = no]

// url with the path where a symlink to share.php can be found
// example: http://mydomain.com/share.php
// relative url example
// $downloadpath = '//'.$_SERVER['HTTP_HOST'].'/rutorrent/plugins/filemanager-share/share.php';
$downloadpath = $_ENV['RU_FLM_SHARE_ENDPOINT'] ?? '';

// automatically remove shares - only when removing the file or the containing directory
$autoRemove = false;

// automatically remove expired shares - called only when removing
$purgeExpired = true;

return ['limits' => $limits,
        'endpoint' => $downloadpath,
        "key" => $_ENV['RU_FLM_SHARE_KEY'] ?? "mycu570m3ncryp710nk3y",
        "remove_share_on_file_delete" => $autoRemove,
        "purge_expired_shares" => $purgeExpired
];
