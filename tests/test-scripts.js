// Network latency for asynchronous testing
var networkLatency = 500;
var previousId = null;

/* !Preliminary tests module */
QUnit.module('Preliminary checks');

/* !Browser support */
QUnit.test('Browser support', function()
{
  QUnit.ok(typeof window.localStorage != 'undefined', 'Support local storage');
  
  // Write something to local storage
  window.localStorage.setItem('foo', 'bar');
  QUnit.equal('bar', window.localStorage.getItem('foo'), 'Local storage returns the same string as its initial input');
});

/* !Version compare tests */
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

/* !Test methods*/
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
  
  // Tools exist
  QUnit.ok(Glome.Tools, 'Tools are available');
  QUnit.ok(Glome.Tools.escape, 'Regular expressions escaping is available');
  QUnit.equal('foo', Glome.Tools.escape('foo'), 'Plain string does not change');
  QUnit.equal('foo\/', Glome.Tools.escape('foo/'), 'Plain string does not change');
});

/* !Glome API basics */
QUnit.test('Glome API basics', function()
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
});

QUnit.asyncTest('Login', function()
{
  var id, callback;
  
  // Create an empty function
  callback = function()
  {
    
  }
  
  QUnit.ok(Glome.Api.login, 'Login method is available');
  QUnit.ok(Glome.Api.logout, 'Logout method is available');
  
  id = Glome.id();
  
  QUnit.throws
  (
    function()
    {
      Glome.glomeid = null;
      Glome.pref('glomeid', null);
      Glome.Api.login();
    },
    'There is no available Glome ID',
    'Login throws an error when there is no ID available'
  );
  
  // Return the ID
  Glome.pref('glomeid', id);
  Glome.glomeid = id;
  
  QUnit.throws
  (
    function()
    {
      Glome.Api.login(id, callback, 'foobar');
    },
    'Password has to be a string',
    'Password has to be a string'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Api.login(id, '', 'foobar');
    },
    'Callback has to be an array or a function',
    'Callback has to be an array or a function'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Api.login(id, '', callback, 'foo');
    },
    'Callback has to be an array or a function',
    'Callback has to be an array or a function'
  );
  
  Glome.API.login(id, '', function(data, status, jqXHR)
  {
    QUnit.start();
    QUnit.ok(Glome.sessionCookies, 'Glome session cookies are set');
    QUnit.equal(Glome.sessionCookies, jqXHR.getResponseHeader('Set-Cookie'), 'Glome session cookies are the same as the one of AJAX request');
  });
});

QUnit.asyncTest('Session ID is kept', function()
{
  Glome.API.login(Glome.id(), '', function(data, status, jqXHR)
  {
    QUnit.equal(Glome.sessionId, jqXHR, 'Session ID did not change after the previous request');
    QUnit.start();
  });
});

QUnit.asyncTest('Login failure', function()
{
  Glome.API.login(Glome.id(), 'foobar', null, function()
  {
    QUnit.equal(Glome.API.loginAttempts, 1, 'There should be exactly one failed login attempt due to wrong password');
    QUnit.start();
  });
});

QUnit.asyncTest('Get ads', function()
{
  var method, callback; 
  
  method = 'ads';
  
  callback = function(d)
  {
    window.glomeCallback = 'callback called successfully';
  };
  
  Glome.Api.get(method, callback);
  
  window.setTimeout
  (
    function()
    {
      QUnit.equal(window.glomeCallback, 'callback called successfully', 'Glome callback does what was expected');
      QUnit.start();
    },
    networkLatency
  );
});

/* !Creating a new Glome ID */
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

/* !Duplicate Glome ID */
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

