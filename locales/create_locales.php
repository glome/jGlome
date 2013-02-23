<?php
$langs = array();
if (   isset($_GET['lang'])
    && preg_match('/^[a-z]{2}$/', $_GET['lang']))
{
    $lang = $_GET['lang'];
}
else
{
    $lang = 'en';
}

// Read in the current language files
$dir = dir(dirname(__FILE__));
while ($filename = $dir->read())
{
    if (preg_match('/^glome-([a-z]{2})\.json$/', $filename, $regs))
    {
        $content = file_get_contents($filename);
        $json = json_decode($content, true);
        
        if (!$json)
        {
          continue;
        }
        
        $langs[$regs[1]] = $json;
    }
}

// Read in all the occurences of locale strings
$template = file_get_contents('../template.html');
preg_match_all('/data-i18n="(.+?)"/', $template, $regs);
$i18n_strings = array();

if (   isset($regs[1])
    && count($regs[1]))
{
    foreach ($regs[1] as $key)
    {
        if (!in_array($key, $i18n_strings))
        {
            $i18n_strings[] = $key;
        }
    }
}


?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Glome localizer</title>
    <meta http-equiv="Content-Type" value="text/html; charset=UTF-8" />
  </head>
  <body>
  </body>
</html>