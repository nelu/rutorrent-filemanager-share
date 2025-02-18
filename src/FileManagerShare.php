<?php

namespace Flm\Share;

use CachedEcho;
use Exception;
use Flm\WebController;
use LFS;
use rCache;
use ReflectionMethod;
use SendFile;
use User;

class FileManagerShare extends WebController
{
    const DATA_FILE_EXT = 'dat';
    /**
     * @var array
     */
    public $data = [
        'file' => null,
        'size' => null,
        'created' => null,
        'expire' => null,
        'hasPass' => null,
        'downloads' => null,
        'credentials' => null
    ];

    //private $limits;

    protected $storage;
    protected $encoder;
    /**
     * @var string
     */
    protected $storeDir;


    public function __construct($config)
    {
        parent::__construct($config);

        $this->storage = new rCache('/' . (new \ReflectionClass($this))->getShortName());
        $this->encoder = new Crypt();

        # we need the full path from the storage engine
        $r = new ReflectionMethod('rCache', 'getName');
        $r->setAccessible(true);
        $this->storeDir = $r->invoke($this->storage, (object)['hash' => '']);
        $r->setAccessible(false);

    }

    /**
     * @param $encrypted
     * @param $withKey
     * @return array
     * @throws Exception
     */
    public static function From($encrypted, $withKey): array
    {
        Crypt::setEncryptionKey($withKey);

        $data = json_decode(Crypt::fromEncoded(trim($encrypted, '/'))->getString(), true);

        return ['user' => $data[0], 'token' => $data[1]];
    }

    /**
     * @param $params
     * @return array
     * @throws Exception
     */
    public function add($params)
    {
        $conf = $this->config();
        $duration = (int)$params->duration;
        $password = (string)$params->pass;
        $files = (array)$params->files;

        if ($duration == 0 && intval($conf->limits['duration']) != 0) {
            throw new Exception('FSnolimitoff', 102);
        }

        if (empty($password) && $conf->require_password) {
            throw new Exception('Password is required');
        }

        if ($this->islimited('duration', $duration)) {
            throw new Exception('Invalid duration');
        }

        if ($this->islimited('links', count((array)$this->getShares()) + count($files))) {
            throw new Exception('Link limit reached');
        }

        $currentUser = User::getUser();
        $token = null;

        foreach ($files as $file) {

            $file = $this->flm->currentDir($file);
            $fpath = $this->flm()->getFsPath($file);

            if (($stat = LFS::stat($fpath)) === FALSE) {
                throw new Exception('Invalid file: ' . $file, 6);
            }

            do {
                $token = Crypt::randomChars();
            } while ($this->read(self::getStoreFile($token)));

            !empty($password) && Crypt::setEncryptionKey($password);

            $this->encoder->setString(json_encode(['u' => $currentUser]));

            $now = time();
            $this->data = [
                'file' => $file,
                'size' => $stat['size'],
                'created' => $now,
                'expire' => ($duration > 0) ? $now + (3600 * $duration) : 0,
                'hasPass' => !empty($password),
                'downloads' => 0,
                'credentials' => $this->encoder->getEncoded()
            ];

            $this->write($token);
        }

        return array_merge($this->show(), ['error' => 0, 'new' => $this->getStoreFile($token)]);
    }

    public function islimited($name, $cur)
    {
        $conf = $this->config()->limits;
        return ($conf[$name]) ? (($cur <= $conf[$name]) ? false : true) : false;
    }

    public function getShares(): array
    {
        $files = glob($this->storeDir . "*.{" . self::DATA_FILE_EXT . "}", GLOB_BRACE);

        $r = [];

        Crypt::setEncryptionKey($this->config()->key);

        foreach ($files as $filepath) {

            $entry = $this->read(basename($filepath));
            unset($entry->credentials);

            $id = pathinfo($filepath, PATHINFO_FILENAME);
            $id = $this->encoder->setString(json_encode([User::getUser(), $id]))->getEncoded();
            $r[$id] = $entry;
        }

        return $r;
    }