/* !Test ad object */
QUnit.test('Glome.Ads.ad object', function()
{
  QUnit.equal(typeof Glome.Ads.ad, 'function', 'There is a method for creating a new ad prototype object');
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.ad('foo');
    },
    'Glome.Ads.ad requires an object or an integer (ad id) as a constructor',
    'Glome.Ads.ad constructor did not accept a string as constructor'
  );
  
  QUnit.equal
  (
    Glome.Ads.ad(1),
    null,
    'Glome.Ads.ad with ID 1 is not available (yet)'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.ad({foo: 'bar'});
    },
    'There has to be an ID present in the Glome.Ads.ad constructor object'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.ad({id: 'bar'});
    },
    'Property id of the constructor has to be an integer'
  );
  
  // Dummy ad content
  var ad =
  {
    id: 1,
    title: 'Test'
  }
  
  var gad = Glome.Ads.ad(ad);
  
  for (var i in ad)
  {
    QUnit.strictEqual(gad[i], ad[i], 'Property "' + i + '" was copied successfully');
  }
  
  QUnit.ok(Glome.Ads.stack[ad.id], 'Newly created ad added itself to ad stack');
  
  // Set the ad status to 2
  gad.setStatus(2);
  QUnit.equal(gad.status, 2, 'Ad status was set to 2');
  
  QUnit.equal(typeof gad.setStatus, 'function', 'setStatus method exists in ad object');
  QUnit.equal(typeof gad.update, 'function', 'update method exists in ad object');
  QUnit.equal(typeof gad.remove, 'function', 'remove method exists in ad object');
  
  // Remove newly created ad
  QUnit.ok(gad.remove(), 'Removing the ad was successful');
  
  QUnit.equal(Glome.Ads.ad(gad.id), null, 'Ad was removed successfully from the stack');
});

/* !Glome.Ads API */
QUnit.test('Glome.Ads API', function()
{
  QUnit.ok(Glome.Ads.onchange, 'There is an onchange method');
  QUnit.ok(Glome.Ads.addListener, 'There is an addListener method');
  QUnit.ok(Glome.Ads.removeListener, 'There is a removeListener method');
  QUnit.ok(Glome.Ads.count, 'There is a count method');
  
  Glome.Ads.stack = {};
  
  var categoryid = 1000000;
  
  var ad =
  {
    id: 1,
    title: 'Test',
    adcategories: [categoryid]
  }
  
  var id = ad.id;
  
  var filters =
  {
    category: categoryid
  }
  
  var gad = Glome.Ads.ad(ad);
  Glome.Ads.ad
  (
    {
      id: 2,
      title: 'Test 2',
      adcategories: []
    }
  );
  
  QUnit.equal(Glome.Ads.count(), Object.keys(Glome.Ads.stack).length, 'Glome.Ads.count gives the same as stack length');
  QUnit.equal(Glome.Ads.count(filters), Object.keys(Glome.Ads.listAds(filters)).length, 'Glome.Ads.count gives the same as stack length');
  
  QUnit.ok(Glome.Ads.removeAd(id), 'Removing an ad was successful');
  QUnit.equal(typeof Glome.Ads.stack[id], 'undefined', 'Ad was removed successfully from the stack');
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.addListener('foo');
    },
    'Glome.Ads.addListener requires a function as argument, when one is given'
  );
  
  var listener = function()
  {
    jQuery('#qunit-fixture').attr('data-listener', 'true');
  }
  
  Glome.Ads.addListener(listener);
  QUnit.equal(Glome.Ads.listeners.length, 1, 'Listener was successfully registered according to length');
  QUnit.strictEqual(Glome.Ads.listeners[0], listener, 'Listener was successfully registered to stored data');
  
  Glome.Ads.onchange();
  QUnit.equal(jQuery('#qunit-fixture').attr('data-listener'), 'true', 'Listener was successfully triggered');
  
  Glome.Ads.removeListener(listener);
  QUnit.equal(Glome.Ads.listeners.length, 0, 'Listener was successfully removed according to length');
});

