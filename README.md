# rutorrent-filemanager-share
File share link creation plugin for rutorrent filemanager.

This plugin is available both in the 'Files' and 'File Manager' tabs context menus

### Features:
 - unique file download link
 - link password protection
 - link expire timer
 - downloads stats

### Dependencies: 
 - [rutorrent-filemanager](https://github.com/nelu/rutorrent-filemanager)
 plugin 
 - openssl php extension
 
 ### Configuration
Plugin configuration `conf.php`:
 
 ```php 
 <?php
// duration & links limits
// 0 = unlimited

// max expire time for a share in hours
$limits['duration'] = $_ENV['RU_FLM_SHARE_MAX_DURATION'] ?? 0; // 0 - unlimited

// max links per user
$limits['links'] = $_ENV['RU_FLM_SHARE_MAX_LINKS'] ?? 0; // 0 - unlimited

return [
    'limits' => $limits,

    // whether a password is mandatory for link creation
    'require_password' => false,

    // url with the path where a symlink to share.php can be found
    // example: http://mydomain.com/share.php
    // relative url example
    // 'endpoint' = '//'.$_SERVER['HTTP_HOST'].'/rutorrent/plugins/filemanager-share/share.php';
    'endpoint' => $_ENV['RU_FLM_SHARE_ENDPOINT'] ?? '',

    // key used for storing encrypted data
    "key" => $_ENV['RU_FLM_SHARE_KEY'] ?? "mycu570m3ncryp710nk3y",

    // automatically remove shares - only when removing the file or the containing directory
    "remove_share_on_file_delete" => false,

    // automatically remove expired shares - called only when removing
    "purge_expired_shares" => true
];
 ```
   - `key` - the key used to store encrypted data like share passwords. CHANGE THE DEFAULT VALUE!
   - `$limits['duration']` - max link expire time in hours if `$limits['nolimit']` is disabled
   - `$limits['links']` - max number of links the user can create
   - `require_password` - make password required for shares
   - `endpoint` - a public  entrypoint (no htpasswd) where `share.php` is accessible. Should be a symlink to `plugins/filemanager-share/share.php`


Example for `endpoint` config with htpasswd enabled:
 - rutorrent url (htpasswd): https://mydomain.com/rutorrent/
 - public url (no htpasswd): https://mydomain.com/share/ - where `/share/index.php` is a symlink to `rutorrent/plugins/filemanager-share/share.php`
    