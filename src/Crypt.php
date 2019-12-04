<?php

namespace Flm\Share;

class Crypt
{

    protected $str;

    // converts bas
    public static $base64_replace = array(
        '=' => '_',
        '/' => '-',
    );

    protected static $enc_method = 'AES-256-CBC';
    protected static $enc_key = 'mykey';
    protected static $enc_control = '/K/';


    public function __construct($str = null)
    {
        if(is_string($str)) {
            $this->setString($str);
        }
    }

    public function setString(string $str)
    {
        $this->str = $str;
        return $this;
    }

    public function getString()
    {

        return $this->str;
    }

    public function getEncoded()
    {
        $encoded = self::encrypt($this->str . self::$enc_control);
        return self::escapeBase64($encoded);
    }

    public static function fromEncoded( $str)
    {
        $base64 = self::unescapeBase64($str);
        $decoded = self::decrypt($base64);

        $cLen = strlen(self::$enc_control);

        // data integrity check
        if (substr($decoded, -1 * $cLen) == self::$enc_control) {
            $decoded = substr($decoded, 0, -1 * $cLen);
        } else {
            throw new \Exception('Invalid encoded data');
        }

        return new self($decoded);
    }

    public static function setEncryptionKey($str)
    {
        self::$enc_key = $str;
    }

    public static function escapeBase64($string)
    {
        return str_replace(array_keys(self::$base64_replace), array_values(self::$base64_replace), $string);
    }

    public static function unescapeBase64($string)
    {
        return str_replace(array_values(self::$base64_replace), array_keys(self::$base64_replace), $string);
    }

    public static function randomChars($length = "32") {

        $rnd = '';

        for ($i=0; $i<$length; $i++) {
            $lists[1] = rand(48,57);
            $lists[2] = rand(65,90);
            $lists[3] = rand(97,122);

            $randchar = $lists[rand(1,3)];

            $rnd .= chr($randchar);
        }

        return $rnd;
    }

    public static function decrypt($value = null)
    {
        if (is_null($value)) {
            return null;
        }

        $crypttext = base64_decode($value);


        $ivlen = openssl_cipher_iv_length(self::$enc_method);
        /* $iv = openssl_random_pseudo_bytes($ivlen);*/
        // constant random
        $iv = substr(md5(__CLASS__), 0, $ivlen);
        $decrypttext = openssl_decrypt($crypttext, self::$enc_method, self::$enc_key, $options = 0, $iv);
        $decrypttext = substr($decrypttext, strlen(bin2hex($iv)));

        return $decrypttext;
    }

    public static function encrypt($value = null)
    {
        if (is_null($value)) {
            return null;
        }

        $ivlen = openssl_cipher_iv_length(self::$enc_method);
        /*     $iv = openssl_random_pseudo_bytes($ivlen);*/
        // constant random
        $iv = substr(md5(__CLASS__), 0, $ivlen);
        $value = bin2hex($iv) . $value;

        $crypttext = openssl_encrypt($value, self::$enc_method, self::$enc_key, $options = 0, $iv);

        return trim(base64_encode($crypttext));
    }
}
