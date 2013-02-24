// Network latency for asynchronous testing
var networkLatency = 500;
var previousId = null;

var testServer = '/';
var testGlomeId = null;
var testPassword = 'loremipsum';
var setPassword = '';

/* !Module: Preliminary tests module */
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
  QUnit.equal(typeof jQuery, 'function', 'jQuery is a function');
  QUnit.equal(1, versionCompare(jQuery.fn.jquery, '1.8.0'), 'jQuery is at least version 1.8.0 (v' + jQuery.fn.jquery + ')');

  QUnit.ok(jQuery.fn.oneTime, 'jQuery.oneTime available');
  QUnit.ok(jQuery.fn.everyTime, 'jQuery.everyTime available');
  QUnit.ok(jQuery.fn.stopTime, 'jQuery.stopTime available');

  QUnit.ok(jQuery.Glome, 'Glome jQuery extension class exists');
});


var Glome = new jQuery.Glome();

// Test on local server
Glome.API.server = testServer;

/* !Module: Glome generic method tests */
QUnit.module('Glome generic method tests');

/* !Test methods */
QUnit.test('Glome methods', function()
{
  QUnit.ok(Glome.Data, 'Data subclass is defined');
  QUnit.ok(Glome.Data.get, 'Local storage getter is defined');
  QUnit.ok(Glome.Data.set, 'Local storage setter is defined');

  // Test argument counts
  QUnit.throws
  (
    function()
    {
      Glome.Data.get();
    },
    'Glome.Data.get expects exactly one argument',
    'set method requires exact argument count of one'
  );

  // Test argument counts
  QUnit.throws
  (
    function()
    {
      Glome.Data.get('foo', 'bar');
    },
    'Glome.Data.get expects exactly one argument',
    'Get method requires exact argument count of one'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Data.set();
    },
    'Glome.Data.set expects exactly two argument',
    'set method requires exact argument count of two'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Data.set('foo');
    },
    'Glome.Data.set expects exactly two argument',
    'set method requires exact argument count of two'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Data.set('foo', 'bar', 'foobar');
    },
    'Glome.Data.set expects exactly two argument',
    'set method requires exact argument count of two'
  );

  var param = 'foobar';

  // Test that local storage returns null on undefined
  QUnit.deepEqual(Glome.Data.get('loremipsum'), null, 'Storage returns null for undefined key');

  // Test that local storage sets and gets correctly a string
  QUnit.ok(Glome.Data.set('foo', param), 'Storage setting is ok for type String');
  QUnit.deepEqual(Glome.Data.get('foo'), param, 'Storage returns what it was fed with (type: String)');

  // Test that local storage sets and gets correctly an integer
  var param = 1;
  QUnit.ok(Glome.Data.set('foo', param), 'Storage setting is ok for type Integer');
  QUnit.deepEqual(Glome.Data.get('foo'), param, 'Storage returns what it was fed with (type: Integer)');
  QUnit.notDeepEqual(Glome.Data.get('foo'), '1', 'Storage returns what it was fed with (type: integer is not a string)');
  QUnit.notDeepEqual(Glome.Data.get('foo'), true, 'Storage returns what it was fed with (type: integer is not a boolean)');

  // Test that local storage sets and gets correctly a float
  var param = 1.1;
  QUnit.ok(Glome.Data.set('foo', param), 'Storage setting is ok for type float');
  QUnit.deepEqual(Glome.Data.get('foo'), param, 'Storage returns what it was fed with (type: float)');

  // Test that local storage sets and gets correctly an array
  var param = ['foo', 'bar'];
  QUnit.ok(Glome.Data.set('foo', param), 'Storage setting is ok for type float');
  QUnit.deepEqual(Glome.Data.get('foo'), param, 'Storage returns what it was fed with (type: float)');

  // Test that local storage sets and gets correctly an object
  var param =
  {
    foo: 'bar',
    bar: 'foo'
  };

  QUnit.ok(Glome.Data.set('foo', param), 'Storage setting is ok for type object');
  QUnit.deepEqual(Glome.Data.get('foo'), param, 'Storage returns what it was fed with (type: object)');

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
  var param = testServer;
  QUnit.ok(Glome.pref('server', param), 'Storing a preference did not raise any errors');
  QUnit.deepEqual(Glome.pref('server'), param, 'Preference remained the same after getting it');

  // Tools exist
  QUnit.ok(Glome.Tools, 'Tools are available');
  QUnit.ok(Glome.Tools.escape, 'Regular expressions escaping is available');
  QUnit.equal('foo', Glome.Tools.escape('foo'), 'Plain string does not change');
  QUnit.equal('foo\/', Glome.Tools.escape('foo/'), 'Plain string does not change');

  // Add listener exists
  QUnit.ok(Glome.Tools.addListener, 'Tools.addListener method exists');
  QUnit.ok(Glome.Tools.addListener(function(){}, null, 'Ads'), 'Function listener was accepted');

  QUnit.throws
  (
    function()
    {
      Glome.Tools.addListener('foobar');
    },
    'Add listener requires a function, error successfully thrown on type "string"'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Tools.addListener([]);
    },
    'Add listener requires a function, error successfully thrown on type "string"'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Tools.addListener(function(){}, 'foobar', 'foobar');
    },
    'Undefined listener context error caught successfully'
  );

  var listener = function(){}
  var listenerId = 'foobar';

  QUnit.strictEqual(Glome.Tools.addListener(function(){}, listenerId, 'Ads'), listenerId, 'Listener returned the id it was given');
  QUnit.ok(Glome.Ads.listeners[listenerId], 'There is now a new listener with id "' + listenerId + '"');

  // Reset the listeners
  Glome.Ads.listeners = {};
});

QUnit.test('Escape ampersands', function()
{
  var dataset =
  {
    people: 'Arthur Dent & Ford Prefect',
    url: 'http://api.glome.me/?subject=HGGH&earth=Mostly%20harmless',
    chromeUrl: 'chrome://glome/content/browser.js?do=not&touch=me',
  }
  
  // Copy the dataset as a new child object
  var subset = {};
  for (i in dataset)
  {
    subset[i] = dataset[i];
  }
  dataset.sub = subset;
  
  // New array, copy the values as new array items
  dataset.subarray = [];
  for (var i in dataset)
  {
    // Prevent recursion
    if (i === 'subarray')
    {
      continue;
    }
    
    dataset.subarray.push(dataset[i]);
  }
  
  // New function
  dataset.subfunction = function()
  {
    var foo, bar;
    
    if (foo && bar)
    {
      return true;
    }
    
    return false;
  }
  
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.people), dataset.people.replace(/&/, '&amp;'), 'Ampersand was replaced');
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.url), dataset.url, 'URL was not escaped');
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.chromeUrl), dataset.chromeUrl, 'Chrome URL was not escaped');
  
  var escaped = Glome.Tools.escapeAmpersandsRecursive(dataset);
  
  QUnit.equal(escaped.people, Glome.Tools.escapeAmpersands(dataset.people), 'First level of the object was escaped');
  QUnit.equal(escaped.sub.people, Glome.Tools.escapeAmpersands(dataset.sub.people), 'Second level of the object was escaped');
  QUnit.equal(escaped.subarray[0], Glome.Tools.escapeAmpersands(dataset.subarray[0]), 'First array key was escaped');
  QUnit.equal(dataset.subfunction, escaped.subfunction, 'Function was not escaped');
});

