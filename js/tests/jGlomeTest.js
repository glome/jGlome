// Network latency for asynchronous testing
var networkLatency = 750;
var previousId = null;

function versionCompare(a, b)
{
  var parts_a = a.toString().split('.');
  var parts_b = b.toString().split('.');
  
  var regexp = new RegExp('([0-9]+)(a(lpha)?|b(eta)?|rc?)([0-9]*)$', 'i');
  
  for (var i = 0; i < Math.max(parts_a.length, parts_b.length); i++)
  {
    var t_a = (typeof parts_a[i] == 'undefined') ? '0' : parts_a[i];
    var t_b = (typeof parts_b[i] == 'undefined') ? '0' : parts_b[i];
    
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

/* Preliminary tests */
QUnit.module('Preliminary checks');

/* Browser support */
QUnit.test('Browser support', function()
{
  QUnit.ok(typeof window.localStorage != 'undefined', 'Support local storage');
  
  // Write something to local storage
  window.localStorage.setItem('foo', 'bar');
  QUnit.equal('bar', window.localStorage.getItem('foo'), 'Local storage returns the same string as its initial input');
});

/* Version compare tests */
QUnit.test('versionCompare', function()
{
  QUnit.expect(13);
  
  QUnit.ok(versionCompare, 'function exists');
  
  // Verify cases where A is expected to be greater than B
  QUnit.equal(1, versionCompare('1.0', '1.0'), '1.0 is 1.0');
  QUnit.equal(1, versionCompare('0.9', '0.1'), '0.9 is greater than 0.1');
  QUnit.equal(1, versionCompare('1.10', '1.2'), '1.10 is greater than 1.2');
  QUnit.equal(1, versionCompare('1.0.2', '1.0.1'), '1.0.2 is greater than 1.0.1');
  
  // Verify cases where B is expected to be greater than A
  QUnit.equal(-1, versionCompare('1.0', '1.1'), '1.0 is less than 1.1');
  QUnit.equal(-1, versionCompare('2.0', '10'), '2.0 is less than 10');
  
  // Malformatted strings
  QUnit.throws
  (
    function()
    {
      versionCompare('lorem ipsum', '1.0');
    },
    'Caught a parse error'
  );
  
  // Usage of alpha and beta
  QUnit.equal(-1, versionCompare('1.0a', '1.0b'), '1.0a is less than 1.0b');
  QUnit.equal(1, versionCompare('0.0.1a', '0.0.1alpha'), '0.0.1a is equal to 0.0.1alpha');
  QUnit.equal(1, versionCompare('1.0', '1.0a'), '1.0 is more than 1.0a');
  QUnit.equal(-1, versionCompare('1.0rc1', '1.0rc2'), 'Release candidate 1 is less than release candidate 2');
  QUnit.equal(1, versionCompare('1.0b2', '1.0b'), 'Beta 2 is greater than plain beta');
});

/* !Dependency tests */
QUnit.test('Dependency tests', function()
{
  QUnit.expect(7);
  
  QUnit.ok(jQuery, 'function exists');
  QUnit.equal('function', typeof jQuery, 'jQuery is a function');
  QUnit.equal(1, versionCompare(jQuery.fn.jquery, '1.8.0'), 'jQuery is at least version 1.8.0 (v' + jQuery.fn.jquery + ')');
  
  QUnit.ok(jQuery.fn.oneTime, 'jQuery.oneTime available');
  QUnit.ok(jQuery.fn.everyTime, 'jQuery.everyTime available');
  QUnit.ok(jQuery.fn.stopTime, 'jQuery.stopTime available');
  
  QUnit.ok(jQuery.Glome, 'Glome jQuery extension class exists');
});


var Glome = new jQuery.Glome();

/* !Glome generic method tests */
QUnit.module('Glome generic method tests');

/* !- Test methods*/
QUnit.test('Glome methods', function()
{
  QUnit.ok(Glome.get, 'Local storage getter is defined');
  QUnit.ok(Glome.set, 'Local storage setter is defined');
  
  // Test argument counts
  QUnit.throws
  (
    function()
    {
      Glome.get();
      Glome.get('foo', 'bar');
    },
    'Glome.get expects exactly one argument',
    'set method requires exact argument count of one'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.set();
      Glome.set('foo');
      Glome.set('foo', 'bar', 'foobar');
    },
    'Glome.set expects exactly two argument',
    'set method requires exact argument count of two'
  );
  
  var param = 'foobar';
  
  // Test that local storage returns null on undefined
  QUnit.deepEqual(Glome.get('loremipsum'), null, 'Storage returns null for undefined key');
  
  // Test that local storage sets and gets correctly a string
  QUnit.ok(Glome.set('foo', param), 'Storage setting is ok for type String');
  QUnit.deepEqual(Glome.get('foo'), param, 'Storage returns what it was fed with (type: String)');
  
  // Test that local storage sets and gets correctly an integer
  var param = 1;
  QUnit.ok(Glome.set('foo', param), 'Storage setting is ok for type Integer');
  QUnit.deepEqual(Glome.get('foo'), param, 'Storage returns what it was fed with (type: Integer)');
  QUnit.notDeepEqual(Glome.get('foo'), '1', 'Storage returns what it was fed with (type: integer is not a string)');
  QUnit.notDeepEqual(Glome.get('foo'), true, 'Storage returns what it was fed with (type: integer is not a boolean)');
  
  // Test that local storage sets and gets correctly a float
  var param = 1.1;
  QUnit.ok(Glome.set('foo', param), 'Storage setting is ok for type float');
  QUnit.deepEqual(Glome.get('foo'), param, 'Storage returns what it was fed with (type: float)');
  
  // Test that local storage sets and gets correctly an array
  var param = ['foo', 'bar'];
  QUnit.ok(Glome.set('foo', param), 'Storage setting is ok for type float');
  QUnit.deepEqual(Glome.get('foo'), param, 'Storage returns what it was fed with (type: float)');
  
  // Test that local storage sets and gets correctly an object
  var param =
  {
    foo: 'bar',
    bar: 'foo'
  };
  
  QUnit.ok(Glome.set('foo', param), 'Storage setting is ok for type object');
  QUnit.deepEqual(Glome.get('foo'), param, 'Storage returns what it was fed with (type: object)');
  
  // Check that preferences can be get and set
  QUnit.ok(Glome.pref, 'Glome preferences method exists');
  QUnit.throws
  (
    function()
    {
      Glome.pref();
      Glome.pref(1, 2, 3);
    },
    'Glome.pref excepts either one argument for get or two arguments for set',
    'Glome.pref excepts either one argument for get or two arguments for set'
  );
  
  // Glome preferences gets the value it has set
  var param = 'glomePrefTest';
  QUnit.ok(Glome.pref('foo', param), 'Storing a preference did not raise any errors');
  QUnit.deepEqual(Glome.pref('foo'), param, 'Preference remained the same after getting it');
});

/* !- Test API */
QUnit.asyncTest('Glome API', function()
{
  var method, callback;
  
  QUnit.ok(Glome.Api, 'API is accessible in general');
  QUnit.equal('function', typeof Glome.Api.get, 'API get is accessible');
  
  method = 'foobar';
  
  QUnit.throws
  (
    function()
    {
      Glome.Api.get(method);
    },
    'Glome.Api.get does not support request ' + method,
    'Glome.Api.get should not support arbitrary request ' + method
  );
  
  // Use ads method
  method = 'ads';
  
  QUnit.throws
  (
    function()
    {
      var data = {};
      var callback = 'foo';
      
      Glome.Api.get(method, data, callback);
    },
    'String "foo" is not a function'
  );
  
  var callback = function(d)
  {
    window.glomeCallback = 'callback called successfully';
  };
  
  var callbacks = new Array();
  callbacks.push(callback);
  
  QUnit.ok(Glome.Api.get(method, null, callback), 'Glome.Api.get supports null as second argument, function as third');
  QUnit.ok(Glome.Api.get(method, {}, callback), 'Glome.Api.get supports an object as second argument, function as third');
  QUnit.ok(Glome.Api.get(method, callback), 'Glome.Api.get supports function as second argument');
  
  QUnit.ok(Glome.Api.get(method, callbacks), 'Glome.Api.get supports an array of callbacks');
  
  Glome.Api.get(method, callback);
  
  window.setTimeout
  (
    function()
    {
      QUnit.start();
      QUnit.equal(window.glomeCallback, 'callback called successfully', 'Glome callback does what was expected');
    },
    networkLatency
  );
  
  QUnit.ok(Glome.Api.set)
});

/* !- Creating a new Glome ID */
QUnit.asyncTest('Creating a new Glome ID', function()
{
  // Set a test ID for the test runs
  var date = new Date();
  var testGlomeId = 'test' + date.getTime();
  
  // Erase any existing Glome ID
  Glome.glomeid = null;
  Glome.pref('glomeid', null);
  
  QUnit.throws
  (
    function()
    {
      Glome.createGlomeId();
    },
    'Glome ID creation requires a parameter',
    'Glome ID creation requires a parameter'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.createGlomeId({});
    },
    'Glome ID has to be alphanumeric',
    'Glome ID has to be alphanumeric'
  );
  
  QUnit.equal(null, Glome.id(), 'Glome ID is null');
  
  // Calling createGlomeId over 10 times should fail
  QUnit.throws
  (
    function()
    {
      
      Glome.createGlomeId(testGlomeId, 10);
    },
    'Exceeded maximum number of times to create a Glome ID',
    'Exceeded maximum number of times to create a Glome ID'
  );
  
  Glome.createGlomeId(testGlomeId);
  
  window.setTimeout
  (
    function()
    {
      QUnit.ok(Glome.id(), 'Glome ID is initialized');
      QUnit.equal(Glome.id(), Glome.pref('glomeid'), 'Initialized and stored Glome ID is the same');
      QUnit.start();
    },
    networkLatency
  );
});

