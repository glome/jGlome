/**
 * Glome Inc GUI plugin for jQuery
 */
;(jQuery)
{
  var version = '0.1a';
  
  /**
   * Glome master class, which is responsible for all of the non-DOM interactions
   */
  jQuery.Glome = function(el, callback, onerror)
  {
    'use strict';
    
    var plugin = this;
    var context = jQuery(el);
    
    this.version = version;
    this.glomeid = null;
    this.ads = {};
    this.container = null;
    this.sessionCookie = null;
    this.sessionToken = null;
    this.templateLocation = 'template.html';
    
    /**
     * Switch to determine if first run should be the starting point
     */
    this.firstrun = true;
    
    /**
     * Online status and respective event listener
     */
    this.online = window.navigator.onLine;
    jQuery(window).on('online offline', function()
    {
      plugin.online = window.navigator.onLine;
    });
    
    /**
     * Return the current Glome ID
     * 
     * return Glome ID
     */
    plugin.id = function()
    {
      if (!this.glomeid)
      {
        this.glomeid = this.pref('glomeid');
      }
      return this.glomeid;
    }
    
    /* !Tools */
    /**
     * Generic tools
     */
    plugin.Tools =
    {
      escape: function(str)
      {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      },
      
      /**
       * Validate callbacks
       * 
       * @param mixed callback       Callback to validate
       * @param boolean allowArrays  Should (flat) arrays be allowed for callbacks
       * @return true                True if the callback is valid, throw an error if not
       */
      validateCallback: function(callback, allowArrays)
      {
        if (typeof allowArrays === 'undefined')
        {
          allowArrays = true;
        }
        
        if (!callback)
        {
          return true;
        }
        else if (typeof callback == 'function')
        {
        }
        else if (jQuery.isArray(callback)
            && allowArrays)
        {
          for (var i = 0; i < callback.length; i++)
          {
            try
            {
              plugin.Tools.validateCallback(callback[i], false);
            }
            catch (e)
            {
              throw e;
            }
          }
        }
        else
        {
          throw new Error('Callback has to be a function or an array of functions');
        }
        
        return true;
      },
      
      /**
       * Merge callbacks
       * 
       * @param mixed     Free number of arrays and functions as arguments
       */
      mergeCallbacks: function()
      {
        var callbacks = [];
        
        for (var i = 0; i < arguments.length; i++)
        {
          try
          {
            this.validateCallback(arguments[i]);
            
            if (!arguments[i])
            {
              continue;
            }
            else if (typeof arguments[i] === 'function')
            {
              callbacks.push(arguments[i]);
            }
            else
            {
              for (var n = 0; n < arguments[i].length; n++)
              {
                callbacks.push(arguments[i][n]);
              }
            }
          }
          catch (e)
          {
            // Pass on the error
            throw e;
          }
        }
        
        return callbacks;
      },
      
      /**
       * Trigger callbacks
       * 
       * @param mixed     Free number of arrays and functions as arguments
       */
      triggerCallbacks: function()
      {
        for (var i = 0; i < arguments.length; i++)
        {
          try
          {
            this.validateCallback(arguments[i]);
          }
          catch (e)
          {
            throw e;
          }
          
          if (!arguments[i])
          {
            continue;
          }
          
          if (jQuery.isArray(arguments[i]))
          {
            for (var n = 0; n < arguments[i].length; n++)
            {
              arguments[i][n]();
            }
          }
          else
          {
            arguments[i]();
          }
        }
      }
    }
    
    /* !Browser */
    /**
     * Browser rules. In extensions this is where local storage shall be overridden
     * and link opening rules and such shall be defined
     */
    plugin.Browser =
    {
      openUrl: function(url, newTab)
      {
        window.open(url);
      }
    }
    
    /* !Data */
    /**
     * Data access
     */
    plugin.Data =
    {
      /**
       * Get a locally stored value
       * 
       * @param string key
       * @return mixed        Returns the typecasted value
       */
      get: function(key)
      {
        if (arguments.length !== 1)
        {
          throw new Error('Glome.get expects exactly one argument');
        }
        
        // @TODO: support extensions and store the information on their local storage or preferences
        // via their own interfaces
        
        var storage = JSON.parse(window.localStorage.getItem(key));
        
        // If there is nothing in the storage, return null
        if (   !storage
            || typeof storage.val == 'undefined')
        {
          return null;
        }
        
        // Check the type
        if (typeof storage.val !== storage.type)
        {
          throw new Error('Type mismatch error: ' + storage.type + ' is not ' + typeof storage.val);
        }
        
        return storage.val;
      },
      
      /**
       * Set a value for the local storage
       * 
       * @param String key    Storage identifier
       * @param mixed value   Storage value
       * @return mixed        True on successful storage
       */
      set: function(key, value)
      {
        if (arguments.length !== 2)
        {
          throw new Error('Glome.set expects exactly two arguments');
        }
        
        // Store typecasted object
        var storage =
        {
          type: typeof value,
          val: value
        }
        
        window.localStorage.setItem(key, JSON.stringify(storage));
        return true;
      }
    }
    /**
     * Set or get preferences
     * 
     * @param String key    Storage identifier
     * @param mixed value   Storage value
     * @return mixed        Stored value or null on get, true on successful storage attempt on set
     */
    plugin.pref = function(key, value)
    {
      switch (arguments.length)
      {
        // Get preference
        case 1:
          return plugin.Data.get(key);
          
        // Set preference
        case 2:
          return plugin.Data.set(key, value);
        
        default:
          throw new Error('Glome.pref excepts either one argument for get or two arguments for set');
      }
    };
    
    /* !Templates */
    plugin.Templates =
    {
      /**
       * Container for all of the template parts, identified by template name as key. Templates
       * are stored as jQuery DOM objects
       */
      templates: {},
      
      /**
       * Master template stored after loading the template file, stored as a jQuery DOM object
       */
      masterTemplate: null,
      
      /**
       * Get a template. This effectively creates a clone of the template or throws an error
       * if requested template is not available
       * 
       * @param String name     Template name
       * @return jQuery DOM object
       */
      get: function(name)
      {
        if (arguments.length !== 1)
        {
          throw new Error('Glome.loadTemplate expects exactly one parameter');
        }
        
        if (   typeof this.templates == 'null'
            || typeof this.templates !== 'object')
        {
          throw new Error('Glome template failed to load');
        }
        
        if (!this.templates[name])
        {
          throw new Error('No template with name "' + name + '" found');
        }
        
        var tmp = this.templates[name].clone();
        
        if (!tmp.size())
        {
          throw new Error('Unexpected error: failed to clone a new template');
        }
        
        tmp.find('*[data-glome-template]').remove();
        
        return tmp;
      },
      
      /**
       * Load the main set of templates
       * 
       * @param function callback    Callback executed on successful load
       */
      load: function(callback)
      {
        if (this.masterTemplate)
        {
          plugin.Tools.triggerCallbacks(callback);
          return;
        }
        
        var default_callback = function(data)
        {
          var regs, tmp, elements, index;
          
          this.masterTemplate = jQuery(data);
          tmp = data;
          elements = [];
          index = 0;
          
          var parts = this.masterTemplate.find('[data-glome-template]');
          
          for (var i = 0; i < parts.size(); i++)
          {
            var part = parts.eq(i).clone();
            var templateName = part.attr('data-glome-template');
            this.templates[templateName] = part;
          }
          
          i = 0;
          
          // Get all links directly from the raw text source
          while (regs = tmp.match(/(<link.+?>)/))
          {
            var str = plugin.Tools.escape(regs[1]);
            var regexp = new RegExp(str, 'g');
            tmp = tmp.replace(regexp, '');
            
            elements.push(jQuery(regs[1]));
            
            i++;
          }
          
          for (var i = 0; i < elements.length; i++)
          {
            var element = elements[i];
            
            // Not related to Glome, no need to add
            if (!element.attr('data-glome-include'))
            {
              continue;
            }
            
            if (!jQuery('head').find('link[href="' + element.attr('href') + '"]').size())
            {
              jQuery('head').append(element);
            }
          }
        }
        
        var callbacks = plugin.Tools.mergeCallbacks(default_callback, callback);
        
        jQuery.ajax
        (
          {
            url: plugin.templateLocation,
            context: this,
            dataType: 'html',
            isLocal: true,
            success: callbacks
          }
        );
      },
      
      /**
       * Populate a template with data
       * 
       * @param string template    Template name
       * @param mixed data         Template data
       */
      populate: function(template, data)
      {
        var tmp = this.get(template);
        return this.parse(tmp, data);
      },
      
      /**
       * Parse a template with data
       * 
       * @param mixed dom          jQuery wrappable object or text
       * @param mixed data         Template data
       */
      parse: function(dom, data)
      {
        var tmp = jQuery(dom).get(0).outerHTML;
        var matches = {}
        
        while (tmp.match(/\{([A-Za-z0-9_]+)\}/))
        {
          var regs = tmp.match(/\{([A-Za-z0-9\_]+)\}/);
          var regexp = new RegExp(plugin.Tools.escape(regs[0]), 'g');
          var value = '‹«' + regs[1] + '»›';
          var key = regs[1];
          
          if (typeof data[key] !== 'undefined')
          {
            var value = String(data[key]);
          }
          
          tmp = tmp.replace(regexp, value);
        }
        
        tmp = tmp.replace(/‹«([A-Za-z0-9_]+)»›/g, '{$1}');
        
        return jQuery(tmp);
      }
    }
    
    /* !API */
    /**
     * Data access API
     */
    plugin.Api =
    {
      server: plugin.pref('server') || 'https://api.glome.me/',
      
      // Store the handles here
      types:
      {
        ads:
        {
          url: 'ads.json',
          allowed: ['create', 'read']
        },
        user:
        {
          url: 'users.json',
          allowed: ['create', 'read']
        },
        login:
        {
          url: 'users/login.json',
          allowed: ['create', 'read']
        },
        me:
        {
          url: 'users/{glomeid}.json',
          allowed: ['read', 'update', 'delete']
        },
        categories:
        {
          url: 'adcategories.json',
          allowed: ['read']
        },
        subscriptions:
        {
          url: 'adcategories/{subscriptionId}/{subscriptionStatus}.json',
          allowed: ['create']
        }
      },
      
      /**
       * Parse URL
       * 
       * @param string url    URL to be parsed
       * @return string       Parsed URL where some variables are parsed
       */
      parseURL: function(url)
      {
        var from, to, re, regs, key;
        
        re = new RegExp('\{([a-zA-Z0-9]+)\}');
        
        while (url.match(re))
        {
          regs = url.match(re);
          key = regs[1];
          
          from = new RegExp(plugin.Tools.escape(regs[0]), 'g');
          
          switch (key)
          {
            case 'glomeid':
              to = plugin.id();
              break;
            
            case 'subscriptionId':
              to = plugin.Categories.subscriptionId;
              break;
            
            case 'subscriptionStatus':
              to = plugin.Categories.subscriptionStatus;
              break;
            
            default:
              if (!plugin[key])
              {
                throw new Error('Undefined variable "' + key + '" in URL');
              }
              to = plugin[key];
          }
          
          url = url.replace(from, to);
        }
        
        return url;
      },
      
      /**
       * Camel case shorthand for parseURL method
       * 
       * @param string url    URL to be parsed
       * @return string       Parsed URL where some variables are parsed
       */
      parseUrl: function(url)
      {
        return this.parseURL(url);
      },
        
      /**
       * Set data on Glome server
       * 
       * @param string type
       * @param Object data
       * @param function callback   @optional Callback function
       * @param function onerror    @optional On error function
       * @param string method       @optional Request method (GET, POST, PUT, DELETE)
       * @return jqXHR              jQuery XMLHttpRequest
       */
      request: function(type, data, callback, onerror, method)
      {
        if (arguments.length < 2)
        {
          throw new Error('Glome.API.request expects at least two arguments');
        }
        
        if (typeof this.types[type] == 'undefined')
        {
          throw new Error('Glome.Api.request does not support request ' + type);
        }
        
        // Type check for data
        if (   data
            && !jQuery.isPlainObject(data))
        {
          throw new Error('When passing data to Glome.Api.request, it has to be an object. Now received typeof ' + typeof data);
        }
        
        // Type check for callback
        plugin.Tools.validateCallback(callback);
        
        if (!onerror)
        {
          onerror = null;
        }
        
        // Type check for onerror
        plugin.Tools.validateCallback(onerror);
        
        if (!method)
        {
          method = 'POST';
        }
        
        if (!method.toString().match(/^(GET|POST|PUT|DELETE)$/))
        {
          throw new Error('"' + method.toString() + '" is not a valid method');
        }
        
        if (   method.toString() === 'POST'
            && !jQuery.isPlainObject(data))
        {
          throw new Error('Glome.API.request does not allow function as second argument for method "' + method + '"');
        }
        
        // Check for connection
        if (!plugin.online)
        {
          console.warn('No Internet connection, impossible to do API calls');
          
          if (jQuery.isArray(onerror))
          {
            for (var i = 0; i < onerror.length(); i++)
            {
              onerror[i]();
            }
          }
          else if (onerror)
          {
            onerror();
          }
          
          throw new Error('No Internet connection');
        }
        
        var request = jQuery.ajax
        (
          {
            url: plugin.API.parseURL(this.server + this.types[type].url),
            data: data,
            type: method.toString(),
            dataType: 'json',
            xhrFields:
            {
              withCredentials: true
            },
            success: callback,
            error: onerror,
            beforeSend: function(jqXHR, settings)
            {
              jqXHR.settings = settings;
            }
          }
        );
        return request;
      },
      
      /**
       * Get request. Shorthand and backwards compatibility for API.read
       * 
       * @access public
       * @param string type         Purpose of the request i.e. API identifier
       * @param object data         Data used for the GET request, @optional
       * @param function callback   Callback function, @optional
       * @param function onerror    Onerror function, @optional
       * @return jqXHR              jQuery XMLHttpRequest
       */
      get: function(type, data, callback, onerror)
      {
        return this.read(type, data, callback, onerror);
      },
      
      /**
       * Set request. Shorthand and backwards compatibility for API.create
       * 
       * @access public
       * @param string type         Purpose of the request i.e. API identifier
       * @param object data         Data used for the GET request, @optional
       * @param function callback   Callback function, @optional
       * @param function onerror    Onerror function, @optional
       * @return jqXHR              jQuery XMLHttpRequest
       */
      set: function(type, data, callback, onerror)
      {
        return this.create(type, data, callback, onerror);
      },
      
      /**
       * Create data on Glome server. This is a shorthand for calling API.request with POST as method
       * 
       * @param string type
       * @param Object data
       * @param function callback   @optional Callback function
       * @param function onerror    @optional On error function
       * @return jqXHR              jQuery XMLHttpRequest
       */
      create: function(type, data, callback, onerror)
      {
        if (   !this.types[type].allowed
            || jQuery.inArray('create', this.types[type].allowed) == -1)
        {
          throw new Error('Creating this type "' + type + '" is not allowed');
        }
        
        return this.request(type, data, callback, onerror, 'POST');
      },
      
      /**
       * Read request. This is effectively an alias to API.get
       * 
       * @access public
       * @param string type         Purpose of the request i.e. API identifier
       * @param object data         Data used for the GET request, @optional
       * @param function callback   Callback function, @optional
       * @param function onerror    Onerror function, @optional
       * @return jqXHR              jQuery XMLHttpRequest
       */
      read: function(type, data, callback, onerror)
      {
        if (   !this.types[type].allowed
            || (   jQuery.inArray('get', this.types[type].allowed) == -1
                && jQuery.inArray('read', this.types[type].allowed) == -1))
        {
          throw new Error('Creating this type "' + type + '" is not allowed');
        }
        
        if (   typeof data == 'undefined'
            || typeof data == 'function'
            || jQuery.isArray(data))
        {
          onerror = callback;
          callback = data;
          data = {};
        }
        
        if (!data)
        {
          data = {};
        }
        
        return this.request(type, data, callback, onerror, 'GET');
      },
      
      /**
       * Update data on Glome server. This is a shorthand for calling API.request with PUT as method
       * 
       * @param string type
       * @param Object data
       * @param function callback   @optional Callback function
       * @param function onerror    @optional On error function
       * @return jqXHR              jQuery XMLHttpRequest
       */
      update: function(type, data, callback, onerror)
      {
        if (   !this.types[type].allowed
            || jQuery.inArray('update', this.types[type].allowed) == -1)
        {
          throw new Error('Updating this type "' + type + '" is not allowed');
        }
        
        return this.request(type, data, callback, onerror, 'PUT');
      },
      
      /**
       * Update data on Glome server. This is a shorthand for calling API.request with PUT as method
       * 
       * @param string type
       * @param Object data
       * @param function callback   @optional Callback function
       * @param function onerror    @optional On error function
       * @return jqXHR              jQuery XMLHttpRequest
       */
      delete: function(type, data, callback, onerror)
      {
        if (   !this.types[type].allowed
            || jQuery.inArray('delete', this.types[type].allowed) == -1)
        {
          throw new Error('Deleting this type "' + type + '" is not allowed');
        }
        
        if (typeof data == 'function')
        {
          onerror = callback;
          callback = data;
          data = {};
        }
        
        return this.request(type, data, callback, onerror, 'DELETE');
      }
    };
    
    /**
     * Alias for the sake of typing errors
     */
    plugin.API = plugin.Api;
    
    /* !Auth */
    /**
     * Authentication
     */
    plugin.Auth =
    {
      /**
       * Login a user
       * 
       * @param string id, Glome ID
       * @param string password, Glome ID password, optional; by default an empty password is used
       * @param function callback, optional login callback
       * @param function onerror, optional login onerror fallback
       */
      login: function(id, passwd, callback, onerror)
      {
        if (!id)
        {
          id = plugin.id();
        }
        
        if (!id)
        {
          throw new Error('Glome ID not available');
        }
        
        if (   !id
            || !id.toString().match(/^[a-z0-9]+$/))
        {
          throw new Error('Glome ID not available');
        }
        
        // Typecast password to be a string
        if (!passwd)
        {
          passwd = '';
        }
        else if (typeof passwd != 'string')
        {
          throw new Error('Password has to be a string');
        }
        
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function(data, status, jqXHR)
          {
            plugin.glomeid = id;
            plugin.pref('glomeid', id);
            
            var token = jqXHR.getResponseHeader('X-CSRF-Token');
            
            if (token)
            {
              plugin.sessionToken = token;
              jQuery.ajaxSetup
              (
                {
                  xhrFields:
                  {
                    withCredentials: true
                  },
                  headers:
                  {
                    'X-CSRF-Token': plugin.sessionToken
                  }
                }
              );
            }
          },
          callback
        );
        
        var onerrors = plugin.Tools.mergeCallbacks
        (
          function()
          {
            //passwd = prompt('Login failed, please enter the password');
            plugin.Auth.loginAttempts++;
          },
          function()
          {
            console.warn('Login error');
          },
          onerror
        );
        
        // Default error handling
        plugin.API.request
        (
          'login',
          {
            user:
            {
              glomeid: id,
              password: passwd
            }
          },
          callbacks,
          onerrors,
          'POST'
        );
        
        return true;
      },
      
      /**
       * How many times has the user attampted to login
       */
      loginAttempts: 0,
      
      /**
       * Logout a user
       * 
       * @param int Glome ID, optional; by default the current user ID is used, if available
       */
      logout: function(id)
      {
        
      },
      
      /**
       * Initialize Glome
       * 
       * @param string ID
       * @param int counter Recursive call counter
       */
      createGlomeId: function(id, callback, onerror, counter)
      {
        if (!counter)
        {
          counter = 1;
        }
        
        if (counter >= 10)
        {
          throw new Error('Exceeded maximum number of times to create a Glome ID');
        }
        
        if (!id)
        {
          throw new Error('Glome ID creation requires a parameter');
        }
        
        if (!id.toString().match(/^[0-9a-z]+$/i))
        {
          throw new Error('Glome ID has to be alphanumeric in lowercase');
        }
        
        var glomeId = String(id);
        
        if (counter > 1)
        {
          glomeId += counter;
        }
        
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function(data)
          {
            plugin.pref('glomeid', data.glomeid);
            plugin.glomeid = data.glomeid;
            
            // Login immediately
            plugin.Auth.login(data.glomeid, '', callback, onerror);
          },
          callback
        );
        var onerrors = plugin.Tools.mergeCallbacks
        (
          function()
          {
            plugin.Auth.createGlomeId(id, callback, onerror, counter + 1);
          },
          onerror
        );
        
        plugin.API.request
        (
          'user',
          {
            user:
            {
              glomeid: glomeId
            }
          },
          callbacks,
          onerrors,
          'POST'
        );
      },
      
      /**
       * Update password
       * 
       * @param string pw1         Password
       * @param string pw2         Password confirmation
       * @param string oldpass     Existing password - this is a placeholder at the moment as sessioning takes care of it already
       * @param function callback  @optional callback
       * @param function onerror   @optional onerror
       */
      setPassword: function(pw1, pw2, oldpass, callback, onerror)
      {
        if (!plugin.id())
        {
          throw new Error('Glome ID is not available');
        }
        
        if (   typeof pw1 !== 'string'
            || typeof pw2 !== 'string')
        {
          throw new Error('Passwords have to be strings');
        }
        
        if (pw1 !== pw2)
        {
          if (onerror)
          {
            return onerror();
          }
          else
          {
            throw new Error('Password mismatch error');
          }
        }
        
        var request = plugin.API.update
        (
          'me',
          {
            user:
            {
              password: pw1,
              password_confirmation: pw2
            }
          },
          callback,
          onerror
        );
      }
    }
    
    /* !Prototype */
    /**
     * Prototype object for data
     */
    plugin.Prototype = function(data)
    {
      function Prototype(data)
      {
        this.container = 'Prototype';
        this._constructor(data);
      }
      
      plugin.Prototype.stack = {};
      
      /**
       * Registered listener functions that will be called on change event
       * 
       * @param Array
       */
      plugin.Prototype.listeners = [];
      
      /**
       * Default constructor. Optionally either leave blank to create a completely new and
       * unbound object, otherwise 
       *
       * @param mixed data    Integer or a plain object with key-value pairs @optional
       */
      Prototype.prototype._constructor = function(data)
      {
        // Ensure that container is extended to hold the data
        if (this.container)
        {
          var container = this.container;
          
          if (typeof plugin[container] == 'undefined')
          {
            plugin[container] = {};
          }
          
          if (typeof plugin[container].stack == 'undefined')
          {
            plugin[container].stack = {};
/*
            plugin[container].stack.prototype.__defineGetter__('length', function()
            {
              return Object.keys(this).length;
            });
*/
          }
          
          if (typeof plugin[container].listeners == 'undefined')
          {
            plugin[container].listeners = [];
          }
        }
        
        // Data is set
        if (!data)
        {
          data = {};
        }
        
        this.getById = function(id)
        {
          var container = this.container;
          
          if (   plugin[container]
              && plugin[container].stack
              && plugin[container].stack[id])
          {
            var o = plugin[container].stack[id];
            
            for (i in o)
            {
              if (i === 'id')
              {
                i = '_id';
              }
              
              this[i] = o[i];
            }
            
            return this;
          }
          
          throw new Error('No ' + container + ' object with id ' + id + ' available');
        }
        
        // If the constructor was given anything else than integer (caught earlier) or
        // a plain object with data, refuse to accept.
        if (!jQuery.isPlainObject(data))
        {
          if (!data.toString().match(/^[1-9][0-9]*$/))
          {
            throw new Error('Non-object constructor has to be an integer');
          }
          
          return this.getById(data);
        }
        
        // Copy all of the properties
        for (var i in data)
        {
          if (i === 'id')
          {
            this.setId(data[i]);
          }
          else
          {
            this[i] = data[i];
          }
        }
      }
      
      /**
       * See that there is always an ID
       * 
       * @var integer
       */
      Prototype.prototype.id = null;
      
      /**
       * Delete an object
       * 
       * @return boolean True if object was deleted successfully, false on failure
       */
      Prototype.prototype.delete = function()
      {
        // There was nothing (important) to delete
        if (!this.id)
        {
          return true;
        }
        
        var container = this.container;
        var rVal = true;
        
        if (   container
            && plugin[container]
            && typeof plugin[container].stack !== 'undefined'
            && plugin[container].stack[this.id])
        {
          rVal = delete plugin[container].stack[this.id];
        }
        
        if (typeof this.onchange === 'function')
        {
          this.onchange('delete');
        }
        
        return rVal;
      }
      
      /**
       * Change listener
       * 
       * @param string type    Change type
       */
      Prototype.prototype.onchange = function(type)
      {
        var container = this.container;
        
        if (   container
            && plugin[container]
            && typeof plugin[container].listeners !== 'undefined')
        {
          for (var i = 0; i < plugin[container].listeners.length; i++)
          {
            plugin[container].listeners[i](type, this);
          }
        }
      }
      
      /**
       * Default setter for property id. Validates the input.
       */
      Prototype.prototype.__defineSetter__('id', function(v)
      {
        this.setId(v);
      });
      
      Prototype.prototype.setId = function(v)
      {
        if (!v)
        {
          return;
        }
        
        if (!v.toString().match(/^[1-9][0-9]*$/))
        {
          throw new Error('ID has to be an integer');
        }
        
        if (this._id)
        {
          var prevId = this._id;
        }
        else
        {
          var prevId = null;
        }
        
        this._id = v;
        
        var container = this.container;
        
        if (   container
            && plugin[container]
            && typeof plugin[container].stack !== 'undefined')
        {
          plugin[container].stack[v] = this;
          
          if (   prevId
              && plugin[container].stack[prevId])
          {
            delete plugin[container].stack[prevId];
          }
        }
        
        if (typeof this.onchange == 'function')
        {
          if (prevId)
          {
            var type = 'update';
          }
          else
          {
            var type = 'create';
          }
          
          this.onchange(type);
        }
      }
      
      /**
       * Default getter for property id. Validates the input.
       */
      Prototype.prototype.__defineGetter__('id', function(v)
      {
        return this._id;
      });
      
      Prototype.prototype.Extends = function(newClass)
      {
        for (var i in newClass)
        {
          this[i] = newClass[i];
        }
      }
      
      return new Prototype(data);
    };
      
    /* !Ads */
    /**
     * Ads interface object
     * 
     * Methods:
     * 
     * GLome.Ads.load
     */
    plugin.Ads =
    {
      /**
       * Ad stack for storing the ads
       * 
       * @param object
       */
      stack: {},
      
      /**
       * Ad view history as retrieved from Glome server
       * 
       * @param Array
       */
      history: [],
      
      /**
       * Registered listener functions that will be called on change event
       * 
       * @param Array
       */
      listeners: [],
      
      /**
       * Is ads updating in progress right now? This is to prevent flooding of onchange events
       * 
       * @param boolean
       */
      disableListeners: false,
      
      /**
       * Create a new ad or fetch an existing from stack. Constructor
       * 
       * @param mixed data
       */
      Ad: function(data)
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function Ad(data)
        {
          this.container = 'Ads';
          this._constructor(data);
        }
        
        Ad.prototype = new plugin.Prototype();
        Ad.prototype.constructor = Ad;
        
        
        Ad.prototype.status = 0;
        Ad.prototype.adcategories = [];
        Ad.prototype.setStatus = function(statusCode)
        {
          this.status = statusCode;
          return true;
        }
        
        var ad = new Ad(data);
        
        return ad;
      },
      
      /**
       * Count ads
       * 
       * @param Object filters    Optional filters. @see listAds for more details
       * @return integer          Number of ads matching the filters
       */
      count: function(filters)
      {
        if (filters)
        {
          return Object.keys(this.listAds(filters)).length;
        }
        
        return Object.keys(this.stack).length;
      },
      
      /**
       * List ads
       * 
       * @param Object filters  Optional filters
       * @return Array of ads
       */
      listAds: function(filters)
      {
        var found, i, k, n;
        
        if (   filters
            && !jQuery.isPlainObject(filters))
        {
          throw new Error('Optional filters parameter has to be an object');
        }
        
        if (!filters)
        {
          return plugin.Ads.stack;
        }
        
        var ads = {};
        
        // Loop through the ads and apply filters
        for (i in plugin.Ads.stack)
        {
          var ad = plugin.Ads.stack[i];
          found = false;
          
          for (k in filters)
          {
            // Which object key should be used
            var filterKey = k;
            
            // Filter rules
            switch (k)
            {
              // Add here the cases where search is from an array
              case 'category':
                filterKey = 'adcategories';
                var filter = filters[k];
                
                // @TODO: support filtering by category name (String)
                if (typeof filter == 'number')
                {
                  if (jQuery.inArray(filter, ad[filterKey]) !== -1)
                  {
                    found = true;
                    break;
                  }
                }
                else if (jQuery.isArray(filter))
                {
                  var tmp = filters;
                  
                  for (n = 0; n < filter.length; n++)
                  {
                    tmp.category = filter[n];
                    jQuery.extend(ads, this.listAds(tmp));
                  }
                }
                else
                {
                  throw new Error('Glome.Ads.listAds requires ' + k + ' filter to be an integer or an array of integers');
                }
                break;
              
              // Add here the cases where search is from a string or a number
              case 'status':
                var filter = filters[k];
                
                if (typeof filter == 'number')
                {
                  if (ad[filterKey] === filter)
                  {
                    found = true;
                    break;
                  }
                }
                else if (jQuery.isArray(filter))
                {
                  var tmp = filters;
                  
                  for (n = 0; n < filter.length; n++)
                  {
                    tmp.category = filter[n];
                    jQuery.extend(ads, this.listAds(tmp));
                  }
                }
                else
                {
                  throw new Error('Glome.Ads.listAds requires ' + k + ' filter to be an integer or an array of integers');
                }
                break;
              
              default:
                throw new Error('Glome.Ads.listAds does not have a filter ' + k);
            }
          }
          
          if (found)
          {
            var id = ad._id;
            ads[id] = ad;
          }
        }
        
        return ads;
      },
      
      /** 
       * Removes an ad from the stack
       *
       * @param id
       */
      removeAd: function(id)
      {
        if (typeof this.stack[id] == 'undefined')
        {
          return true;
        }
        
        delete this.stack[id];
        plugin.Ads.onchange();
        
        
        if (typeof this.stack[id] == 'undefined')
        {
          return true;
        }
        else
        {
          return false;
        }
      },
      
      /**
       * Load ads from the Glome server
       * 
       * @param function callback     Callback for successful load
       * @param function onerror      Callback for unsuccessful load
       */
      load: function(callback, onerror)
      {
        plugin.Tools.validateCallback(onerror);
        
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function(data)
          {
            var i, id, ad;
            
            // Reset the ad stack
            plugin.Ads.stack = {};
            
            // Temporarily store the listeners
            plugin.Ads.disableListeners = true;
            
            for (i = 0; i < data.length; i++)
            {
              id = data[i].id;
              ad = new plugin.Ads.Ad(data[i]);
            }
            
            plugin.Ads.disableListeners = false;
            plugin.Ads.onchange();
          },
          callback
        );
        
        // Get ads
        plugin.Api.get
        (
          'ads',
          null,
          callbacks,
          onerror
        );
      },
      
      /**
       * Add a listener to observe data changes
       * 
       * @param function listener    Listerner function that should be added
       */
      addListener: function(listener)
      {
        if (typeof listener != 'function')
        {
          throw new Error('Glome.Ads.addListener requires a function as argument, when one is given');
        }
        
        plugin.Ads.listeners.push(listener);
        return true;
      },
      
      /**
       * Remove a listener
       * 
       * @param function listener    Listerner function that should be removed
       * @return boolean
       */
      removeListener: function(listener)
      {
        var i;
        
        if (typeof listener != 'function')
        {
          throw new Error('Glome.Ads.addListener requires a function as argument, when one is given');
        }
        
        for (i = 0; i < plugin.Ads.listeners.length; i++)
        {
          if (plugin.Ads.listeners[i] == listener)
          {
            plugin.Ads.listeners.splice(i, 1);
            return true;
          }
        }
        
        return true;
      },
      
      /**
       * When stack changes, this method is triggered or when present, a function will be
       * registered to listeners list
       * 
       * @param function listener    Listener function
       */
      onchange: function()
      {
        if (this.disableListeners)
        {
          return;
        }
        
        for (var i = 0; i < plugin.Ads.listeners.length; i++)
        {
          plugin.Ads.listeners[i].context = plugin.Ads;
          plugin.Ads.listeners[i]();  
        }
      }
    };
    
    /* !Categories */
    /**
     * Categories interface object
     * 
     * Methods:
     * 
     * GLome.Categories.load
     */
    plugin.Categories =
    {
      /**
       * Category stack for storing the categories
       * 
       * @param object
       */
      stack: {},
      
      /**
       * Registered listener functions that will be called on change event
       * 
       * @param Array
       */
      listeners: [],
      
      /**
       * Is categories updating in progress right now? This is to prevent flooding of onchange events
       * 
       * @param boolean
       */
      disableListeners: false,
      
      /**
       * Selected category. This is for enabling parsing of the action URL
       * 
       * @param int
       */
      subscriptionId: 0,
      
      /**
       * Subscription status. This is for enabling parsing of the action URL
       * 
       * @param int
       */
      subscriptionStatus: 0,
      
      /**
       * Create a new category or fetch an existing from stack. Constructor
       * 
       * @param mixed data
       */
      Category: function(data)
      {
        // Return an existing category if it is in the stack, otherwise return null
        function Category(data)
        {
          this.container = 'Categories';
          this._constructor(data);
        }
        
        Category.prototype = new plugin.Prototype();
        Category.prototype.constructor = Category;
        
        Category.prototype.status = 0;
        Category.prototype.setStatus = function(statusCode)
        {
          this.status = statusCode;
          return true;
        }
        
        // Subscription status
        Category.prototype.subscribed = 0;
        
        // Shorthand for setting subscription status to 'on'
        Category.prototype.subscribe = function(callback)
        {
          var _category = this;
          
          plugin.Categories.setSubscriptionStatus
          (
            this.id,
            'on',
            plugin.Tools.mergeCallbacks
            (
              function()
              {
                _category.subscribed = 1;
                
                // Sync also the stack if the reference got broken
                var id = _category.id;
                plugin.Categories.stack[id].subscribed = _category.subscribed
                
                plugin.Categories.onchange();
              },
              callback
            )
          );
        }
        
        // Shorthand for setting subscription status to 'off'
        Category.prototype.unsubscribe = function(callback)
        {
          var _category = this;
          
          plugin.Categories.setSubscriptionStatus
          (
            this.id,
            'on',
            plugin.Tools.mergeCallbacks
            (
              function()
              {
                _category.subscribed = 0;
                
                // Sync also the stack if the reference got broken
                var id = _category.id;
                plugin.Categories.stack[id].subscribed = _category.subscribed
                
                plugin.Categories.onchange();
              },
              callback
            )
          );
        }
        
        var category = new Category(data);
        
        return category;
      },
      
      /**
       * Count categories
       * 
       * @param Object filters    Optional filters. @see listAds for more details
       * @return integer          Number of ads matching the filters
       */
      count: function(filters)
      {
        if (filters)
        {
          return Object.keys(this.listCategories(filters)).length;
        }
        
        return Object.keys(this.stack).length;
      },
      
      /**
       * Set subscription status for a category
       * 
       * @param int categoryId       ID of the category
       * @param int status           Subscription status, 1 for subscribed, 0 for unsubscribed
       * @param mixed callback       Callback, either a function or an array of functions
       * @param mixed onerror        Onerror, either a function or an array of functions
       * @return jqXHR request
       */
      setSubscriptionStatus: function(categoryId, status, callback, onerror)
      {
        if (   !categoryId
            || categoryId.toString().match(/[^0-9]/))
        {
          throw new Error('Only integers allowed for category ID');
        }
        
        if (   typeof status === 'undefined'
            || !status.toString().match(/^(0|1|on|off)$/i))
        {
          throw new Error('Status has to be either "on" or "off"');
        }
        
        plugin.Categories.subscriptionId = categoryId;
        
        if (status.toString().match(/(0|off)/i))
        {
          plugin.Categories.subscriptionStatus = 'off';
        }
        else
        {
          plugin.Categories.subscriptionStatus = 'on';
        }
        
        var request = plugin.API.create
        (
          'subscriptions',
          {
            user:
            {
              glomeid: plugin.id()
            }
          },
          callback,
          onerror
        );
        
        return request;
      },
      
      /**
       * List categories
       * 
       * @param Object filters  Optional filters
       * @return Array of categories
       */
      listCategories: function(filters)
      {
        var found, i, k, n;
        
        if (   filters
            && !jQuery.isPlainObject(filters))
        {
          throw new Error('Optional filters parameter has to be an object');
        }
        
        if (!filters)
        {
          return plugin.Categories.stack;
        }
        
        var categories = {};
        
        // Loop through the categories and apply filters
        for (i in plugin.Categories.stack)
        {
          var category = plugin.Categories.stack[i];
          found = false;
          
          for (k in filters)
          {
            // Which object key should be used
            var filterKey = k;
            
            // Filter rules
            switch (k)
            {
              // Add here the cases where search is from a string or a number
              case 'status':
                var filter = filters[k];
                
                if (typeof filter == 'number')
                {
                  if (category[filterKey] === filter)
                  {
                    found = true;
                    break;
                  }
                }
                else if (jQuery.isArray(filter))
                {
                  var tmp = filters;
                  
                  for (n = 0; n < filter.length; n++)
                  {
                    tmp.category = filter[n];
                    jQuery.extend(categories, this.listCategories(tmp));
                  }
                }
                else
                {
                  throw new Error('Glome.Categories.listCategories requires ' + k + ' filter to be an integer or an array of integers');
                }
                break;
              
              case 'subscribed':
                if (category[k] === filters[i])
                {
                  found = true;
                }
                break;
              
              default:
                throw new Error('Glome.Categories.listCategories does not have a filter ' + k);
            }
          }
          
          if (found)
          {
            var id = category._id;
            categories[id] = category;
          }
        }
        
        return categories;
      },
      
      /** 
       * Removes a category from the stack
       *
       * @param id
       */
      removeCategory: function(id)
      {
        if (typeof this.stack[id] == 'undefined')
        {
          return true;
        }
        
        delete this.stack[id];
        plugin.Categories.onchange();
        
        
        if (typeof this.stack[id] == 'undefined')
        {
          return true;
        }
        else
        {
          return false;
        }
      },
      
      /**
       * Load Categories from the Glome server
       * 
       * @param mixed callback     Callback for successful load
       * @param mixed onerror      Callback for unsuccessful load
       */
      load: function(callback, onerror)
      {
        plugin.Tools.validateCallback(onerror);
        
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function(data)
          {
            var i, id, category;
            
            // Reset the category stack
            plugin.Categories.stack = {};
            
            // Temporarily store the listeners
            plugin.Categories.disableListeners = true;
            
            for (i = 0; i < data.length; i++)
            {
              id = data[i].id;
              category = new plugin.Categories.Category(data[i]);
            }
            
            plugin.Categories.disableListeners = false;
            plugin.Categories.onchange();
          },
          callback
        );
        
        // Get Categories
        plugin.Api.get
        (
          'categories',
          null,
          callbacks,
          onerror
        );
      },
      
      /**
       * Add a listener to observe data changes
       * 
       * @param function listener    Listerner function that should be added
       */
      addListener: function(listener)
      {
        if (typeof listener != 'function')
        {
          throw new Error('Glome.Categories.addListener requires a function as argument, when one is given');
        }
        
        plugin.Categories.listeners.push(listener);
        return true;
      },
      
      /**
       * Remove a listener
       * 
       * @param function listener    Listerner function that should be removed
       * @return boolean
       */
      removeListener: function(listener)
      {
        var i;
        
        if (typeof listener != 'function')
        {
          throw new Error('Glome.Categories.addListener requires a function as argument, when one is given');
        }
        
        for (i = 0; i < plugin.Categories.listeners.length; i++)
        {
          if (plugin.Categories.listeners[i] == listener)
          {
            plugin.Categories.listeners.splice(i, 1);
            return true;
          }
        }
        
        return true;
      },
      
      /**
       * When stack changes, this method is triggered or when present, a function will be
       * registered to listeners list
       * 
       * @param function listener    Listener function
       */
      onchange: function()
      {
        if (this.disableListeners)
        {
          return;
        }
        
        for (var i = 0; i < plugin.Categories.listeners.length; i++)
        {
          plugin.Categories.listeners[i].context = plugin.Categories;
          plugin.Categories.listeners[i]();  
        }
      }
    };
    
    /* !MVC */
    /**
     * Sketch of MVC. @TODO: use backbone.js or something similar in the near future
     */
    plugin.MVC =
    {
      /* !MVC Runner */
      run: function(route, args)
      {
        if (typeof plugin.MVC[route] !== 'function')
        {
          throw new Error('No route called "' + route.toString() + '"');
        }
        
        var mvc = new plugin.MVC[route];
        
        if (typeof mvc.run !== 'undefined')
        {
          mvc.run(args);
        }
        
        return mvc;
      },
      
      /* !MVC Prototype */
      Prototype: function()
      {
        var MVC = function()
        {
          // Model
          this.model = function(args)
          {
            
          };
          
          // View
          this.view = function(args)
          {
            
          };
          
          // Controller
          this.controller = function(args)
          {
            
          };
          
          this.run = function(args)
          {
            this.model(args);
            this.view(args);
            this.controller(args);
            
            return true;
          }
        }
        return new MVC();
      },
      
      /* !MVC: Widget */
      Widget: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Prototype();
        mvc.prototype.widgetAd = null;
        
        mvc.prototype.model = function(args)
        {
          // If there is no widgetAd, use the last
          if (!this.widgetAd)
          {
            var ids = Object.keys(plugin.Ads.stack);
            
            if (ids.length)
            {
              var last = ids.length - 1;
              var id = ids[last];
              
              this.widgetAd = new plugin.Ads.Ad(id);
            }
          }
          else if (args
              && args.adid)
          {
            try
            {
              this.widgetAd = new plugin.Ads.Ad(args.adid);
            }
            catch (e)
            {
              this.widgetAd = null;
            }
          }
        }
        
        mvc.prototype.view = function(args)
        {
          this.widget = plugin.container.find('[data-glome-template="widget"]');
          
          // Reuse the old widget or create new
          if (!this.widget.size())
          {
            this.widget = plugin.Templates.get('widget').appendTo(plugin.container);
          }
          
          if (this.widgetAd)
          {
            this.widget.find('.glome-ad-title').text(this.widgetAd.title);
            this.widget.find('.glome-ad-logo img').attr('src', this.widgetAd.logo);
            this.widget.attr('data-knocking-ad', this.widgetAd.id);
          }
          else
          {
            this.widget.attr('data-knocking-ad', '');
            this.widget.find('.glome-ad-logo img').attr('src', '');
          }
        }
        
        mvc.prototype.controller = function(args)
        {
          // Open and close the widget. Closing widget hides always the knocking
          // until a new knock is initialized
          this.widget.find('#glomeWidgetIcon')
            .off('click')
            .on('click', function()
            {
              if (jQuery(this).parent().attr('data-state') === 'open')
              {
                jQuery(this).parent().attr('data-state', 'closed');
              }
              else if (jQuery(this).parent().attr('data-knocking-ad'))
              {
               jQuery(this).parent().attr('data-state', 'open'); 
              }
            });
          
          // Start with the widget closed if no arguments were passed
          if (!args)
          {
            this.widget
              .attr('data-state', 'closed');
          }
          
          this.widget.find('a')
            .off('click')
            .on('click', function(e)
            {
              e.preventDefault();
              plugin.MVC.run('ShowAd', {adId: jQuery(this).parents('[data-knocking-ad]').attr('data-knocking-ad')});
              return false;
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !MVC Public */
      Public: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Prototype();
        
        // Prototype for initializing a view
        mvc.prototype.viewInit = function()
        {
          var wrapper = jQuery('[data-glome-template="public-wrapper"]');
          
          if (!wrapper.size())
          {
            var wrapper = plugin.Templates.get('public-wrapper')
              .appendTo(plugin.container);
          }
          
          if (!wrapper.find('[data-glome-template="public-header"]').size())
          {
            var header = plugin.Templates.get('public-header');
            header.find('.glome-close')
              .off('click')
              .on('click', function()
              {
                plugin.container.find('[data-glome-template="public-wrapper"]').remove();
                plugin.MVC.run('Widget');
              });
            
            header.appendTo(wrapper);
          }
          
          if (!wrapper.find('[data-glome-template="public-footer"]').size())
          {
            plugin.Templates.get('public-footer').appendTo(wrapper);
          }
          
          if (!wrapper.find('[data-glome-template="public-content"]').size())
          {
            plugin.Templates.get('public-content').insertAfter(wrapper.find('[data-glome-template="public-header"]'));
          }
          
          this.contentArea = wrapper.find('[data-glome-template="public-content"]').find('[data-context="glome-content-area"]');
          this.contentArea.find('> *').remove();
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !MVC: Require password */
      RequirePassword: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.get('public-requirepassword');
          
          this.content.appendTo(this.contentArea);
        }
        
        mvc.prototype.controller = function()
        {
          this.contentArea.find('#glomePublicRequirePasswordContainer').find('button')
            .off('click')
            .on('click', function()
            {
              jQuery('#glomePublicRequirePasswordContainer').trigger('submit');
              console.log('click');
            });
          
          this.contentArea.find('#glomePublicRequirePasswordContainer')
            .off('submit')
            .on('submit', function(e)
            {
              var request;
              e.preventDefault();
              
              if (request)
              {
                request.abort();
              }
              
              request = plugin.Auth.login
              (
                plugin.id(),
                jQuery(this).find('input[type="password"]').val(),
                function()
                {
                  plugin.Ads.load(function()
                  {
                    plugin.container.find('.glome-close').trigger('click');
                  });
                  plugin.Categories.load();
                }
              );
              
              return false;
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !First run: initialize */
      FirstRunInitialize: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.get('public-startup');
          
          this.content.appendTo(this.contentArea);
        }
        
        mvc.prototype.controller = function()
        {
          this.content.find('#glomePublicFirstRunProceed')
            .on('click', function()
            {
              plugin.MVC.run('FirstRunSubscriptions');
            });
            
          this.content.find('a.glome-skip')
            .off('click')
            .on('click', function()
            {
              plugin.container.find('.glome-close').trigger('click');
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !First run: subscriptions */
      FirstRunSubscriptions: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-subscriptions', {count: plugin.Categories.count(), selected: 0});
          this.content.appendTo(this.contentArea);
          
          for (var i in plugin.Categories.stack)
          {
            var row = this.contentArea.find('.glome-category[data-category="' + plugin.Categories.stack[i].id + '"]');
            
            if (!row.size())
            {
              var row = plugin.Templates.populate('category-row', plugin.Categories.stack[i]);
              row.appendTo(this.contentArea.find('.glome-categories'));
            }
          }
        }
        
        mvc.prototype.controller = function()
        {
          this.contentArea.find('.glome-subscribe')
            .on('click', function()
            {
              var id = jQuery(this).parents('[data-glome-category]').attr('data-glome-category');
              console.log(id, plugin.Categories.stack[id].subscribed);
              
              if (plugin.Categories.stack[id].subscribed)
              {
                jQuery(this).attr('data-state', 'off');
                plugin.Categories.stack[id].unsubscribe();
              }
              else
              {
                jQuery(this).attr('data-state', 'on');
                plugin.Categories.stack[id].subscribe();
              }
            });
          
          this.contentArea.find('.glome-pager .glome-navigation-button.left')
            .on('click', function()
            {
              plugin.MVC.run('FirstRunInitialize');
            });
          
          this.contentArea.find('.glome-pager .glome-navigation-button.right')
            .on('click', function()
            {
              plugin.MVC.run('FirstRunPassword');
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !First run: set optional password */
      FirstRunPassword: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.get('public-password');
          
          this.content.appendTo(this.contentArea);
        }
        
        mvc.prototype.controller = function()
        {
          this.contentArea.find('.glome-pager .glome-navigation-button.left')
            .on('click', function()
            {
              plugin.MVC.run('FirstRunSubscriptions');
            });
          
          this.contentArea.find('.glome-pager .glome-navigation-button.right')
            .on('click', function()
            {
              plugin.MVC.run('FirstRunFinish');
            });
          
          // Set the password if requested for
          jQuery('#glomePublicSetPassword')
            .on('submit', function(e)
            {
              var pw1 = jQuery(this).find('input[type="password"]').eq(0).val();
              var pw2 = jQuery(this).find('input[type="password"]').eq(1).val();
              
              if (pw1 !== pw2)
              {
                alert('Passwords do not match');
              }
              else if (!pw1)
              {
                jQuery('#glomePublicPassword').find('.glome-navigation-button.right').trigger('click');
              }
              else if (pw1.length < 6)
              {
                alert('Password minimum length is 6 characters');
              }
              else
              {
                plugin.Auth.setPassword
                (
                  pw1,
                  pw2,
                  null,
                  function()
                  {
                    jQuery('#glomePublicPassword').find('.glome-navigation-button.right').trigger('click');
                  }
                );
              }
              
              e.preventDefault();
              return false;
            });
          
          jQuery('#glomePublicSetPassword').find('button')
            .on('click', function()
            {
              jQuery(this).parents('form').trigger('click');
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !First run: finish */
      FirstRunFinish: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.get('public-finish');
          
          this.content.appendTo(this.contentArea);
        }
        
        mvc.prototype.controller = function()
        {
          this.content.find('#glomePublicFinishClose')
            .on('click', function()
            {
              plugin.container.find('.glome-close').trigger('click');
            });
            
          this.content.find('a.glome-settings')
            .off('click')
            .on('click', function()
            {
              plugin.MVC.run('Admin');
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !Public: Show an ad */
      ShowAd: function()
      {
        // Return an existing ad if it is in the stack, otherwise return null
        function mvc()
        {
        }
        
        mvc.prototype = new plugin.MVC.Public();
        
        mvc.prototype.model = function(args)
        {
          console.log(args);
          if (args.adId)
          {
            this.ad = new plugin.Ads.Ad(args.adId);
          }
          else if (args.constructor.name === 'Ad')
          {
            this.ad = args;
          }
          
          this.category = new plugin.Categories.Category(this.ad.adcategories[0]);
        }
        
        mvc.prototype.view = function(args)
        {
          var vars =
          {
            name: this.category.name,
            title: this.ad.title,
            description: this.ad.description,
            bonus: this.ad.bonus,
            adAction: this.ad.action,
            adId: this.ad.id,
            categoryId: this.category.id
          }
          
          this.viewInit();
          this.content = plugin.Templates.populate('public-ad', vars);
          this.content.appendTo(this.contentArea);
          
          this.content.find('.glome-ad-image').get(0).src = this.ad.content;
          
          this.content.find('.glome-ad-image, .glome-goto-ad')
            .on('click', function(e)
            {
              e.preventDefault();
              plugin.Browser.openUrl(jQuery(this).parents('[data-ad-action]').attr('data-ad-action'));
              return false;
            });
        }
        
        var m = new mvc();
        
        return m;
      },
      
      /* !Public: Show a category */
      ShowCategory:
      {
        
      },
      
      /* !Public: Show all categories */
      ShowAllCategories:
      {
        
      }
    };
    
    /* !Initialize */
    /**
     * Initialize Glome
     * 
     * @param mixed el           @optional DOM object (either plain of jQuery wrapped) or a string with traversable path
     * @param function callback  @optional @see Callback, triggered after initialization is complete
     * @param function onerror   @optional @see Onerror, triggered in the initialization fails
     */
    plugin.initialize = function(el, callback, onerror)
    {
      plugin.Tools.validateCallback(callback);
      plugin.Tools.validateCallback(onerror);
      
      if (el)
      {
        this.Templates.load(function()
        {
          plugin.container = jQuery(el);
        });
      }
      
      // Create a new Glome ID if previous ID does not exist
      if (!plugin.id()
          || window.location.hash == '#debug')
      {
        var date = new Date();
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function()
          {
            plugin.MVC.run('FirstRunInitialize');
          },
          function()
          {
            plugin.Ads.load();
            plugin.Categories.load();
          },
          callback
        );
        this.Auth.createGlomeId(date.getTime(), callbacks, onerror);
      }
      else
      {
        this.firstrun = false;
        
        plugin.Auth.login
        (
          plugin.id(),
          '',
          function()
          {
            plugin.Tools.triggerCallbacks
            (
              function()
              {
                plugin.Ads.load(function()
                {
                  plugin.MVC.run('Widget');
                });
                plugin.Categories.load();
              },
              callback
            );
          },
          function()
          {
            var onerrors = plugin.Tools.mergeCallbacks
            (
              function()
              {
                plugin.MVC.run('RequirePassword');
              },
              onerror
            );
            
            plugin.Tools.triggerCallbacks(onerrors);
          }
        );
      }
      
      return true;
    };
    
    if (el)
    {
      return plugin.initialize(el, callback, onerror);
    }
  };
}(jQuery)