/* !Browser rules */
QUnit.test('Browser rules', function()
{
  QUnit.ok(Glome.Browser, 'Browser rules container is set');
  QUnit.ok(Glome.Browser.openUrl, 'There is a rule on how a URL is opened');

  QUnit.ok(Glome.setDataBackend, 'There is a data backend method');

  QUnit.throws
  (
    function()
    {
      Glome.setDataBackend
      (
        {
          get: null,
          set: function() {}
        }
      );
    },
    'Data backend got rightfully upset when it did not get a "get" method'
  );

  QUnit.throws
  (
    function()
    {
      Glome.setDataBackend
      (
        {
          get: function() {}
        }
      );
    },
    'Data backend got rightfully upset when it did not get a "set" method'
  );
});

/* !Validate callbacks */
QUnit.test('Validate callbacks', function()
{
  QUnit.ok(Glome.Tools.validateCallback, 'Validate callback method is defined');

  // Check against plain object
  QUnit.throws
  (
    function()
    {
      Glome.Tools.validateCallback({});
    },
    'Caught successfully plain object callback',
    'Callback has to be a function or an array of functions'
  );

  // Check against a string
  QUnit.throws
  (
    function()
    {
      Glome.Tools.validateCallback('foobar');
    },
    'Caught successfully plain object callback',
    'Callback has to be a function or an array of functions'
  );

  var callback = function(){}

  QUnit.ok(Glome.Tools.validateCallback(null), 'Null is a valid callback');
  QUnit.ok(Glome.Tools.validateCallback(callback), 'Function is a valid callback');
  QUnit.ok(Glome.Tools.validateCallback([]), 'An empty array is a valid callback');
  QUnit.ok(Glome.Tools.validateCallback([callback]), 'An array with functions is a valid callback');

  QUnit.throws
  (
    function()
    {
      Glome.Tools.validateCallback([callback, 'loremipsum'])
    },
    'Caught successfully an attempt to use string in a callback array',
    'Callback has to be a function or an array of functions'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Tools.validateCallback([[callback], 'loremipsum'])
    },
    'Caught successfully an attempt to use an array in a callback array',
    'Callback has to be a function or an array of functions'
  );
});

/* !Merge callbacks */
QUnit.test('Merge callbacks', function()
{
  QUnit.ok(Glome.Tools.mergeCallbacks, 'Merge callbacks exists');

  var callback = function(){}

  QUnit.equal(Glome.Tools.mergeCallbacks(callback, callback).length, 2, 'All function callbacks were successfully merged');
  QUnit.equal(Glome.Tools.mergeCallbacks(callback, callback, null).length, 2, 'All function callbacks were successfully merged and null (or false) was skipped');
  QUnit.equal(Glome.Tools.mergeCallbacks([callback, callback], callback, null).length, 3, 'Mixed array and function callbacks were successfully merged and null (or false) was skipped');

  QUnit.throws
  (
    function()
    {
      Glome.Tools.mergeCallbacks(callback, 'foobar');
    },
    'Caught a string in a merge callbacks request',
    'Callback has to be a function or an array of functions'
  );
});

/* !Trigger callbacks */
QUnit.test('Trigger callbacks', function()
{
  QUnit.ok(Glome.Tools.triggerCallbacks, 'Trigger callbacks exists');

  var callback = function(c)
  {
    counter++;
  }

  var counter = 0;
  Glome.Tools.triggerCallbacks(callback, callback);

  QUnit.equal(counter, 2, 'All function callbacks were successfully triggerd');

  var counter = 0;
  Glome.Tools.triggerCallbacks(callback, callback, null);
  QUnit.equal(counter, 2, 'All function callbacks were successfully triggerd and null (or false) was skipped');

  var counter = 0;
  Glome.Tools.triggerCallbacks([callback, callback], callback, null)
  QUnit.equal(counter, 3, 'Mixed array and function callbacks were successfully triggerd and null (or false) was skipped');
});

/* !Module: Prototype object */
QUnit.module('Prototype object');

/* !Constructor */
QUnit.test('Constructor', function()
{
  QUnit.ok(Glome.Prototype, 'There is a data prototype object');
  var p = new Glome.Prototype();
  QUnit.ok(Glome.Prototype().__lookupGetter__('id'), 'There is a getter method for property "id"');
  QUnit.ok(Glome.Prototype().__lookupSetter__('id'), 'There is a setter method for property "id"');

  QUnit.throws
  (
    function()
    {
      new Glome.Prototype('foobar');
    },
    'Constructor never accepts a string, only integers and plain objects',
    'Non-object constructor has to be an integer'
  );

  QUnit.throws
  (
    function()
    {
      new Glome.Prototype(1);
    },
    'ID retrieval has to be added in the derived class',
    'Prototype class constructor cannot be directly initialized'
  );

  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox',
    planets: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptunus'],
    status:
    {
      Earth: 'Mostly harmless'
    },
    onerror: function(){}
  };

  var o = new Glome.Prototype(dataset);

  for (var i in dataset)
  {
    QUnit.deepEqual(o[i], dataset[i], 'Property ' + i + ' was copied successfully');
  }

  var container = o.container;
  QUnit.ok(Glome[container].stack, 'There is a Prototype stack');
  QUnit.deepEqual(Glome[container].stack[objectId], o, 'Object was added to stack');

  var newId = 2;
  o.id = newId;
  QUnit.deepEqual(Glome[container].stack[newId], o, 'Object ID changed the key in the object stack');
  QUnit.equal(typeof Glome[container].stack[objectId], 'undefined', 'Old object placeholder was removed');

  dataset.id = 'foobar';
  QUnit.throws
  (
    function()
    {
      new Glome.Prototype(dataset);
    },
    'ID has to be an integer'
  );

  // Ampersands are escaped on everything that doesn't resemble too much of a URL
  dataset.id = objectId + 1;
  dataset.people = 'Arthur Dent & Ford Prefect';
  dataset.url = 'http://api.glome.me/?subject=HGGH&earth=Mostly%20harmless';
  dataset.chromeUrl = 'chrome://glome/content/browser.js?do=not&touch=me';
  
  var o = new Glome.Prototype(dataset);
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.people), o.people, 'Ampersand was replaced');
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.url), o.url, 'URL was not escaped');
  QUnit.equal(Glome.Tools.escapeAmpersands(dataset.chromeUrl), o.chromeUrl, 'Chrome URL was not escaped');
});

/* !Extend */
QUnit.test('Extend', function()
{
  QUnit.ok(Glome.Prototype().Extends, 'There is a helper method for extending objects');

  // Create a new object with a method called newMethod
  var n = new function()
  {
    this.newMethod = function()
    {}
  }

  var k = new Glome.Prototype();
  k.Extends(n);
  QUnit.equal(typeof k.newMethod, 'function', 'New method was copied successfully');

  var Extender = function(data)
  {
    // Return an existing ad if it is in the stack, otherwise return null
    function Extender(data)
    {
      this.container = 'Extenders';
      this._constructor(data);
    }

    Extender.prototype = new Glome.Prototype();
    Extender.prototype.constructor = Extender;

    Extender.prototype.status = 0;
    Extender.prototype.adcategories = [];
    Extender.prototype.setStatus = function(statusCode)
    {
      this.status = statusCode;
      return true;
    }

    var extender = new Extender(data);

    return extender;
  }

  var e = new Extender();

  QUnit.ok(Glome.Extenders.stack, 'Constructor creates stack automatically if it was not available');
  QUnit.ok(Glome.Extenders.listeners, 'Constructor creates listeners container automatically if it was not available');
});

/* !Prototype methods */
QUnit.test('Methods', function()
{
  QUnit.throws
  (
    function()
    {
      var newObject = new Glome.Prototype();
      newObject.id = 'foobar';
    },
    'Caught string as ID error',
    'ID has to be an integer'
  );

  QUnit.throws
  (
    function()
    {
      var newObject = new Glome.Prototype();
      newObject.id = {};
    },
    'Caught object as ID error',
    'ID has to be an integer'
  );

  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox',
    planets: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptunus'],
    status:
    {
      Earth: 'Mostly harmless'
    },
    onerror: function(){}
  };

  var o = new Glome.Prototype(dataset);
  var container = o.container;

  QUnit.ok(o.delete, 'There is a delete method');
  QUnit.ok(o.delete(), 'Delete method returns ok on call');
  QUnit.equal(typeof Glome[container].stack[objectId], 'undefined', 'Object was successfully removed from the stack');
});