/* !Ads list filters */
QUnit.test('Ads list filters', function()
{
  // Add an ad
  var ad =
  {
    id: 100,
    title: 'Test',
    adcategories: []
  }
  
  var id = ad.id;
  var categoryId = 2;
  var statusCode = 2;
  
  var gad = Glome.Ads.ad(ad);
  gad.adcategories.push(categoryId);
  gad.setStatus(statusCode);
  
  // List ads
  QUnit.ok(Glome.Ads.listAds, 'Ad listing method is available');
  QUnit.throws
  (
    function()
    {
      Glome.Ads.listAds([]);
    },
    'Optional filters parameter has to be an object',
    'Glome.Ads.listAds did not accept an array as a filter'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.listAds('foo');
    },
    'Optional filters parameter has to be an object',
    'Glome.Ads.listAds did not accept a string as a filter'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.listAds({category: 'foo'});
    },
    'Glome.Ads.listAds requires category filter to be a number or an array of numbers',
    'Glome.Ads.listAds throws an error on string category filter'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.listAds({category: {}});
    },
    'Glome.Ads.listAds requires category filter to be a number or an array of numbers',
    'Glome.Ads.listAds throws an error on an object category filter'
  );
  
  var ads = Glome.Ads.listAds({category: categoryId});
  QUnit.ok(ads[id], 'Freshly entered ad was found after filtering by category ' + categoryId);
  QUnit.equal(Object.keys(ads).length, 1, 'There should be exactly one match');
  
  var ads = Glome.Ads.listAds({status: statusCode});
  QUnit.ok(ads[id], 'Freshly entered ad was found after filtering by status code ' + statusCode);
  QUnit.equal(Object.keys(ads).length, 1, 'There should be exactly one match');
  
  // There should be no ads with a status code + 1
  var ads = Glome.Ads.listAds({status: (statusCode + 1)});
  QUnit.equal(typeof ads[id], 'undefined', 'Freshly entered ad was not found after filtering by status code ' + (statusCode + 1));
  QUnit.equal(Object.keys(ads).length, 0, 'No ads should be matched');
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.listAds({'undefined': 'foo'});
    },
    'Glome.Ads.listAds throws an error when trying to get with an undefined filter'
  );
});

/* !Fetch ads */
QUnit.asyncTest('Fetch ads', function()
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
    QUnit.notEqual(0, Object.keys(Glome.Ads.stack).length, 'Glome ads were loaded');
  });
  
  QUnit.throws
  (
    function()
    {
      Glome.Ads.load(null, []);
    },
    'Glome.Ads.load onerror has to be a function',
    'Glome.Ads.load throws an error on Array as onerror callback'
  );
});

/* !Glome user interface  */
QUnit.module('Glome user interface');

/* !Glome templates */
QUnit.asyncTest('Glome templates', function()
{
  QUnit.throws
  (
    function()
    {
      Glome.Templates.load('foo');
    },
    'Glome.Templates.load throws an error for string callback'
  );
  
  QUnit.throws
  (
    function()
    {
      Glome.Templates.load({});
    },
    'Glome.Templates.load throws an error for object callback'
  );
  
  Glome.Templates.load();
  
  window.setTimeout
  (
    function()
    {
      QUnit.start();
      QUnit.ok(Glome.Templates.get, 'Glome template is accessible');
      QUnit.throws
      (
        function()
        {
          Glome.Templates.get();
        },
        'Glome.template respects the argument count and throws an error on no arguments'
      );
      
      QUnit.throws
      (
        function()
        {
          Glome.Templates.get('foo', 'bar');
        },
        'Glome.template respects the argument count and throws an error on two arguments'
      );
      
      QUnit.throws
      (
        function()
        {
          Glome.Templates.get('undefined-template');
        },
        'Glome.template throws an error on undefined "undefined-template"'
      );
      
      // Load Glome templates
      QUnit.ok(Glome.Templates.get('widget'), 'Glome widget template was found');
      
      // Insert a Glome template
      var template = Glome.Templates.get('popup');
      QUnit.notEqual(template.attr('id'), 'glomeTemplates', 'ID of the element was removed to ');
      
      QUnit.equal(jQuery('head').find('link[rel="stylesheet"][href$="glome.css"][data-glome-include]').size(), 1, 'Glome CSS was appended');
    },
    networkLatency
  );
});