    public function config()
    {
        return (object)$this->config['share'];
    }

    public function read($file)
    {
        $result = (object)['hash' => $file];
        $ret = $this->storage->get($result);

        return $ret ? $result : $ret;
    }

    public static function getStoreFile($token, $ext = self::DATA_FILE_EXT)
    {
        return $token . '.' . $ext;
    }

    protected function write($token = null)
    {
        $data = $this->data;
        if ($token != null) {
            $data = array_merge($data, ['hash' => $this->getStoreFile($token)]);
        }

        return $this->storage->set((object)$data);
    }

    public function show()
    {
        $shares = $this->getShares();

        return ['list' => $shares];
    }

    public function downloadShare($token)
    {
        if (!$this->load($token)) {
            $this->showNotFound();
        }

        if ($this->isExpired()) {
            header("HTTP/1.1 410 Gone");
            CachedEcho::send('File has expired');
        }

        if ($this->data['hasPass']) {

            $postPassword = isset($_POST['pw']) ? (string)$_POST['pw'] : '';

            if (!strlen($postPassword)) {
                $this->showPasswordForm();
            } else if (!$this->isValidPassword($postPassword)) {
                // invalid pass
                $this->showPasswordForm(true);
            }
        }

        $fpath = $this->flm()->getFsPath($this->data['file']);

        if (!SendFile::send($fpath, null, null, false)) {
            $this->showNotFound();
        } else {
            $this->data['downloads']++;
            $this->write();
        }

        exit;
    }

    public function load($token)
    {
        $file = self::getStoreFile($token);
        $fileData = $this->read($file);

        if ($fileData !== false) {
            $this->data = (array)$fileData;
        }

        return ($fileData !== false);
    }

    public function showNotFound($file = null)
    {
        if (is_null($file)) {
            $file = $this->data['file'];
        }
        header("HTTP/1.1 404 Not Found");
        CachedEcho::send(
            'File not found' . is_null($file) ? '' : ': ' . basename($file),
            "text/html"
        );
    }

    public function isExpired($share = null): bool
    {
        if ($share == null) {
            $share = $this->data;
        }
        $share = (array)$share;
        return $share['expire'] !== 0 && (time() >= $share['expire']);
    }

    public function showPasswordForm($withError = false)
    {
        if ($withError) {
            header("HTTP/1.1 403 Forbidden");
        }
        CachedEcho::send(include(__DIR__ . '/../views/password-form.php'), "text/html");
    }

    public function isValidPassword($pass)
    {
        Crypt::setEncryptionKey($pass);

        try {
            $credentials = json_decode(Crypt::fromEncoded($this->data['credentials'])->getString(), true);
        } catch (Exception $e) {
            // invalid pass
            $credentials = [];
        }

        return isset($credentials['u']);
    }

    public function del($input)
    {
        $items = $input->entries;

        if (empty($items)) {
            die('Invalid link id');
        }

        foreach ($items as $id) {
            $item = (object)['hash' => $id];
            $this->storage->remove($item);
        }

        return array_merge($this->show(), ['error' => 0]);
    }

    public function edit($id, $duration, $password)
    {
        global $conf;

        if (!isset($this->data[$id])) {
            die('Invalid link');
        }

        if ($duration !== FALSE) {
            if ($conf['nolimit'] == 0) {
                if ($duration == 0) {
                    die('No limit not allowed');
                }
            }
            if ($this->islimited('duration', $duration)) {
                die('Invalid duration');
            }
            if ($duration > 0) {
                $this->data[$id]['expire'] = time() + (3600 * $duration);
            } else {
                $this->data[$id]['expire'] = time() + (3600 * 876000);
            }
        }

        if ($password === FALSE) {
            $this->data[$id]['password'] = '';
        } else {
            $this->data[$id]['password'] = $password;
        }
        //$this->write();
    }

}