/* !Listeners */
QUnit.test('Listeners', function()
{
  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox'
  };

  var o = new Glome.Prototype(dataset);

  var container = o.container;
  QUnit.ok(Glome[container].listeners, 'There is a placeholder for Prototype listeners');
  QUnit.ok(o.onchange, 'There is an event trigger method for changes');

  QUnit.throws
  (
    function()
    {
      Glome.Ads.addListener('foo');
    },
    'Glome.Ads.addListener requires a function as argument, when one is given'
  );

  var listenerType = 'click';
  var listener = function(type)
  {
    jQuery('#qunit-fixture').attr('data-listener', 'true');
    QUnit.equal(type, listenerType, 'Listener type was passed on correctly');
  }

  var length = Object.keys(Glome.Ads.listeners).length;

  var listenerId = Glome.Ads.addListener(listener, 'listenerId');
  QUnit.strictEqual(listenerId, 'listenerId', 'Listener returned a listener ID and it was exactly what was given');
  QUnit.equal(Object.keys(Glome.Ads.listeners).length, length + 1, 'Listener was successfully registered according to length');
  QUnit.strictEqual(Glome.Ads.listeners[listenerId], listener, 'Listener was successfully registered to stored data');

  Glome.Ads.onchange(listenerType);
  QUnit.equal(jQuery('#qunit-fixture').attr('data-listener'), 'true', 'Listener was successfully triggered');

  Glome.Ads.removeListener(listener);
  QUnit.equal(Object.keys(Glome.Ads.listeners).length, length, 'Listener was successfully removed according to length');
});

/* !Listeners triggered on create */
QUnit.test('Listeners triggered on create', function()
{
  QUnit.stop();

  // Reset listeners
  Glome.Ads.listeners = {};
  Glome.Ads.listeners.testListener = function()
  {
    // Reset the array
    Glome.Ads.listeners = {};

    QUnit.start();
    QUnit.ok(typeof Glome.Ads.stack[objectId], 'Onchange event was successfully triggered after create');
    QUnit.expect(1);
  };

  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox'
  };

  var o = new Glome.Ads.Ad(dataset);
});

/* !Listeners triggered on update */
QUnit.test('Listeners triggered on update', function()
{
  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox'
  };

  var o = new Glome.Ads.Ad(dataset);

  QUnit.stop();

  // Reset the listeners object
  Glome.Ads.listeners = {};
  Glome.Ads.listeners.onUpdate = function()
  {
    // Reset the array
    Glome.Ads.listeners = {};

    QUnit.start();
    QUnit.equal(typeof Glome.Ads.stack[objectId], 'undefined', 'Onchange event was successfully triggered after ID change');
    QUnit.expect(1);
  }

  o.id = 2;
});

/* !Listeners triggered on delete */
QUnit.test('Listeners triggered on delete', function()
{
  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox'
  };

  var o = new Glome.Prototype(dataset);
  QUnit.stop();

  var container = o.container;
  Glome[container].listeners.onDelete = function()
  {
    // Reset the array
    Glome[container].listeners = {};

    QUnit.start();
    QUnit.equal(typeof Glome[container].stack[objectId], 'undefined', 'Onchange event was successfully triggered after delete');
    QUnit.expect(1);
  };

  o.delete();
});

/* !Change type is passed on correctly */
QUnit.test('Change type is passed on correctly', function()
{
  var objectId = 1;
  var dataset =
  {
    id: objectId,
    Zaphod: 'Beeblebrox'
  };

  var o = new Glome.Prototype(dataset);
  QUnit.stop();

  var container = o.container;
  Glome[container].listeners.typeChange = function(type, object)
  {
    // Reset the array
    Glome[container].listeners = {};

    QUnit.start();
    QUnit.equal(type, 'delete', 'Onchange event passes correctly the argument "type"');
    QUnit.equal(object.id, objectId, 'Onchange event passes correctly the argument "object"');
  }

  o.delete();
});

/* !Module: Glome API */
QUnit.module('Glome API');
/* !Glome API basics */
QUnit.test('Glome API basics', function()
{
  var method, callback;

  QUnit.ok(Glome.API, 'API is accessible in general');
  QUnit.equal(typeof Glome.API.request, 'function', 'API request is accessible');
  QUnit.equal(typeof Glome.API.get, 'function', 'API get is accessible');
  QUnit.equal(typeof Glome.API.create, 'function', 'API create is accessible');
  QUnit.equal(typeof Glome.API.read, 'function', 'API get is accessible');
  QUnit.equal(typeof Glome.API.update, 'function', 'API update is accessible');
  QUnit.equal(typeof Glome.API.delete, 'function', 'API delete is accessible');
  QUnit.equal(typeof Glome.API.parseURL, 'function', 'API parseURL is accessible');

  method = 'foobar';

  QUnit.throws
  (
    function()
    {
      Glome.API.get(method);
    },
    'Glome.API.get does not support request ' + method,
    'Glome.API.get should not support arbitrary request ' + method
  );

  // Use ads method
  method = 'login';

  QUnit.throws
  (
    function()
    {
      var data = {};
      var callback = 'foo';

      Glome.API.get(method, data, callback);
    },
    'String "foo" is not a function'
  );

  var callback = function(data, status, jqXHR)
  {
  };

  var callbacks = new Array();
  callbacks.push(callback);

  QUnit.ok(Glome.API.get(method, null, callback), 'Glome.API.get supports null as second argument, function as third');
  QUnit.ok(Glome.API.get(method, {}, callback), 'Glome.API.get supports an object as second argument, function as third');
  QUnit.ok(Glome.API.get(method, callback), 'Glome.API.get supports function as second argument');
  QUnit.ok(Glome.API.get(method, callbacks), 'Glome.API.get supports an array of callbacks');

  // Method where create is allowed
  method = 'user';

  QUnit.throws
  (
    function()
    {
      Glome.API.create(method, null, callback);
    },
    'Glome.API.create does not support null as second argument, function as third'
  );
  QUnit.ok(Glome.API.create(method, {}, callback), 'Glome.API.create supports an object as second argument, function as third');

  QUnit.throws
  (
    function()
    {
      Glome.API.create(method, callback);
    },
    'Glome.API.create does not allow function as second argument'
  );

  // Method where update is allowed
  method = 'me';

  QUnit.ok(Glome.API.update(method, null, callback), 'Glome.API.update supports null as second argument, function as third');
  QUnit.ok(Glome.API.update(method, {}, callback), 'Glome.API.update supports an object as second argument, function as third');

  QUnit.throws
  (
    function()
    {
      Glome.API.update(method, callback);
    },
    'Glome.API.update does not allow function as second argument'
  );

  QUnit.throws
  (
    function()
    {
      Glome.API.parseURL('{hubbabubba}');
    },
    'Undefined variable in URL caught',
    'Undefined variable "hubbabubba" in URL'
  );

  QUnit.ok(Glome.API.delete(method, callback), 'Glome.API.delete supports null as second argument, function as third');
  QUnit.ok(Glome.API.delete(method, {}, callback), 'Glome.API.delete supports an object as second argument, function as third');
  QUnit.ok(Glome.API.delete(method, {}, callback, callback), 'Glome.API.delete supports an object as second argument, function as third and fourth');

  // No internet connection throws an error
  Glome.online = false;
  QUnit.throws
  (
    function()
    {
      Glome.API.delete(method);
    },
    'Missing Internet connection caught when trying an API call',
    'No Internet connection'
  );
  Glome.online = true;

  QUnit.throws
  (
    function()
    {
      Glome.API.parseURL('{hubbabubba}');
    },
    'Undefined variable in URL caught',
    'Undefined variable "hubbabubba" in URL'
  );

  QUnit.equal(Glome.API.parseURL('{version}'), Glome.version, 'Variable name in URL was parsed correctly');

});

