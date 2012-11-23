var w = window.open('../template.html', 'template-test', 'width=500,height=500');
var wq = null;

var resize = function(wnd, width, height)
{
  wnd.resizeTo(width, height);
  var dx = width - jQuery(wnd.document).width();
  var dy = height - jQuery(wnd.document).height();
  
  wnd.resizeBy(dx, dy)
}

// Execute the tests only after the window has loaded
QUnit.module('Prerequisites');
QUnit.test('Window resizes as commanded', function()
{
  var width = 500;
  var height = 500;
  
  resize(w, width, height);
  QUnit.equal(jQuery(w).width(), width, 'Window was resized correctly, width is ' + width + 'px');
  QUnit.equal(jQuery(w).height(), height, 'Window was resized correctly, height is ' + height + 'px');
  
  // Set width and height
  width = 1000;
  height = 700;
  
  resize(w, width, height);
  QUnit.equal(jQuery(w).width(), width, 'Window was resized correctly, width is ' + width + 'px');
  QUnit.equal(jQuery(w).height(), height, 'Window was resized correctly, height is ' + height + 'px');
});

QUnit.asyncTest('Vital template parts', function()
{
  jQuery(window).everyTime(500, 'templateLoad', function()
  {
    if (jQuery(w.document).find('#glomeTemplates').size())
    {
      // End the timer
      jQuery(this).stopTime('templateLoad');
      
      // Continue running the tests
      QUnit.equal(1, jQuery(w.document).find('#glomeTemplates').size(), 'Template container loaded');
      
      // Bind wq as a shorthand for the popup document
      wq = jQuery(w.document);
      
      QUnit.start();
    }
  });
});

