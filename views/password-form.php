<?php
return <<<PAGE
<!DOCTYPE html>
<html lang="en">
<head>
<title>Password required</title>
</head>
<body>
<h1>Password required</h1>
<form method="post" onsubmit="setTimeout(function(){document.getElementById('pw').value=''},10)">
<label for="pw">Password:</label> &nbsp;
<input type="text" name="pw" id="pw" value="" style="-webkit-text-security: disc" autocomplete="off" required>
<br><br>
<input type="submit" name="submit">
</form>
</body>
</html>
PAGE;