/* !Glome API requests */
QUnit.test('Glome API requests', function()
{
  QUnit.equal(Glome.userData, null, 'User data should be null before it has been loaded');
  var request = Glome.API.get('login', null);

  // Abort the mission immediately, these do not need to be fired
  request.abort();

  QUnit.ok(Glome.API.update('me'), 'I can read myself!');
  QUnit.equal(request.settings.type, 'GET', 'API get uses GET method as planned');

  request = Glome.API.update('me');
  request.abort();

  QUnit.equal(Glome.API.server + 'users/' + Glome.id() + '.json', request.settings.url, 'Variable name in URL was parsed correctly after passing it to API method');
  QUnit.equal(request.settings.type, 'PUT', 'Update uses PUT method');

  QUnit.throws
  (
    function()
    {
      Glome.API.request('me', null, null, null, 'loremipsum');
    },
    'Caught correctly an invalid method "loremipsum"',
    '"loremipsum" is not a valid method'
  );

  QUnit.throws
  (
    function()
    {
      Glome.API.update('ads', null);
    },
    'Require update method from the list of allowed throws correctly an error',
    'Setting this type "ads" is not allowed'
  );

  QUnit.ok(Glome.API.update('me'), 'I can update myself!');

  QUnit.throws
  (
    function()
    {
      Glome.API.delete('ads', null);
    },
    'Require delete method from the list of allowed throws correctly an error',
    'Setting this type "ads" is not allowed'
  );

  request = Glome.API.delete('me');
  request.abort();

  QUnit.equal(request.settings.type, 'DELETE', 'Delete uses DELETE method');
  QUnit.ok(request, 'I can delete myself!');
});

/* !Check that Glome API server change is registered */
QUnit.asyncTest('Glome API server change', function()
{
  Glome.API.get('login', function(data, status, jqXHR)
  {
    QUnit.equal(Glome.API.server.substr(0, testServer.length), testServer, 'Glome API server is changeable, successfully set to ' + testServer);
    QUnit.start();
  });
});

/* !Creating a new Glome ID */
QUnit.test('Creating a new Glome ID', function()
{
  // Set a test ID for the test runs
  var date = new Date();
  testGlomeId = 'test' + date.getTime();
  QUnit.ok(Glome.Auth, 'Auth class exists');
  QUnit.ok(Glome.Auth.createGlomeId, 'There is a method for creating a new Glome ID');

  // Erase any existing Glome ID
  Glome.glomeid = null;
  Glome.pref('glomeid', null);

  QUnit.throws
  (
    function()
    {
      Glome.Auth.createGlomeId();
    },
    'Glome ID creation requires a parameter',
    'Glome ID creation requires a parameter'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.createGlomeId({});
    },
    'Glome ID has to be alphanumeric',
    'Glome ID has to be alphanumeric'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.createGlomeId(testGlomeId, 'foobar');
    },
    'Callback has to be a function',
    'Caught sucessfully string callback'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.createGlomeId(testGlomeId, null, 'foobar');
    },
    'Onerror has to be a function',
    'Caught sucessfully string onerror'
  );

  QUnit.equal(null, Glome.id(), 'Glome ID is null');

  // Calling createGlomeId over 10 times should fail
  QUnit.throws
  (
    function()
    {

      Glome.Auth.createGlomeId(testGlomeId, 10);
    },
    'Exceeded maximum number of times to create a Glome ID',
    'Exceeded maximum number of times to create a Glome ID'
  );

  QUnit.stop();

  Glome.Auth.createGlomeId
  (
    testGlomeId,
    function()
    {
      QUnit.start();
      QUnit.ok(Glome.id(), 'Glome ID is initialized');
      QUnit.equal(Glome.id(), Glome.pref('glomeid'), 'Initialized and stored Glome ID is the same');
    },
    function()
    {
      QUnit.start();
      QUnit.ok(false, 'Create a new Glome ID');
    }
  );
});

/* Set password */
QUnit.test('Set password', function()
{
  var callback = function(){}

  QUnit.ok(Glome.Auth.setPassword, 'There is a Auth.setPassword method');
  QUnit.throws
  (
    function()
    {
      Glome.Auth.setPassword(callback);
    },
    'Try a function as the first argument',
    'Passwords have to be strings'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.setPassword('', callback);
    },
    'Try a function as the second argument',
    'Passwords have to be strings'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.setPassword('foo', 'bar');
    },
    'Password mismatch error caught and no onerror was defined',
    'Password mismatch error'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.setPassword(null, null, callback);
    },
    'Try a function as the third argument',
    'Passwords have to be strings'
  );

  Glome.Auth.setPassword('foo', 'bar', null, null, function()
  {
    QUnit.ok(true, 'Set password onerror was called successfully with passwords mismatch error');
  });
});

/*
QUnit.test('Set empty password', function()
{
  QUnit.stop();
  Glome.Auth.setPassword('', '', '', function()
  {
    QUnit.start();
    QUnit.ok(true, 'Auth.setPassword callback was triggered successfully');
  });
});
*/

/* !Duplicate Glome ID */
QUnit.test('Duplicate Glome ID', function()
{
  // Try to recreate exactly same Glome ID
  previousId = Glome.id();
  Glome.glomeid = null;

  QUnit.stop();

  Glome.Auth.createGlomeId(previousId, function()
  {
    QUnit.notEqual(null, Glome.id(), 'Created successfully asynchronously a Glome ID after trying to create a reserved ID, part 1');
    QUnit.notEqual(previousId, Glome.id(), 'Created successfully asynchronously a Glome ID after trying to create a reserved ID, part 2');

    QUnit.strictEqual(Glome.id(), Glome.pref('glomeid'), 'Ensured that locally stored Glome ID is the newly created ID');

    var tmp = Glome.id();

    // Reset the current Glome ID so that it is fetched from the storage
    Glome.glomeid = null;

    QUnit.strictEqual(Glome.id(), tmp, 'Id is successfully received from the storage');
  });
});

/* !Login */
QUnit.test('Login', function()
{
  var id, callback;

  // Create an empty function
  callback = function()
  {

  }

  QUnit.ok(Glome.Auth.login, 'Login method is available');
  QUnit.ok(Glome.Auth.logout, 'Logout method is available');

  QUnit.throws
  (
    function()
    {
      Glome.glomeid = null;
      Glome.pref('glomeid', null);
      Glome.Auth.login();
    },
    'There is no available Glome ID',
    'Login throws an error when there is no ID available'
  );

  // Return the ID
  Glome.pref('glomeid', testGlomeId);
  Glome.glomeid = testGlomeId;

  QUnit.throws
  (
    function()
    {
      Glome.Auth.login(id, callback, 'foobar');
    },
    'Password has to be a string',
    'Caught password as a function exception'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.login(testGlomeId, '', 'foobar');
    },
    'Caught callback as a string exception',
    'Callback has to be an array or a function'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Auth.login(testGlomeId, '', null, 'foo');
    },
    'Caught string onerror exception',
    'Callback has to be an array or a function'
  );

  QUnit.stop();

  Glome.Auth.login
  (
    testGlomeId,
    '',
    function(data, status, jqXHR)
    {
      QUnit.ok(Glome.sessionToken, 'CSRF token is set');
      QUnit.equal(Glome.sessionToken, jqXHR.getResponseHeader('X-CSRF-Token'), 'CSRF token is the same as the one of AJAX request');
      QUnit.start();
    },
    function(jqXHR)
    {
      QUnit.start();
      QUnit.expect(8);
    }
  );
});

