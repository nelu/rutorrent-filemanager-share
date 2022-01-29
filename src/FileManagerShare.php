<?php
namespace Flm\Share;

use CachedEcho;
use Exception;
use FileUtil;
use Flm\WebController;
use LFS;
use \rCache;
use SendFile;
use User;

class FileManagerShare extends WebController
{
    protected $datafile;
    public $data = [];
    //private $limits;

    protected $storage;
    protected $encoder;

    public function __construct($config)
    {
        parent::__construct($config);

        $this->classname = (new \ReflectionClass($this))->getShortName();
        $this->storage = new rCache('/' . $this->classname);
        $this->encoder = new Crypt();
    }

    public function setEncryption()
    {
        Crypt::setEncryptionKey($this->config()->key);
    }

    public function config()
    {
        return (object)$this->config['share'];
    }

    protected function getSharePath($token, $ext = '.dat')
    {
        $d = ['hash' => $token . $ext];

        return $d;
    }

    public function islimited($max, $cur)
    {
        global $limits;

        return ($limits[$max]) ? (($cur <= $limits[$max]) ? false : true) : false;
    }

    protected function getShares()
    {
        $path = FileUtil::getSettingsPath() . '/' . $this->classname;

        $files = glob($path . DIRECTORY_SEPARATOR . "*.{dat}", GLOB_BRACE);

        $r = [];

        $this->setEncryption();

        foreach ($files as $path) {
            $id = pathinfo($path, PATHINFO_FILENAME);

            $entry = $this->read(self::getSharePath($id));
            unset($entry->credentials);
            $id = $this->encoder->setString(json_encode([User::getUser(), $id]))->getEncoded();
            $r[$id] = $entry;
        }

        return $r;
    }

    /**
     * @param $params
     * @return array
     * @throws Exception
     */
    public function add($params)
    {
        $duration = $params->duration;
        $password = $params->pass;
        global $limits;

        $file = $this->flm->currentDir($params->target);
        $fpath = $this->flm()->getFsPath($params->target);

        if (($stat = LFS::stat($fpath)) === FALSE) {
            throw new Exception('Invalid file: '.$file);
        }

        if ($limits['nolimit'] == 0) {
            if ($duration == 0) {
                throw new Exception('No limit not allowed');
            }
        }

        if ($this->islimited('duration', $duration)) {
            throw new Exception('Invalid duration');
        }

        if ($this->islimited('links', count($this->data))) {
            throw new Exception('Link limit reached');
        }

        if ($password === FALSE) {
            $password = '';
        }

        do {
            $token = Crypt::randomChars();
        } while ($this->read($this->getSharePath($token)));

        if ($password) {
            Crypt::setEncryptionKey($password);
        }

        $this->encoder->setString(json_encode(['u' => User::getUser()]));

        $data = array(
            'fpath' => $fpath,
            'file' => $file,
            'size' => $stat['size'],
            'created' => time(),
            'expire' => time() + (3600 * 876000),
            'hasPass' => !empty($password),
            'downloads' => 0,
            'credentials' => $this->encoder->getEncoded());

        if ($duration > 0) {
            $data['expire'] = time() + (3600 * $duration);
        }

        $this->write($token, $data);

        return array_merge($this->show(), ['error' => 0]);
    }

    private function invalidPasswordPage()
    {
        echo '<!DOCTYPE html>';
        echo '<html lang="en">';
        echo '<head>';
        echo '<title>Password incorrect</title>';
        echo '<meta http-equiv="refresh" content="3">';
        echo '</head>';
        echo '<body>';
        echo '<h1>Password incorrect. Redirecting...</h1>';
        echo '</body>';
        echo '</html>';
        exit;
    }

    private function authFormPage()
    {
        echo '<!DOCTYPE html>';
        echo '<html lang="en">';
        echo '<head>';
        echo '<title>Password required</title>';
        echo '</head>';
        echo '<body>';
        echo '<h1>Password required</h1>';
        echo '<form method="post" onsubmit="setTimeout(function(){document.getElementById(\'pw\').value=\'\';},10)">';
        echo '<label for="pw">Password:</label> &nbsp;';
        echo '<input type="text" name="pw" id="pw" style="-webkit-text-security: disc" autocomplete="off" required>';
        echo '<br><br>';
        echo '<input type="submit" name="submit">';
        echo '</form>';
        echo '</body>';
        echo '</html>';
        exit;
    }

    private function getFile($data)
    {
        if (!SendFile::send($data->fpath, null, null, false)) {
            CachedEcho::send('File not found "' . $data->file . '"', "text/html");
        } else {
            ++$data->downloads
            && $this->write('', serialize($data), true);
        }
        exit;
    }

    public function downloadFile($token)
    {
        if (!$this->load($token)) {
            die('No such file');
        }

        $data = unserialize($this->data);

        if (time() >= $data->expire) {
            die('File has expired');
        }

        if (isset($data->hasPass) && $data->hasPass) {

            session_start();

            if (isset($_SESSION['authform']['ok'])) {
                unset($_SESSION['authform']);
                session_write_close();
                $this->getFile($data);
            }

            if ($_SERVER['REQUEST_METHOD'] == 'POST') {
                $_SESSION['authform']['postdata'] = $_POST;
                unset($_POST);
            }

            if (!isset($_SESSION['authform']['postdata']['pw'])) {
                unset($_SESSION['authform']);
                $this->authFormPage();
            }

            Crypt::setEncryptionKey($_SESSION['authform']['postdata']['pw']);

            try {
                $credentials = json_decode(Crypt::fromEncoded($data->credentials)->getString(), true);
            } catch (Exception $e) {
                // invalid pass
                $credentials = [];
            }

            // invalid pass
            if (!isset($credentials['u'])) {
                unset($_SESSION['authform']);
                $this->invalidPasswordPage();
            }

            $_SESSION['authform']['ok'] = 1;
            echo '<meta http-equiv="refresh" content="0">';
            exit;

        }
        $this->getFile($data);
    }

    public function del($input)
    {
        $items = $input->entries;

        if (!$items) {
            die('Invalid link id');
        }

        foreach ($items as $id) {
            $this->storage->remove((object)self::getSharePath($id, ''));
        }

        return array_merge($this->show(), ['error' => 0]);
    }

    public function edit($id, $duration, $password)
    {
        global $limits;

        if (!isset($this->data[$id])) {
            die('Invalid link');
        }

        if ($duration !== FALSE) {
            if ($limits['nolimit'] == 0) {
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

    public function show()
    {
        $shares = $this->getShares();

        return ['list' => $shares];
    }

    public function read($file)
    {
        $file = (object)$file;

        $ret = $this->storage->get($file);

        return $ret ? $file : $ret;
    }

    protected function load($token)
    {
        $path = FileUtil::getSettingsPathEx($_SERVER['REMOTE_USER']) . '/' . $this->classname;

        $file = $this->getSharePath($token);

        $this->datafile = $path . '/' . $file['hash'];

        $this->data = @file_get_contents($this->datafile);

        return $this->data ? true : false;
    }

    private function write($token, $data = [], $updateOnly = false)
    {
        if (!$updateOnly) {
            $file = $this->getSharePath($token);

            $file = array_merge($data, $file);
            //$file->modified = time();

            return $this->storage->set((object)$file);
        }

        return file_put_contents($this->datafile, $data);
    }
}