// These tests have to be asynchronous to ensure that template test
// has been run already
/* Glome UI */
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
      
      QUnit.strictEqual(false, Glome.DOM.bindTo('loremipsum'), 'Binding to an invented string returns false');
      QUnit.ok(Glome.DOM.bindTo(fx), 'Glome was bound to fixture (jQuery object)');
      
      // Try to bind the second time
      Glome.DOM.bindTo(fx)
      
      QUnit.ok(Glome.DOM.bindTo('#qunit-fixture'), 'Glome was bound to fixture (CSS selector)');
      QUnit.ok(Glome.DOM.bindTo(document.getElementById('qunit-fixture')));
      QUnit.ok(Glome.DOM.init(), 'Glome was initialized successfully');
      
      // Reinitializing does not insert second Glome window
      Glome.DOM.init();
      QUnit.equal(jQuery('#glomeWindow').size(), 1, 'Glome was initialized successfully and only once');
      
      QUnit.equal(fx.find('#glomeWindow').size(), 1, 'Glome main window was inserted successfully');
      QUnit.equal(fx.find('#glomeWidget').size(), 1, 'Glome widget can be found');
      
      QUnit.start();
    },
    networkLatency
  )
});

/* !Initialize with constructor */
// These tests have to be asynchronous to ensure that template test
// has been run already
QUnit.asyncTest('Initialize with constructor', function()
{
  var fx = jQuery('#qunit-fixture');
  var Glome = new jQuery.Glome(fx);
  
  window.setTimeout
  (
    function()
    {
      QUnit.equal(fx.find('#glomeWindow').size(), 1, 'Glome main window was inserted successfully and automatically with constructor');
      QUnit.ok(Glome.id(), 'There is a Glome ID');
      QUnit.equal(Number(fx.find('#glomeWidget').find('.glome-counter').attr('data-count')), Object.keys(Glome.Ads.stack).length, 'Ticker has the correct number of ads');
      
      var id = 123456789;
      
      Glome.Ads.ad
      (
        {
          id: id
        }
      );
      
      QUnit.equal(Number(fx.find('#glomeWidget').find('.glome-counter').attr('data-count')), Object.keys(Glome.Ads.stack).length, 'Ticker has the correct number of ads after a new ad was added');
      
      Glome.Ads.removeAd(id);
      QUnit.equal(Number(fx.find('#glomeWidget').find('.glome-counter').attr('data-count')), Object.keys(Glome.Ads.stack).length, 'Ticker has the correct number of ads after the temporary ad was removed');
      
      // Get the first ad
      var ids = Object.keys(Glome.Ads.stack);
      var id = ids[0];
      var ad = Glome.Ads.stack[id];
      
      // Verify that widget displays the first ad title
      QUnit.equal(fx.find('.glome-widget-title a').text(), ad.title, 'Ad title is displayed as it should be');
      QUnit.equal(fx.find('.glome-widget-title a').attr('data-glome-ad-id'), ad.id, 'Ad id was correctly set');
      QUnit.equal(fx.find('.glome-widget-subtext').text(), ad.bonus, 'Ad bonus is displayed as it should be');
      
      // Widget display toggling
      fx.find('.glome-icon').trigger('click');
      QUnit.equal(fx.find('#glomeWidget').hasClass('display'), true, 'Glome widget is displayed');
      QUnit.equal(Number(fx.find('#glomeWidget .glome-pager.glome-pager-max').text()), Object.keys(Glome.Ads.stack).length, 'Pager has the correct number of ads');
      
      fx.find('.glome-icon').trigger('click');
      QUnit.equal(fx.find('#glomeWidget').hasClass('display'), false, 'Glome widget is not displayed');
      
      fx.find('.glome-icon').trigger('click');
      fx.find('#glomeWidgetClose').trigger('click');
      QUnit.equal(fx.find('#glomeWidget').hasClass('display'), false, 'Glome widget is not displayed after clicking on close button');
      
      fx.find('.glome-icon').trigger('click');
      fx.find('#glomeWidget').find('.glome-widget-title a').trigger('click');
      QUnit.equal(fx.find('#glomeWidget').hasClass('display'), false, 'Glome widget is not displayed after clicking on an ad');
      
      // Remove all ads and verify that ticker displays zero
      Glome.Ads.stack = {};
      Glome.Ads.onchange();
      QUnit.equal(Number(fx.find('#glomeWidget').find('.glome-counter').attr('data-count')), 0, 'Ticker has the correct number of ads after all ads were removed');
      
      QUnit.start();
    },
    networkLatency * 3
  );
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