/* !Set password fails */
QUnit.test('Set password fails', function()
{
  var currentId = Glome.id();
  Glome.glomeid = null;
  Glome.pref('glomeid', '');

  QUnit.throws
  (
    function()
    {
      Glome.Auth.setPassword('', '');
    },
    'No Glome ID, no setting password',
    'Glome ID is not available'
  );

  Glome.pref('glomeid', currentId);
  Glome.glomeid = currentId;
});

/* !CSRF token is kept */
QUnit.asyncTest('CSRF token is kept', function()
{
  Glome.Auth.login(Glome.id(), '', function(data, status, jqXHR)
  {
    QUnit.equal(Glome.sessionToken, jqXHR.getResponseHeader('X-CSRF-Token'), 'CSRF token did not change after the previous request');
    QUnit.start();
  });
});

/* !Login failure */
QUnit.asyncTest('Login failure', function()
{
  Glome.Auth.login(Glome.id(), 'foobar', null, function()
  {
    QUnit.equal(Glome.Auth.loginAttempts, 1, 'There should be exactly one failed login attempt due to wrong password');

    Glome.Auth.login(Glome.id(), '', function()
    {
      QUnit.ok(Glome.userData, 'User data was populated');
      QUnit.start();
    });
  });
});

/* !Get ads */
QUnit.asyncTest('Get ads', function()
{
  var method = 'ads';
  var request = Glome.API.get
  (
    method,
    function()
    {
      QUnit.ok(true, 'Callback run after successful get');
      QUnit.start();
    },
    function(jqXHR, status, errorThrown)
    {
      console.warn('URL', this.url)
      QUnit.expect(1);
    }
  );
});

/* !Login with password */
QUnit.test('Login with password', function()
{
  QUnit.expect(1);
  QUnit.stop();

  Glome.Auth.login
  (
    testGlomeId,
    '',
    function()
    {
      Glome.Auth.setPassword
      (
        testPassword,
        testPassword,
        null,
        function()
        {
          Glome.Auth.login
          (
            testGlomeId,
            testPassword,
            function()
            {
              setPassword = testPassword;
              QUnit.start();
              QUnit.equal(testGlomeId, Glome.id(), 'Logging with a password was successful');
            },
            function()
            {
              QUnit.start();
            }
          );
        },
        function()
        {
          QUnit.start();
        }
      );
    }
  );
});

/* !Module: Glome Ads class */
QUnit.module('Glome Ads class');

/* !Glome.Ads.Ad object */
QUnit.test('Glome.Ads.Ad object', function()
{
  Glome.Ads.stack = {};

  QUnit.equal(typeof Glome.Ads.Ad, 'function', 'There is a method for creating a new Ad prototype object');

  QUnit.throws
  (
    function()
    {
      var ad = new Glome.Ads.Ad('foo');
    },
    'Glome.Ads.Ad requires an object or an integer (ad id) as a constructor',
    'Glome.Ads.Ad constructor did not accept a string as constructor'
  );

  QUnit.throws
  (
    function()
    {
      new Glome.Ads.Ad(1);
    },
    'Glome.Ads.Ad with ID 1 is not available (yet)'
  );

  QUnit.throws
  (
    function()
    {
      new Glome.Ads.Ad({id: 'bar'});
    },
    'Property id of the constructor has to be an integer'
  );

  // Dummy ad content
  var ad =
  {
    id: 1,
    title: 'Test',
    bonus_percent: 22.00,
    bonus_money: 11.00
  };

  var gad = new Glome.Ads.Ad(ad);

  QUnit.equal(gad.constructor.name, 'Ad', 'Constructor name was changed');
  QUnit.ok(gad.bonusText.match(/11/), 'Bonus percent was included in the bonus text');
  QUnit.ok(gad.bonusText.match(/22/), 'Bonus money was included in the bonus text');
  QUnit.ok(gad.bonusText.match(/cashback/), 'Bonus text included the work cashback');
  QUnit.ok(gad.bonusTextShort.match(/11/), 'Bonus percent was included in the bonus text');
  QUnit.ok(gad.bonusTextShort.match(/22/), 'Bonus money was included in the bonus text');
  QUnit.ok(!gad.bonusTextShort.match(/cashback/), 'Short bonus text did not include the work cashback');

  for (var i in ad)
  {
    QUnit.strictEqual(gad[i], ad[i], 'Property "' + i + '" was copied successfully');
  }

  QUnit.ok(Glome.Ads.stack[(gad.id)], 'Newly created ad added itself to ad stack');

  // Set the ad status to 2
  gad.setStatus(2);
  QUnit.equal(gad.status, 2, 'Ad status was set to 2');

  QUnit.equal(typeof gad.setStatus, 'function', 'setStatus method exists in ad object');
  QUnit.equal(typeof gad.onchange, 'function', 'onchange method exists in ad object');
  QUnit.equal(typeof gad.delete, 'function', 'Delete method exists in ad object');
  QUnit.ok(Glome.Ads.stack[1], 'Ad was added to stack');

  // Get the newly created ad with constructor
  var id = gad.id;
  
  try
  {
    var ad = new Glome.Ads.Ad(id);
    QUnit.ok(ad.id, 'Constructor returned successfully the newly created ad');
  }
  catch (e)
  {
    QUnit.ok(false, 'Constructor returned successfully the newly created ad');
  }
  return;

  // Remove newly created ad
  QUnit.ok(gad.delete(), 'Removing the ad was successful');
  QUnit.throws
  (
    function()
    {
      Glome.Ads.Ad(gad.id);
    },
    'Ad was removed successfully from the stack'
  );

  QUnit.ok(Glome.Ads.removeAd(id), 'Removing an ad was successful');
  QUnit.equal(typeof Glome.Ads.stack[id], 'undefined', 'Ad was removed successfully from the stack');

});

/* !Glome.Ads API */
QUnit.test('Glome.Ads API', function()
{
  QUnit.ok(Glome.Ads.onchange, 'There is an onchange method');
  QUnit.ok(Glome.Ads.addListener, 'There is an addListener method');
  QUnit.ok(Glome.Ads.removeListener, 'There is a removeListener method');
  QUnit.ok(Glome.Ads.count, 'There is a count method');

  Glome.Ads.stack = {};

  var categoryId = 1000000;

  var ad =
  {
    id: 1,
    title: 'Test',
    adcategories:
    [
      {
        id: categoryId
      }
    ]
  }

  var id = ad.id;

  var filters =
  {
    category: categoryId
  }

  var gad = Glome.Ads.Ad(ad);
  Glome.Ads.Ad
  (
    {
      id: 2,
      title: 'Test 2',
      adcategories: []
    }
  );

  QUnit.equal(Glome.Ads.count(), Object.keys(Glome.Ads.stack).length, 'Glome.Ads.count gives the same as stack length');
  QUnit.equal(Glome.Ads.count(filters), Object.keys(Glome.Ads.listAds(filters)).length, 'Glome.Ads.count gives the same as stack length');
});

