var page = require('webpage').create();
var url = 'index.html';

page.onConsoleMessage = function(msg)
{
    if (msg.indexOf("FINISHED") > -1)
    {
        var failed = msg.split(' ');
        phantom.exit(failed[1]);
    }
};

page.onLoadFinished = function(status)
{
  console.log('--onload finished');
}

page.open(url, function(status)
{
  page.evaluate(function()
  {
    console.log('QUnit: ' + typeof QUnit);
    QUnit.done = function(result)
    {
      console.log('FINISHED: ' + result.failed);
    }

  });
  page.viewportSize =
  {
    width: 600,
    height: 600
  };

  page.render('js/tests/phantom.png');
  page.viewportSize =
  {
    width: 400,
    height: 400
  };
  page.render('js/tests/phantom2.png');
  phantom.exit();
});
