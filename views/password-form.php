<?php
// error section
$err = $withError
? <<<ERR
<div id="error" style="display: inline-block; color: red; margin-left: 8px;"><strong>Wrong password. Try again!</strong></div>
ERR
: '';

return <<<PAGE
<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Password required</title>
<style>
body {
    font-family: Tahoma, Arial, Helvetica, sans-serif;
}
h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: .5rem;
    font-weight: 500;
    line-height: 1.2;
}
h1 {
    font-size: calc(1.375rem + 1.5vw);
}
#error {
  -moz-animation: cssAnimation 0s ease-in 4s forwards;
  -webkit-animation: cssAnimation 0s ease-in 4s forwards;
  -o-animation: cssAnimation 0s ease-in 4s forwards;
  animation: cssAnimation 0s ease-in 4s forwards;
  -webkit-animation-fill-mode: forwards;
  animation-fill-mode: forwards;
}
@keyframes cssAnimation {
  to {
    width:0;
    height:0;
    overflow:hidden;
  }
}
@-webkit-keyframes cssAnimation {
  to {
    width:0;
    height:0;
    visibility:hidden;
  }
}
</style>
</head>
<body>

<form method="post" onsubmit="setTimeout(function(){document.getElementById('pw').value=''},10)">
<legend><h1>Password required</h1></legend>
<label for="pw">Password:</label> &nbsp;
<input type="text" name="pw" id="pw" value="" style="-webkit-text-security: disc" autocomplete="off" required>
<br><br>
<div style="display: inline-block;"><input type="submit" name="submit">{$err}</div>
</form>
</body>
</html>
PAGE;