QUnit.asyncTest('Duplicate Glome ID', function()
{
  // Try to recreate exactly same Glome ID
  previousId = Glome.id();
  Glome.glomeid = null;
  Glome.createGlomeId(previousId);
  
  window.setTimeout
  (
    function()
    {
      QUnit.notEqual(null, Glome.id(), 'Created successfully asynchronously a Glome ID after trying to create a reserved ID, part 1');
      QUnit.notEqual(previousId, Glome.id(), 'Created successfully asynchronously a Glome ID after trying to create a reserved ID, part 2');
      
      QUnit.strictEqual(Glome.id(), Glome.pref('glomeid'), 'Ensured that locally stored Glome ID is the newly created ID');
      
      var tmp = Glome.id();
      
      // Reset the current Glome ID so that it is fetched from the storage
      Glome.glomeid = null;
      
      QUnit.strictEqual(Glome.id(), tmp, 'Id is successfully received from the storage');
      QUnit.start();
    },
    networkLatency
  );
});

/* !Glome usage tests */
QUnit.module('Glome Ads class');

/* !Test handling ads */
QUnit.asyncTest('List ads', function()
{
  // Ad loading callback has to be a function
  QUnit.throws
  (
    function()
    {
      Glome.Ads.load([]);
    },
    'Glome.Ads.load callback has to be a function',
    'Glome.Ads.load throws an error on Array as callback'
  );
  
  // List ads for this Glome user
  Glome.Ads.load(function()
  {
    QUnit.start();
    QUnit.notEqual(0, Object.keys(Glome.ads).length, 'Glome ads were loaded');
  });
});


