<?php

use Flm\WebController;
use Flm\Share\Crypt;

class FileManagerShare extends WebController {


	protected $datafile;
	public $data = array();
	//private $limits;

	protected $storage;

	protected $encoder;


	public function __construct($config) {

	    parent::__construct($config);

	    $this->storage = new rCache('/' . __CLASS__);

		$this->encoder = new Crypt();

	}

	public function setEncryption() {
        Crypt::setEncryptionKey($this->config()->key);
    }
	public function config() {
	    return (object)$this->config['share'];
    }

	protected function getSharePath ($token, $ext = '.dat')
    {
        $d = ['hash' => $token . $ext];
        return $d;
    }

	public function islimited($max, $cur) {
		global $limits;

		return ($limits[$max]) ? (($cur <= $limits[$max]) ? false : true): false;
	}

	protected function getShares()
    {
            $path = FileUtil::getSettingsPath().'/' . __CLASS__;

            $files = glob($path . DIRECTORY_SEPARATOR ."*.{dat}", GLOB_BRACE);

            $r = [];


            $this->setEncryption();


            foreach ($files as $path)
            {
                $id = pathinfo($path, PATHINFO_FILENAME);

                $entry =  $this->read(self::getSharePath($id));
                unset($entry->credentials);
                $id = $this->encoder->setString(json_encode([User::getUser(), $id]))->getEncoded();
                $r[$id] = $entry;
            }


            return $r;
    }

	public function add($params) {

         $duration = $params->duration;
         $password = $params->pass;
		global $limits;


        $file =  $this->flm->getWorkDir($params->target);

		if(($stat = LFS::stat($file)) === FALSE) {die('Invalid file');}

		if($limits['nolimit'] == 0) {
			if($duration == 0) {die('No limit not allowed');}
		}

		if($this->islimited('duration', $duration)) {die('Invalid duration!');}

		if($this->islimited('links', count($this->data))) {die('Link limit reached');}

		if($password === FALSE) {$password = '';}

		do {$token = Crypt::randomChars();} while ($this->read($this->getSharePath($token)));

		if($password)
        {
            Crypt::setEncryptionKey($password);
        }

        $this->encoder->setString(json_encode(['u' => User::getUser()]));

        $data = array(
            'file' => $file,
            'size' => $stat['size'],
            'created' => time(),
            'expire' => time()+(3600*876000),
            'hasPass' => !empty($password),
            'downloads' => 0,
            'credentials' => $this->encoder->getEncoded());

		if($duration > 0) {
            $data['expire'] = time()+(3600*$duration);
        }


		$this->write($token, $data);

        return ['error' => 0, 'list' =>  $this->getShares()];
	}


    private function authenticate() {
        header('WWW-Authenticate: Basic realm="Password"');
        header('HTTP/1.0 401 Unauthorized');
        echo "Not permitted\n";
        exit;
    }

	public function downloadFile($token)
    {
        if(!$this->load($token))
        {
            die('No such file or it expired');
        }


        if(isset($this->data->hasPass) && $this->data->hasPass) {

            if (!isset($_SERVER['PHP_AUTH_USER']))
            {
                $this->authenticate();
            }

            Crypt::setEncryptionKey(isset($_SERVER['PHP_AUTH_PW']) ? $_SERVER['PHP_AUTH_PW'] : '' );

            try{
                $credentials =  json_decode(Crypt::fromEncoded($this->data->credentials)->getString(), true);
            } catch (Exception $e)
            {
                // invalid pass
                $credentials = [];
            }

            // invalid pass
            if(!isset($credentials['u']))
            {
                $this->authenticate();

            }
        }

        if (!SendFile::send($this->data->file, null, null, false)) {
            CachedEcho::send('Invalid file: " - ' . $this->data->file , "text/html");
        } else {

            $this->load($token)
            && ++$this->data->downloads
            && $this->write($token, (array)$this->data);
        }
        die();

    }

    public function del($input) {
		$items = $input->entries;

        if(!$items) { die('Invalid link id');}

		foreach($items as $id) {
			    $this->storage->remove((object)self::getSharePath($id, ''));
		}

        return ['error' => 0, 'list' =>  $this->getShares()];

    }

	public function edit($id, $duration, $password) {
		global $limits;

		if(!isset($this->data[$id])) {die('Invalid link');}

		if($duration !== FALSE) {
			if($limits['nolimit'] == 0) {
				if($duration == 0) {die('No limit not allowed');}
			}
			if($this->islimited('duration', $duration)) {die('Invalid duration!');}
			if($duration > 0) {
				$this->data[$id]['expire'] = time()+(3600*$duration);
			} else {
				$this->data[$id]['expire'] = time()+(3600*876000);
			}
		}

		if($password === FALSE) {
			$this->data[$id]['password'] = '';
		} else {
			$this->data[$id]['password'] = $password;
		}
		//$this->write();
	}

	public function show() {
	    $shares = $this->getShares();
        foreach ($shares as &$entry) {
                $entry->file = $this->flm->extractChrootPath($entry->file );
        }

		return ['list' => $shares];
	}

	public function read($file)
    {
        $file = (object)$file;

        $ret = $this->storage->get($file);

        return $ret ? $file : $ret;
    }

	protected function load($token) {
        $file = $this->getSharePath($token);
        $this->data = $this->read((object)$file);

        return $this->data ? true : false;
	}

	private function write($token, $data = []) {

        $file = $this->getSharePath($token);

        $file = array_merge($data, $file);
     //   $file->modified = time();

        return $this->storage->set((object)$file);

	}



}
