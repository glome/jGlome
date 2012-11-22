var w = window.open('../template.html', 'template-test', 'width=500,height=500');
w.jQuery = jQuery;

QUnit.test('Vital template parts', function()
{
  QUnit.ok(jQuery(w).find('#glomeTemplates').size(), 'Glome templates container was found');
});

QUnit.test('Resize actions', function()
{
  w.resizeTo(500,500);
  QUnit.equal(jQuery(w).height(), 500, 'Window was resized correctly');
});