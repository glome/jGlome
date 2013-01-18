// Network latency for asynchronous testing
var networkLatency = 500;
var previousId = null;

var testServer = '/';
var testGlomeId = null;
var testPassword = 'loremipsum';

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
  console.log(counter);

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
  
  // Constructor creates stack and listeners placeholders for newly created objects
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
});

/* !Listeners triggered on create */
QUnit.test('Listeners triggered on create', function()
{
  QUnit.stop();
  
  // Reset the array
  Glome.Ads.listeners = [];
  Glome.Ads.listeners.push(function()
  {
    // Reset the array
    Glome.Ads.listeners = [];
    
    QUnit.start();
    QUnit.ok(typeof Glome.Ads.stack[objectId], 'Onchange event was successfully triggered after create');
    QUnit.expect(1);
  });
  
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
  
  // Reset the array
  Glome.Ads.listeners = [];
  Glome.Ads.listeners.push(function()
  {
    // Reset the array
    Glome.Ads.listeners = [];
    
    QUnit.start();
    QUnit.equal(typeof Glome.Ads.stack[objectId], 'undefined', 'Onchange event was successfully triggered after ID change');
    QUnit.expect(1);
  });
  
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
  Glome[container].listeners.push(function()
  {
    // Reset the array
    Glome[container].listeners = [];
    
    QUnit.start();
    QUnit.equal(typeof Glome[container].stack[objectId], 'undefined', 'Onchange event was successfully triggered after delete');
    QUnit.expect(1);
  });
  
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
  Glome[container].listeners.push(function(type, object)
  {
    // Reset the array
    Glome[container].listeners = [];
    
    QUnit.start();
    QUnit.equal(type, 'delete', 'Onchange event passes correctly the argument "type"');
    QUnit.equal(object.id, objectId, 'Onchange event passes correctly the argument "object"');
  });
  
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
      QUnit.start();
      QUnit.ok(Glome.sessionToken, 'CSRF token is set');
      QUnit.equal(Glome.sessionToken, jqXHR.getResponseHeader('X-CSRF-Token'), 'CSRF token is the same as the one of AJAX request');
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
    title: 'Test'
  };
  
  var gad = new Glome.Ads.Ad(ad);
  
  QUnit.equal(gad.constructor.name, 'Ad', 'Constructor name was changed');
  
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
  
  var length = Glome.Ads.listeners.length;
  
  Glome.Ads.addListener(listener);
  QUnit.equal(Glome.Ads.listeners.length, length + 1, 'Listener was successfully registered according to length');
  QUnit.strictEqual(Glome.Ads.listeners[length], listener, 'Listener was successfully registered to stored data');
  
  Glome.Ads.onchange();
  QUnit.equal(jQuery('#qunit-fixture').attr('data-listener'), 'true', 'Listener was successfully triggered');
  
  Glome.Ads.removeListener(listener);
  QUnit.equal(Glome.Ads.listeners.length, length, 'Listener was successfully removed according to length');
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
  
  var gad = Glome.Ads.Ad(ad);
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
QUnit.test('Fetch ads', function()
{
  QUnit.stop();
  
  // List ads for this Glome user
  Glome.Ads.load(function()
  {
    QUnit.notEqual(0, Object.keys(Glome.Ads.stack).length, 'Glome ads were loaded');
    QUnit.start();
  }, function()
  {
    QUnit.start();
    QUnit.ok(false, 'Glome ads were loaded (caught on error)');
  });
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

// These tests have to be asynchronous to ensure that template test has been run already
/* Glome UI */
QUnit.asyncTest('Glome UI', function()
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
});

/* !Module: MVC */
QUnit.module('MVC');
QUnit.test('MVC Prototype', function()
{
  QUnit.ok(Glome.MVC, 'There is a MVC object');
  QUnit.ok(Glome.MVC.Prototype, 'There is a prototype for MVC objects');
  
  var MVC = new Glome.MVC.Prototype();
  QUnit.ok(MVC, 'MVC Prototype is callable');
  QUnit.ok(MVC.run, 'Method "run" exists');
  QUnit.ok(MVC.model, 'Method "model" exists');
  QUnit.ok(MVC.view, 'Method "view" exists');
  QUnit.ok(MVC.controller, 'Method "controller" exists');
  
  // Set the model argument from args
  MVC.model = function(args)
  {
    this.model = args.model;
  }
  
  // Set the view argument from args
  MVC.view = function(args)
  {
    this.view = args.view;
  }
  
  // Set the controller argument from args
  MVC.controller = function(args)
  {
    this.controller = args.controller;
  }
  
  // Define args for controller
  var args = 
  {
    model: 'foo',
    view: 'bar',
    controller: 'lorem'
  }
  
  QUnit.ok(MVC.run(args), 'MVC run was executed successfully');;
  QUnit.equal(args.model, MVC.model, 'Arguments of "run" were passed successfully to "model"');
  QUnit.equal(args.view, MVC.view, 'Arguments of "run" were passed successfully to "view"');
  QUnit.equal(args.controller, MVC.controller, 'Arguments of "run" were passed successfully to "controller"');
});

/* !Public */
QUnit.asyncTest('Public', function()
{
  Glome.Templates.load(function()
  {
    QUnit.start();
    
    // Bind Glome to QUnit fixture
    Glome.container = jQuery('#qunit-fixture');
    
    // Check that there is a wrapper for MVC for the public context
    QUnit.ok(Glome.MVC.Public, 'Public wrapper exists');
    
    var mvc = new Glome.MVC.Public();
    mvc.viewInit();
    
    QUnit.ok(Glome.container.find('[data-glome-template="public-header"]').size(), 'Headers were found from the fixture');
    QUnit.ok(Glome.container.find('[data-glome-template="public-content"]').size(), 'Content area was found from the fixture');
    QUnit.ok(Glome.container.find('[data-glome-template="public-footer"]').size(), 'Footers were found from the fixture');
    QUnit.equal(0, Glome.container.find('[data-context="glome-content-area"]').find('> *').size(), 'Content area is empty');
    QUnit.ok(mvc.contentArea, 'There is a reference to content area');
  });
});

/* !MVC: First Run: Initialize */
QUnit.asyncTest('First Run: Initialize', function()
{
  Glome.Templates.load(function()
  {
    // Bind Glome to QUnit fixture
    Glome.context = jQuery('#qunit-fixture');
    
    // First run
    QUnit.ok(Glome.MVC.FirstRunInitialize, 'First run: initialized exists');
    
    var firstrun = new Glome.MVC.FirstRunInitialize();
    QUnit.ok(firstrun.model, 'Firstrun returned an object with model');
    QUnit.ok(firstrun.view, 'Firstrun returned an object with view');
    QUnit.ok(firstrun.controller, 'Firstrun returned an object with controller');
    QUnit.ok(firstrun.run, 'Firstrun returned runner');
    
    QUnit.ok(firstrun.run(), 'Firstrun was successfully run');
    QUnit.start();
  });
});

  /* !MVC: First Run: Subscriptions */
QUnit.asyncTest('First Run: Subscriptions', function()
{
  Glome.Templates.load(function()
  {
    // Bind Glome to QUnit fixture
    Glome.context = jQuery('#qunit-fixture');
    
    // First run
    QUnit.ok(Glome.MVC.FirstRunSubscriptions, 'First run: Subscriptions exists');
    
    var subscriptions = new Glome.MVC.FirstRunSubscriptions();
    QUnit.ok(subscriptions.model, 'Subscriptions returned an object with model');
    QUnit.ok(subscriptions.view, 'Subscriptions returned an object with view');
    QUnit.ok(subscriptions.controller, 'Subscriptions returned an object with controller');
    QUnit.ok(subscriptions.run, 'Subscriptions returned runner');
    
    QUnit.ok(subscriptions.run(), 'Subscriptions was successfully run');
    QUnit.start();
  });
});

/* !Initialize with constructor */
// These tests have to be asynchronous to ensure that template test
// has been run already
/*
QUnit.asyncTest('Initialize with constructor', function()
{
  var fx = jQuery('<div />')
    .attr('id', 'glome-fixture')
    .appendTo('body');
  
  QUnit.throws
  (
    function()
    {
      var Glome = new jQuery.Glome(fx, 'foobar');
    },
    'Constructor callback has to be a function',
    'Caught illegal callback type'
  );
  
  QUnit.throws
  (
    function()
    {
      var Glome = new jQuery.Glome(fx, null, 'foobar');
    },
    'Constructor onerror has to be a function',
    'Caught illegal onerror type'
  );
  
  var Glome = new jQuery.Glome(fx, function()
  {
    // Test on local server
    QUnit.equal(Glome.API.server, testServer, 'Preference was stored and read');
    
    QUnit.equal(fx.find('#glomeWindow').size(), 1, 'Glome main window was inserted successfully and automatically with constructor');
    QUnit.ok(Glome.id(), 'There is a Glome ID');
    QUnit.equal(Number(fx.find('#glomeWidget').find('.glome-counter').attr('data-count')), Object.keys(Glome.Ads.stack).length, 'Ticker has the correct number of ads');
    
    var id = 123456789;
    
    Glome.Ads.Ad
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
  });
});
*/


/*
QUnit.asyncTest('Set ad as viewed', function()
{
  Glome.Ads.getit(Glome.ads[0].adid, function()
  {
    QUnit.start();
  });
});
*/
