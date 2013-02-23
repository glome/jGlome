<?php
// Any user messages there might occur
$messages = array();

$langs = array();

// Set English as the first as it is the fallback language
$langs['en'] = array();

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
        
        if (!is_writable($filename))
        {
            $messages[$filename] = "Warning: file <em>{$filename} is in a read-only mode";
        }
        
        if (!$json)
        {
            $langs[$regs[1]] = array();
        }
        else
        {
            $langs[$regs[1]] = $json;
        }
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
            
            // If not found in English, set as default
            if (!isset($langs['en'][$key]))
            {
                $langs['en'][$key] = $key;
            }
        }
    }
}

if (isset($_POST['i18n']))
{
    $langs = array_merge($langs, $_POST['i18n']);
    
    foreach ($langs as $lang => $values)
    {
        if (!preg_match('/^[a-z]{2}$/', $lang))
        {
            continue;
        }
        
        $filename = "glome-{$lang}.json";
        
        if (!file_put_contents($filename, json_encode($values)))
        {
            $messages[$filename] = "Could not write to <em>{$filename}</em> because it is not writable by HTTP process";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Glome localizer</title>
    <meta http-equiv="Content-Type" value="text/html; charset=UTF-8" />
    <link rel="stylesheet" type="text/css" href="localizer.css" />
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
    <script src="jquery.localizer.js"></script>
  </head>
  <body>
    <h1>Glome i18n</h1>
<?php
if (count($messages))
{
    echo "    <ul class=\"notice\">\n";
    
    foreach ($messages as $message)
    {
        echo "      <li>{$message}</li>\n";
    }
    
    echo "    </ul>\n";
}
?>
    <form method="post" action=".">
      <div class="form">
        <table>
          <thead>
            <tr>
              <th>String</th>
<?php
foreach (array_keys($langs) as $lang)
{
    echo "              <th>{$lang} <label><input type=\"checkbox\" value=\"{$lang}\" /> Hide</label></th>\n";
}
?>
            </tr>
          </thead>
          <tbody>
<?php
foreach ($i18n_strings as $i => $str)
{
    if ($i % 2)
    {
        $class = 'odd';
    }
    else
    {
        $class = 'even';
    }
    
    echo "            <tr class=\"{$class}\">\n";
    echo "              <th>{$str}</th>\n";
    
    foreach (array_keys($langs) as $lang)
    {
        $value = '';
        
        if (isset($langs[$lang][$str]))
        {
            $value = htmlentities(mb_convert_encoding($langs[$lang][$str], 'ISO-8859-1', 'UTF-8'));
        }
        
        $title = htmlentities(mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8'));
        
        echo "              <td lang=\"{$lang}\"><textarea name=\"i18n[{$lang}][{$title}]\" title=\"{$title}\" placeholder=\"Locale {$lang}...\">{$value}</textarea></td>\n";
    }
    
    echo "            </tr>\n";
}
?>
          </tbody>
        </table>
      </div>
      <div class="form_toolbar">
        <input type="submit" value="Save" />
      </div>
    </form>
  </body>
</html>