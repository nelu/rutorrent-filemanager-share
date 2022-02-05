<?php

use Flm\Helper;
use Flm\Share\FileManagerShare;

include dirname(__FILE__) . '/boot.php';

class filemanager_shareHooks
{

    public static function OnFile_remove( $task_info )
    {
        $config = include(dirname(__FILE__) . '/conf.php');

        $c = new FileManagerShare(array_merge(Helper::getConfig(), ['share' => $config]));
        $userShares = $c->getShares();
        $toDelete = [];

        // check shared files in the included paths and remove the shares (if expired for now)
        foreach ($task_info['files'] as $f) {
            $search_path = rtrim($f, '/');
            foreach ($userShares as $id => $share)
            {
                if(strpos($share->file, $search_path) !== false
                && (
                    $config['remove_share_on_file_delete']
                    || ($config["purge_expired_shares"] && $c->isExpired($share))
                    )
                ) {
                    $toDelete[] = $share->hash;
                }
            }
        }

        if(!empty($toDelete))
        {
            $c->del((object)['entries' => $toDelete]);
        }
    }
}