/* !Ads list filters */
QUnit.test('Ads list filters', function()
{
  // Add an ad
  var ad =
  {
    id: 100,
    title: 'Test',
    adcategories: [],
    view_state: Glome.Ads.states.ignore
  }

  var id = ad.id;
  var categoryId = 2;
  var statusCode = 2;

  var gad = Glome.Ads.Ad(ad);
  gad.adcategories.push({id: categoryId, subscribed: 1});
  gad.setStatus(statusCode);

  var gcategory = new Glome.Categories.Category
  (
    {
      id: categoryId,
      name: 'foobar',
      subscribed: 1
    }
  );

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

  var ads = Glome.Ads.listAds({subscribed: 1});
  QUnit.ok(ads[id], 'Freshly entered ad was found after filtering by subscriptions');
  QUnit.equal(Object.keys(ads).length, 1, 'There should be exactly one match');

  var ads = Glome.Ads.listAds({subscribed: 0});
  QUnit.equal(Object.keys(ads).length, 0, 'There should be no matches for subscribed: 0');

  var ads = Glome.Ads.listAds({subscribed: 0, category: categoryId});
  QUnit.equal(Object.keys(ads).length, 0, 'There should be no matches for intersection of subscribed: 0 and category ID ' + categoryId);

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
  
  var ads = Glome.Ads.listAds({view_state: Glome.Ads.states.ignore});
  QUnit.equal(Object.keys(ads).length, 1, 'There should be one match for ignored items');
});

/* !Fetch ads */
QUnit.test('Fetch ads', function()
{
  QUnit.stop();

  // List ads for this Glome user
  Glome.Ads.load
  (
    function()
    {
      QUnit.notEqual(0, Object.keys(Glome.Ads.stack).length, 'Glome ads were loaded');
      QUnit.start();

      for (i in Glome.Ads.stack)
      {
        var ad = new Glome.Ads.Ad(Glome.Ads.stack[i].id);
        QUnit.deepEqual(ad, Glome.Ads.stack[i], 'Constructor gives the same object as was stored to stack')
        break;
      }
    },
    function()
    {
      QUnit.start();
      QUnit.ok(false, 'Glome ads were loaded (caught on error)');
    }
  );
});

/* !Click getit an ad */
QUnit.test('Click getit on an ad', function()
{
  QUnit.stop();
  Glome.Ads.load
  (
    function()
    {
      QUnit.start();

      QUnit.notEqual(0, Object.keys(Glome.Ads.stack).length, 'Glome ads were loaded');

      var adId = null;
      for (var [key, value] in Iterator(Glome.Ads.stack))
      {
        adId = key;
        break;
      }

      QUnit.ok(adId, 'Ads in ad stack should have valid IDs. ' + adId + ' is valid.');

      var request = Glome.Ads.click(adId);
      QUnit.equal(typeof request, 'object', 'Function exists and it returns an object');

      QUnit.throws
      (
        function()
        {
          Glome.Ads.click()
        },
        'Ad id must be a valid integer'
      );
      QUnit.throws
      (
        function()
        {
          Glome.Ads.click('foo')
        },
        'Ad id must be a valid integer'
      );
      QUnit.throws
      (
        function()
        {
          Glome.Ads.click(false)
        },
        'Ad id must be a valid integer'
      );
    },
    function()
    {
      QUnit.start();
      QUnit.ok(false, 'Glome ads were loaded (caught on error)');
    }
  );
});

/* !Click getit an ad */
QUnit.test('Click notnow on an ad', function()
{
  QUnit.stop();
  Glome.Ads.load
  (
    function()
    {
      QUnit.start();

      QUnit.notEqual(0, Object.keys(Glome.Ads.stack).length, 'Glome ads were loaded');

      var adId = null;
      for (var [key, value] in Iterator(Glome.Ads.stack))
      {
        adId = key;
        break;
      }

      QUnit.ok(adId, 'Ads in ad stack should have valid IDs. ' + adId + ' is valid.');

      var request = Glome.Ads.notnow(adId);
      QUnit.equal(typeof request, 'object', 'Function exists and it returns an object');

      QUnit.throws
      (
        function()
        {
          Glome.Ads.notnow()
        },
        'Ad id must be a valid integer'
      );
      QUnit.throws
      (
        function()
        {
          Glome.Ads.notnow('foo')
        },
        'Ad id must be a valid integer'
      );
      QUnit.throws
      (
        function()
        {
          Glome.Ads.notnow(false)
        },
        'Ad id must be a valid integer'
      );
    },
    function()
    {
      QUnit.start();
      QUnit.ok(false, 'Glome ads were loaded (caught on error)');
    }
  );
});

/* !Module: Glome Categories class */
QUnit.module('Glome Categories class');

/* ! Set subscription status */
QUnit.asyncTest('Set subscription status', function()
{
  QUnit.ok(Glome.Categories.setSubscriptionStatus, 'Categories.setSubscriptionStatus exists');
  QUnit.throws
  (
    function()
    {
      Glome.Categories.setSubscriptionStatus('foo', 'bar');
    },
    'Allow only integer as ID'
  );

  QUnit.throws
  (
    function()
    {
      Glome.Categories.setSubscriptionStatus(1, 'bar');
    },
    'Allow only on and off'
  );

  QUnit.ok(Glome.Categories.setSubscriptionStatus(1, 0), 'Zero is accepted as a status');
  QUnit.ok(Glome.Categories.setSubscriptionStatus(1, 1), 'One is accepted as a status');
  QUnit.ok(Glome.Categories.setSubscriptionStatus(1, 'on'), '"on" is accepted as a status');
  QUnit.ok(Glome.Categories.setSubscriptionStatus(1, 'off'), '"off" is accepted as a status');

  var callback = function()
  {
    QUnit.start();
  }

  Glome.Categories.setSubscriptionStatus(1, 'on', callback, callback);
});

/* !Glome.Categories.Category object */
QUnit.test('Glome.Categories.Category object', function()
{
  QUnit.equal(typeof Glome.Categories.Category, 'function', 'There is a method for creating a new Category prototype object');

  QUnit.throws
  (
    function()
    {
      var category = new Glome.Categories.Category('foo');
    },
    'Glome.Categories.Category requires an object or an integer (category id) as a constructor',
    'Glome.Categories.Category constructor did not accept a string as constructor'
  );

  QUnit.throws
  (
    function()
    {
      new Glome.Categories.Category(1323);
    },
    'Glome.Categories.Category with ID 1323 is not available (yet)'
  );

  QUnit.throws
  (
    function()
    {
      new Glome.Categories.Category({id: 'bar'});
    },
    'Property id of the constructor has to be an integer'
  );

  // Dummy category content
  var category =
  {
    id: 1,
    title: 'Test'
  };

  var gcategory = new Glome.Categories.Category(category);

  QUnit.equal(gcategory.constructor.name, 'Category', 'Constructor name was changed');

  for (var i in category)
  {
    QUnit.strictEqual(gcategory[i], category[i], 'Property "' + i + '" was copied successfully');
  }

  QUnit.ok(Glome.Categories.stack[(gcategory.id)], 'Newly created category added itself to category stack');

  // Set the category status to 2
  gcategory.setStatus(2);
  QUnit.equal(gcategory.status, 2, 'Category status was set to 2');

  QUnit.equal(typeof gcategory.setStatus, 'function', 'setStatus method exists in category object');
  QUnit.equal(typeof gcategory.onchange, 'function', 'onchange method exists in category object');
  QUnit.equal(typeof gcategory.delete, 'function', 'Delete method exists in category object');

  // Get the newly created category with constructor
  var category = new Glome.Categories.Category(gcategory.id);

  // Remove newly created category
  QUnit.ok(gcategory.delete(), 'Removing the category was successful');
  QUnit.throws
  (
    function()
    {
      Glome.Categories.Category(gcategory.id);
    },
    'Category was removed successfully from the stack'
  );

  QUnit.ok(category.subscribe, 'Category subscribe method exists');
  QUnit.ok(category.unsubscribe, 'Category unsubscribe method exists');
});

