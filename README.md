# rutorrent-filemanager-share
File sharing plugin for rutorrent filemanager.

This plugin is available both in the 'Files' and 'File Manager' tabs context menus

Features:
 - unique file download link
 - link password protection
 - link expire timer
 - number of downloads stats

Dependencies: 
 - [rutorrent-filemanager](https://github.com/nelu/rutorrent-filemanager)
 plugin 
 - openssl php extension
 
 
Plugin configuration `conf.php`:
 
 ```php 
$limits['duration'] = 24; 
$limits['links'] = 0;
$limits['nolimit'] = 0;
$downloadpath = '//'.$_SERVER['HTTP_HOST'].'/rutorrent/plugins/filemanager-share/share.php';
 ```
   - `$limits['duration']` - max link expire time in hours if `$limits['nolimit']` is disabled
   - `$limits['links']` - max number of links the user can create
   - `$limits['nolimit']` - whether to enforce a link expire time (duration) for the user
   - `$downloadpath` - a public  entrypoint (no htpasswd) where `share.php` is accessible. Should be a symlink to `plugins/filemanager-share/share.php`

Example for `$downloadpath` config with htpasswd enabled:
 - rutorrent url (htpasswd): https://mydomain.com/rutorrent/
 - `$downloadpath` url (no htpasswd): https://mydomain.com/share.php - where `share.php` is a symlink to `rutorrent/plugins/filemanager-share/share.php`
    