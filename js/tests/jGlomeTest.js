function versionCompare(a, b)
{
  var parts_a = a.toString().split('.');
  var parts_b = b.toString().split('.');
  
  //console.log('a: ' + a + ', b: ' + b);
  
  var regexp = new RegExp('([0-9]+)(a(lpha)?|b(eta)?|rc?)([0-9]*)$', 'i');
  
  for (var i = 0; i < Math.max(parts_a.length, parts_b.length); i++)
  {
    var t_a = (typeof parts_a[i] == 'undefined') ? '0' : parts_a[i];
    var t_b = (typeof parts_b[i] == 'undefined') ? '0' : parts_b[i];
    
    console.log(t_a.match(regexp));
    
    // Catch alpha and beta versions
    if ((regs = t_a.match(regexp)))
    {
      parts_a.push(t_a.match(regexp)[2].toLowerCase()[0]);
      
      if (regs[5])
      {
        parts_a.push(regs[5]);
      }
      
      t_a = t_a.replace(/[^0-9]+/g, '');
    }
    
    if ((regs = t_b.match(regexp)))
    {
      parts_b.push(t_b.match(regexp)[2].toLowerCase()[0]);
      
      if (regs[5])
      {
        parts_b.push(regs[5]);
      }
      
      t_b = t_b.replace(/[^0-9]+/g, '');
    }
    
    if (t_a == 'a')
    {
      t_a = -3;
    }
    
    if (t_b == 'a')
    {
      t_b = -3;
    }
    
    if (t_a == 'b')
    {
      t_a = -2;
    }
    
    if (t_b == 'b')
    {
      t_b = -2;
    }
    
    if (t_a == 'r')
    {
      t_a = -1;
    }
    
    if (t_b == 'r')
    {
      t_b = -1;
    }
    
    if (t_a.toString().match(/[^\-0-9]/))
    {
      throw new Error('Parse error for the first attribute: ' + t_a);
    }
    
    if (t_b.toString().match(/[^\-0-9]/))
    {
      throw new Error('Parse error for the second attribute: ' + t_b);
    }
    
    // Equal
    if (Number(t_a) === Number(t_b))
    {
      continue;
    }
    
    if (Number(t_a) < Number(t_b))
    {
      return -1;
    }
    
    if (Number(t_a) > Number(t_b))
    {
      return 1;
    }
  }
  
  return 1;
}

test('versionCompare', function()
{
  expect(13);
  
  ok(versionCompare, 'function exists');
  
  // Verify cases where A is expected to be greater than B
  equal(1, versionCompare('1.0', '1.0'), '1.0 is 1.0');
  equal(1, versionCompare('0.9', '0.1'), '0.9 is greater than 0.1');
  equal(1, versionCompare('1.10', '1.2'), '1.10 is greater than 1.2');
  equal(1, versionCompare('1.0.2', '1.0.1'), '1.0.2 is greater than 1.0.1');
  
  // Verify cases where B is expected to be greater than A
  equal(-1, versionCompare('1.0', '1.1'), '1.0 is less than 1.1');
  equal(-1, versionCompare('2.0', '10'), '2.0 is less than 10');
  
  // Usage of alpha and beta
  equal(-1, versionCompare('1.0a', '1.0b'), '1.0a is less than 1.0b');
  equal(1, versionCompare('0.0.1a', '0.0.1alpha'), '0.0.1a is equal to 0.0.1alpha');
  equal(1, versionCompare('1.0', '1.0a'), '1.0 is more than 1.0a');
  equal(-1, versionCompare('1.0rc1', '1.0rc2'), 'Release candidate 1 is less than release candidate 2');
  equal(1, versionCompare('1.0b2', '1.0b'), 'Beta 2 is greater than plain beta');
  
  // Malformatted strings
  throws(function(){versionCompare('lorem ipsum', '1.0')}, 'Caught a parse error');
});

test('jQuery loaded', function()
{
  expect(3);
  ok(jQuery, 'function exists');
  equal('function', typeof jQuery, 'jQuery is a function');
  equal(1, versionCompare(jQuery.fn.jquery, '1.8.0'), 'jQuery is at least version 1.8.0 (v' + jQuery.fn.jquery + ')');
});