/* !Glome.Categories API */
QUnit.test('Glome.Categories API', function()
{
  QUnit.ok(Glome.Categories.onchange, 'There is an onchange method');
  QUnit.ok(Glome.Categories.addListener, 'There is an addListener method');
  QUnit.ok(Glome.Categories.removeListener, 'There is a removeListener method');
  QUnit.ok(Glome.Categories.count, 'There is a count method');

  Glome.Categories.stack = {};
  Glome.Categories.listeners = {};

  var categoryid = 1000000;

  var category =
  {
    id: 1,
    title: 'Test'
  }

  var id = category.id;

  var filters =
  {
    subscribed: 1
  }

  var gcategory = Glome.Categories.Category(category);
  Glome.Categories.Category
  (
    {
      id: 2,
      title: 'Test 2'
    }
  );

  QUnit.equal(Glome.Categories.count(), Object.keys(Glome.Categories.stack).length, 'Glome.Categories.count gives the same as stack length');
  QUnit.equal(Glome.Categories.count(filters), Object.keys(Glome.Categories.listCategories(filters)).length, 'Glome.Categories.count gives the same as stack length');

  QUnit.ok(Glome.Categories.removeCategory(id), 'Removing a category was successful');
  QUnit.equal(typeof Glome.Categories.stack[id], 'undefined', 'Category was removed successfully from the stack');

  QUnit.throws
  (
    function()
    {
      Glome.Categories.addListener('foo');
    },
    'Glome.Categories.addListener requires a function as argument, when one is given'
  );

  var listener = function()
  {
    jQuery('#qunit-fixture').attr('data-listener', 'true');
  }

  var length = Object.keys(Glome.Categories.listeners).length;

  var listenerId = Glome.Categories.addListener(listener);
  QUnit.equal(Object.keys(Glome.Categories.listeners).length, length + 1, 'Listener was successfully registered according to length');
  QUnit.strictEqual(Glome.Categories.listeners[listenerId], listener, 'Listener was successfully registered to stored data');

  Glome.Categories.onchange();
  QUnit.equal(jQuery('#qunit-fixture').attr('data-listener'), 'true', 'Listener was successfully triggered');

  Glome.Categories.removeListener(listener);
  QUnit.equal(Object.keys(Glome.Categories.listeners).length, length, 'Listener was successfully removed according to length');
});

var preloadedCategories = null;

/* !Fetch categories */
QUnit.test('Fetch categories', function()
{
  QUnit.stop();

  // List categories for this Glome user
  // Get Categories
  Glome.Auth.login
  (
    Glome.id(),
    setPassword,
    function()
    {
      Glome.Api.get
      (
        'categories',
        null,
        function(data)
        {
          // Set the first category as unsubscribed
          var categoryId = data[0].id;
          Glome.userData.disabled_adcategories.push(categoryId);

          Glome.Categories.load
          (
            function()
            {
              QUnit.equal(Glome.Categories.stack[categoryId].subscribed, 0, 'First loaded category has status "unsubscribed"');

              QUnit.notEqual(0, Object.keys(Glome.Categories.stack).length, 'Glome categories were loaded');

              for (i in Glome.Categories.stack)
              {
                var category = new Glome.Categories.Category(Glome.Categories.stack[i].id);
                QUnit.deepEqual(category, Glome.Categories.stack[i], 'Constructor gives the same object as was stored to stack')
                break;
              }

              var l = Object.keys(Glome.Categories.stack).length;
              QUnit.equal(l, Glome.Categories.count(), 'Category count returned the stack length: ' + l);

              QUnit.start();
            },
            function()
            {
              QUnit.start();
              QUnit.ok(false, 'Glome categories were loaded (caught on error)');
            }
          );
        }
      );
    }
  );
});

/* !Subscription shorthands */
QUnit.asyncTest('Subscription shorthands', function()
{
  Glome.Auth.login
  (
    Glome.id(),
    setPassword,
    function()
    {
      var id = Object.keys(Glome.Categories.stack)[0];
      var category = new Glome.Categories.Category(id);

      QUnit.ok(category.subscribe, 'Category subscribe method exists');
      QUnit.ok(category.unsubscribe, 'Category unsubscribe method exists');

      category.subscribe
      (
        function()
        {
          QUnit.equal(category.subscribed, 1, 'Category subscription status was changed to 1 after subscribe');
          category.unsubscribe
          (
            function()
            {
              QUnit.equal(category.subscribed, 0, 'Category subscription status was changed to 0 after unsubscribe');
              QUnit.start();
            },
            function()
            {
              QUnit.equal(true, false, 'Subscribe request returned an error');
              QUnit.start();
            }
          );
        },
        function()
        {
          QUnit.equal(true, false, 'Subscribe request returned an error');
          QUnit.start();
        }
      );
    },
    function()
    {
      QUnit.equal(true, false, 'Subscribe request returned an error');
      QUnit.start();
    }
  );
});

/* !Module: Glome user interface  */
QUnit.module('Glome user interface');

/* !Glome templates */
QUnit.test('Glome templates', function()
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

  QUnit.stop();

  Glome.Templates.load(function()
  {
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
    var template = Glome.Templates.get('public-wrapper');
    QUnit.notEqual(template.attr('id'), 'glomeTemplates', 'ID of the element was removed to ');

    QUnit.equal(jQuery('head').find('link[rel="stylesheet"][href$="glome.css"][data-glome-include]').size(), 1, 'Glome CSS was appended');
    QUnit.start();
  });
});

/* !Populate template */
QUnit.asyncTest('Populate template', function()
{
  Glome.Templates.load(function()
  {
    QUnit.ok(Glome.Templates.parse, 'There is a method for parsing a template');
    QUnit.ok(Glome.Templates.populate, 'There is a shorthand method for parsing a Glome template');

    QUnit.equal('admin-wrapper', Glome.Templates.populate('admin-wrapper', {}).attr('data-glome-template'), 'Populate returned correct template');

    var template = jQuery('<div />')
      .text('Hello {world}!');

    QUnit.equal(Glome.Templates.parse(template, {}).html(), 'Hello {world}!', 'No attributes were given, bracket contents should remain');
    QUnit.equal(Glome.Templates.parse(template, {world: ''}).html(), 'Hello !', 'An empty attribute was given, bracket contents should be removed');

    var template = jQuery('<div />')
      .text('Hello {world}!');
      
    QUnit.equal(Glome.Templates.parse(template, {world: 'Earth'}).get(0).outerHTML, '<div>Hello Earth!</div>', 'Attribute was parsed correctly');
    
    var html = Glome.Templates.parse(template, {world: 'Earth & Mars'}).get(0).outerHTML;
    QUnit.ok(html.match(/\u0026/), 'Ampersand was parsed correctly as XML');
    
    var template = jQuery('<div />')
      .text('Hello {{world}}!');
    
    QUnit.equal('Hello {{world}}!', Glome.Templates.parse(template, {world: ''}).html(), 'Double brackets are reserved for other use and they were left alone');
      
    QUnit.start();
  });
});

/* !Module: Glome Categories class */
QUnit.module('Glome Categories class');
QUnit.test('Glome.Categories.Category object', function()
{
  QUnit.ok(Glome.Categories, 'There is a categories subclass');
  QUnit.ok(Glome.Categories.Category, 'There is a category object');

  var category = new Glome.Categories.Category();
  QUnit.equal(category.constructor.name, 'Category', 'Constructor name was changed');

  QUnit.throws
  (
    function()
    {
      new Glome.Categories.Category('foobar');
    },
    'Category with invented id is not accessible'
  );
});