/* !Glome user interface tests */
/* !- Initialize user interface */
QUnit.module('Glome user interface');

/* !Glome templates tests */
QUnit.asyncTest('Glome templates', function()
{
  Glome.loadTemplates();
  
  window.setTimeout
  (
    function()
    {
      QUnit.ok(Glome.template, 'Glome template is accessible');
      QUnit.throws
      (
        function()
        {
          Glome.template();
          Glome.template('foo', 'bar');
        },
        'Glome.template respects the argument count'
      );
      
      QUnit.throws
      (
        function()
        {
          Glome.template('undefined-template');
        },
        'Glome.template throws an error on undefined "undefined-template"'
      );
      
      // Load Glome templates
      QUnit.ok(Glome.template('glome_templates'), 'Glome master template was found');
      
      QUnit.equal(jQuery('head').find('link[rel="stylesheet"][href$="glome.css"][data-glome]').size(), 1, 'Glome CSS was appended');
      QUnit.start();
    },
    networkLatency
  );
});

// These tests have to be asynchronous to ensure that template test
// has been run already
QUnit.asyncTest('Glome UI', function()
{
  window.setTimeout
  (
    function()
    {
      var fx = jQuery('#qunit-fixture');
      QUnit.throws
      (
        function()
        {
          Glome.DOM.init();
        },
        'Glome has to be bound to an element before initializing'
      );
      QUnit.ok(Glome.DOM.bindTo(fx), 'Glome was bound to fixture');
      QUnit.ok(Glome.DOM.init(), 'Glome was initialized successfully');
      QUnit.equal(fx.find('#glome_window').size(), 1, 'Glome main window was inserted successfully');
      QUnit.equal(fx.find('#glome_ticker').size(), 1, 'Glome main window was inserted successfully');
      QUnit.start();
    },
    networkLatency
  )
});

/*
QUnit.asyncTest('Set ad as viewed', function()
{
  Glome.Ads.getit(Glome.ads[0].adid, function()
  {
    QUnit.start();
  });
});
*/