/* !Module: MVC */
QUnit.module('MVC');
QUnit.test('MVC Prototype', function()
{
  QUnit.ok(Glome.MVC, 'There is a MVC object');
  QUnit.ok(Glome.MVC.Prototype, 'There is a prototype for MVC objects');

  var mvc = new Glome.MVC.Prototype();
  QUnit.ok(mvc, 'MVC Prototype is callable');
  QUnit.ok(mvc.run, 'Method "run" exists');
  QUnit.ok(mvc.model, 'Method "model" exists');
  QUnit.ok(mvc.view, 'Method "view" exists');
  QUnit.ok(mvc.controller, 'Method "controller" exists');

  // Set the model argument from args
  mvc.model = function(args)
  {
    this._model = args.model;
  }

  // Set the view argument from args
  mvc.view = function(args)
  {
    this._view = args.view;
  }

  // Set the controller argument from args
  mvc.controller = function(args)
  {
    this._controller = args.controller;
  }

  // Define args for controller
  var args =
  {
    model: 'foo',
    view: 'bar',
    controller: 'lorem'
  }

  QUnit.ok(mvc.run(args), 'MVC run was executed successfully');;
  QUnit.equal(args.model, mvc._model, 'Arguments of "run" were passed successfully to "model"');
  QUnit.equal(args.view, mvc._view, 'Arguments of "run" were passed successfully to "view"');
  QUnit.equal(args.controller, mvc._controller, 'Arguments of "run" were passed successfully to "controller"');
});

/* !Public */
QUnit.asyncTest('Public', function()
{
  Glome.Templates.load(function()
  {
    QUnit.start();

    // Bind Glome to QUnit fixture
    Glome.options.container = jQuery('#qunit-fixture');

    // Check that there is a wrapper for MVC for the public context
    QUnit.ok(Glome.MVC.Public, 'Public wrapper exists');

    var mvc = new Glome.MVC.Public();
    mvc.viewInit();

    QUnit.ok(Glome.options.container.find('[data-glome-template="public-header"]').size(), 'Headers were found from the fixture');
    QUnit.ok(Glome.options.container.find('[data-glome-template="public-content"]').size(), 'Content area was found from the fixture');
    QUnit.ok(Glome.options.container.find('[data-glome-template="public-footer"]').size(), 'Footers were found from the fixture');
    QUnit.equal(0, Glome.options.container.find('[data-context="glome-content-area"]').find('> *').size(), 'Content area is empty');
    QUnit.ok(mvc.contentArea, 'There is a reference to content area');
  });
});

/* !MVC: Runner */
QUnit.test('MVC runner', function()
{
  QUnit.ok(Glome.MVC.run, 'Runner exists');

  QUnit.throws
  (
    function()
    {
      Glome.MVC.run('loremipsum');
    },
    'Caught successfully an attemp to run a "loremipsum" path',
    'No route called "loremipsum"'
  );

  // Define args for controller
  var args =
  {
    model: 'foo',
    view: 'bar',
    controller: 'lorem'
  }

  var runner = Glome.MVC.run('Prototype', args);
  QUnit.equal(typeof runner, 'object', 'Runner returned an object');

  runner.contextChange = function()
  {
    Glome.MVC.contextChangeSuccess = true;
  }

  var runner = Glome.MVC.run('Prototype');
  QUnit.ok(Glome.MVC.contextChangeSuccess, 'Context change was executed successfully');
});

/* !MVC: Require password */
QUnit.asyncTest('Require password', function()
{
  Glome.Templates.load(function()
  {
    // Bind Glome to QUnit fixture
    Glome.options.container = jQuery('#qunit-fixture');

    var pw = new Glome.MVC.RequirePassword();

    QUnit.ok(pw.run(), 'Require password was successfully run');
    QUnit.start();
  });
});

/* !MVC: First Run: Initialize */
QUnit.asyncTest('First Run: Initialize', function()
{
  Glome.Templates.load(function()
  {
    // Bind Glome to QUnit fixture
    Glome.options.container = jQuery('#qunit-fixture');

    // First run
    QUnit.ok(Glome.MVC.FirstRunInitialize, 'First run: initialized exists');

    var firstrun = new Glome.MVC.FirstRunInitialize();

    QUnit.ok(firstrun.run(), 'Firstrun was successfully run');
    QUnit.start();
  });
});

/* !MVC: First Run: Subscriptions */
QUnit.asyncTest('First Run: Subscriptions', function()
{
  Glome.Templates.load(function()
  {
    Glome.Categories.load(function()
    {
      // Bind Glome to QUnit fixture
      Glome.options.container = jQuery('#qunit-fixture');

      // First run
      QUnit.ok(Glome.MVC.FirstRunSubscriptions, 'First run: Subscriptions exists');

      var subscriptions = new Glome.MVC.FirstRunSubscriptions();

      QUnit.ok(subscriptions.run(), 'Subscriptions was successfully run');

      QUnit.equal(subscriptions.contentArea.find('.glome-category').size(), Object.keys(Glome.Categories.stack).length, 'There is a row for each category');
      QUnit.start();
    });
  });
});

/* !Widget */
QUnit.asyncTest('Widget', function()
{
  Glome.Templates.load(function()
  {
    Glome.Ads.load(function()
    {
      // Bind Glome to QUnit fixture
      Glome.options.widgetContainer = jQuery('#qunit-fixture');

      var widget = new Glome.MVC.Widget();
      var categoryId = 100000;

      var ad =
      {
        id: 999999999,
        title: 'This is a test ad',
        logo: 'images/icons/glome-icon.svg',
        adcategories:
        [
          {
            id: categoryId
          }
        ]
      }

      var gad = new Glome.Ads.Ad(ad);
      var gcategory = new Glome.Categories.Category({id: categoryId, subscribed: 1});

      QUnit.ok(widget.run(), 'Widget was successfully run');
      QUnit.ok(widget.widgetAd, 'Widget ad was selected');
      QUnit.equal(ad.id, widget.widgetAd.id, 'Last ad was selected');

      QUnit.equal(widget.widget.find('.glome-ad-title').text(), ad.title, 'Knocking ad title was changed');
      QUnit.equal(widget.widget.find('.glome-ad-logo img').attr('src'), ad.logo, 'Knocking ad logo was changed');
      QUnit.equal(widget.widget.attr('data-knocking-ad'), ad.id, 'Knocking ad id was passed to widget DOM');

      QUnit.ok(widget.run({adid: 'loremipsum'}), 'Running the widget with arguments did not cause any trouble');
      QUnit.equal(widget.widgetAd, null, 'No ad with the given id should have been found');
      QUnit.equal(widget.widget.attr('data-knocking-ad'), '', 'Empty knocking ad id was passed to widget DOM');
      QUnit.equal(widget.widget.find('.glome-ad-logo img').attr('src'), '', 'Knocking ad logo was hidden');

      QUnit.notEqual(widget.widget.attr('data-state'), 'open', 'Widget is closed on startup');

      QUnit.start();
    });
  });
});


QUnit.asyncTest('All MVCs', function()
{
  Glome.Templates.load(function()
  {
    var items =
    [
      'Navigation',
      'Widget',
      'Public',
      'RequirePassword',
      'FirstRunInitialize',
      'FirstRunSubscriptions',
      'FirstRunPassword',
      'FirstRunFinish',
      'ShowAd',
      'ShowCategory',
      'ShowAllCategories',
      'Admin',
      'AdminSubscriptions',
      'AdminStatistics',
      'AdminRewards',
      'AdminSettings',
    ];

    for (var i = 0; i <  items.length; i++)
    {
      var item = items[i];

      if (typeof Glome.MVC[item] !== 'function')
      {
        QUnit.ok(false, 'Glome.MVC.' + item + ' is not a function');
        continue;
      }

      var mvc = new Glome.MVC[item]();
      QUnit.ok(Glome.MVC[item], 'MVC ' + item + ' exists');
      QUnit.ok(mvc.model, 'MVC ' + item + ' has "model" method');
      QUnit.ok(mvc.view, 'MVC ' + item + ' has "view" method');
      QUnit.ok(mvc.controller, 'MVC ' + item + ' has "controller" method');
      QUnit.ok(mvc.run, 'MVC ' + item + ' has "run" method');
    }

    QUnit.start();
  });
});