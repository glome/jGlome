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
    
    /**
     * Generic tools
     */
    plugin.Tools =
    {
      escape: function(str)
      {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
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
          throw new Error('No template with name ' + name + ' found');
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
        var callbacks = [];
        
        callbacks.push
        (
          function(data)
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
        );
        
        if (   callback
            && typeof callback !== 'function'
            && !jQuery.isArray(callback))
        {
          throw new Error('Callback has to be either a function or an array of functions.');  
        }
        
        if (callback)
        {
          callbacks.push(callback);
        }
        
        jQuery.ajax
        (
          {
            url: 'template.html',
            context: this,
            dataType: 'html',
            isLocal: true,
            success: callbacks
          }
        );
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
          'url': 'users/{glomeid}.json',
          allowed: ['read', 'update', 'delete'],
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
        var re = new RegExp('\{([a-zA-Z0-9]+)\}');
        
        while (url.match(re))
        {
          var regs = url.match(re);
          var key = regs[1];
          
          var from = new RegExp(plugin.Tools.escape(regs[0]), 'g');
          
          switch (key)
          {
            case 'glomeid':
              var to = plugin.id();
              break;
            
            default:
              if (!plugin[key])
              {
                throw new Error('Undefined variable "' + key + '" in URL');
              }
              var to = plugin[key];
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
          console.log(type, data, callback, onerror, method);
          throw new Error('When passing data to Glome.Api.request, it has to be an object. Now received typeof ' + typeof data);
        }
        
        // Type check for callback
        if (   callback
            && typeof callback !== 'function'
            && !jQuery.isArray(callback))
        {
          throw new Error('Callback has to be a function or an array, now received typeof ' + typeof callback);
        }
        
        if (!onerror)
        {
          onerror = null;
        }
        
        // Type check for callback
        if (   onerror
            && typeof onerror !== 'function'
            && !jQuery.isArray(onerror))
        {
          throw new Error('onerror has to be a function or an array, now received typeof ' + typeof onerror);
        }
        
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
        return this.get(type, data, callback, onerror);
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
        
        if (   callback
            && typeof callback !== 'function'
            && !jQuery.isArray(callback))
        {
          throw new Error('Callback has to be a function or an array of functions');
        }
        
        if (   onerror
            && typeof onerror !== 'function'
            && !jQuery.isArray(onerror))
        {
          throw new Error('onerror has to be a function or an array of functions');
        }
        
        var callbacks = [];
        var onerrors = [];
        
        // Increase counter for failed login attempts
        onerrors.push(function()
        {
          //passwd = prompt('Login failed, please enter the password');
          plugin.Auth.loginAttempts++;
        });
        
        // First callback has to store any possible cookie and token
        callbacks.push(function(data, status, jqXHR)
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
        });
        
        onerrors.push(function(jqXHR)
        {
          console.warn('Login error');
        });
        
        // Array merge
        if (callback)
        {
          if (jQuery.isArray(callback))
          {
            callbacks.concat(callback);
          }
          else
          {
            callbacks.push(callback);
          }
        }
        
        // Array merge
        if (onerror)
        {
          if (jQuery.isArray(onerror))
          {
            onerrors.concat(onerror);
          }
          else
          {
            onerrors.push(onerror);
          }
        }
        
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
        
        var callbacks = [];
        var onerrors = [];
        
        callbacks.push
        (
          function(data)
          {
            plugin.pref('glomeid', data.glomeid);
            plugin.glomeid = data.glomeid;
            
            // Login immediately
            plugin.Auth.login(data.glomeid, '', callback, onerror);
          }
        );
        
        onerrors.push
        (
          function()
          {
            plugin.Auth.createGlomeId(id, callback, onerror, counter + 1);
          }
        );
        
        if (callback)
        {
          if (typeof callback !== 'function')
          {
            throw new Error('Callback has to be a function');  
          }
          
          callbacks.push(callback);
        }
        
        if (onerror)
        {
          if (typeof callback !== 'function')
          {
            throw new Error('Onerror has to be a function');  
          }
          
          onerrors.push(onerror);
        }
        
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
      ad: function(data)
      {
        // Return an existing ad if it is in the stack, otherwise return null
        if (   data
            && data.toString().match(/^[1-9][0-9]*$/))
        {
          var id = data.toString();
          
          if (typeof this.stack[id] != 'undefined')
          {
            return this.stack[id];
          }
          else
          {
            return null;
          }
        }
        
        /* !adObject interface */
        var adObject =
        {
          /**
           * Ad ID
           *  
           * @var Integer
           */
          id: null,
          
          /**
           * Ad view status
           * 
           * @var Integer
           */
          status: 0,
          
          /**
           * List of categories this ad belongs to
           * 
           * @var Array
           */
          adcategories: [],
          
          /**
           * Set the view status of this ad
           * 
           * @param Integer statusCode    Status code
           */
          setStatus: function(statusCode)
          {
            this.status = statusCode;
            return true;
          },
          
          /**
           * Update this ad
           */
          update: function()
          {
            //plugin.Ads.onchange();
          },
          
          /**
           * Remove this ad
           */
          remove: function()
          {
            var id = this.id;
            
            if (!plugin.Ads.stack[id])
            {
              return true;
            }
            
            plugin.Ads.removeAd(id);
            
            if (!plugin.Ads.stack[id])
            {
              return true;
            }
            else
            {
              return false;
            }
          }
        };
        
        if (data)
        {
          if (!jQuery.isPlainObject(data))
          {
            throw new Error('Glome.Ads.ad requires an object or an integer (ad id) as a constructor');
          }
          
          if (!data.id)
          {
            throw new Error('There has to be an ID present in the Glome.Ads.ad constructor object');
          }
          
          if (!data.id.toString().match(/^[1-9][0-9]*$/))
          {
            throw new Error('ID has to be an integer');
          }
          
          for (var i in data)
          {
            adObject[i] = data[i];
          }
        }
        
        if (adObject.id)
        {
          var id = adObject.id.toString();
          plugin.Ads.stack[id] = adObject;
          plugin.Ads.onchange();
        }
        
        return adObject;
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
            var id = ad.id;
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
        if (   callback
            && typeof callback !== 'function')
        {
          throw new Error('Glome.Ads.load callback has to be a function');
        }
        
        if (!onerror)
        {
          onerror = null;
        }
        
        if (   onerror
            && typeof onerror !== 'function')
        {
          throw new Error('Glome.Ads.load onerror has to be a function');
        }
        
        // Get ads
        plugin.Api.get
        (
          'ads',
          null,
          [
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
                ad = new plugin.Ads.ad(data[i]);
              }
              
              plugin.Ads.disableListeners = false;
              plugin.Ads.onchange();
            },
            callback
          ],
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
    
    /* !DOM */
    plugin.DOM =
    {
      /**
       * Bind Glome to DOM object
       * 
       * @param mixed el    jQuery object, DOM object or CSS path
       */
      bindTo: function(el)
      {
        // Ensure that this is a jQuery object
        el = jQuery(el);
        
        // Check that the element exists
        if (el.size() !== 1)
        {
          return false;
        }
        
        plugin.container = el;
        
        return true;
      },
      
      /**
       * Initialize DOM
       * 
       * @return boolean True on success, false on failure
       */
      init: function()
      {
        if (   !plugin.container
            || !plugin.container.size())
        {
          throw new Error('Glome has to be bound to a DOM object with Glome.DOM.bindTo before initializing');
        }
        
        plugin.container.append(plugin.Templates.get('window'));
        
        if (!plugin.container.find('#glomeWindow').size())
        {
          console.warn('There is no #glomeWindow, abort mission');
          return false;
        }
        
        plugin.container.find('#glomeWindow').append(plugin.Templates.get('widget'));
        
        // Listen to ads
        plugin.Ads.addListener(function()
        {
          plugin.container.find('#glomeWidget')
            .on('adchange.glome', function()
            {
              jQuery(this).find('.glome-counter').attr('data-count', (Object.keys(plugin.Ads.stack).length));
              jQuery(this).find('.glome-pager.glome-pager-max').text(Object.keys(plugin.Ads.stack).length);
              plugin.DOM.Widget.init();
            })
            .trigger('adchange.glome');
        });
        
        return true;
      },
      
      /**
       * Widget actions
       */
      Widget:
      {
        init: function()
        {
          var ids = Object.keys(plugin.Ads.stack);
          
          if (ids[0])
          {
            plugin.DOM.Widget.pagerAd(ids[0]);
          }
          else
          {
            // @TODO: display categories
          }
          
          // Toggle widget display status on clicks
          plugin.container.find('#glomeWidget').find('.glome-icon')
            .off('click.glome')
            .on('click.glome', function()
            {
              if (plugin.container.find('#glomeWidget').hasClass('display'))
              {
                plugin.DOM.Widget.hide();
              }
              else
              {
                plugin.DOM.Widget.show();
              }
              
              return false;
            });
            
          plugin.container.find('#glomeWidgetClose')
            .off('click.glome')
            .on('click.glome', function()
            {
              plugin.DOM.Widget.hide();
            });
        },
        
        /**
         * Display widget
         */
        show: function()
        {
          plugin.container.find('#glomeWidget').addClass('display');
        },
        
        /**
         * Hide widget
         */
        hide: function()
        {
          plugin.container.find('#glomeWidget').removeClass('display');
        },
        pagerAd: function(id)
        {
          var ad = plugin.Ads.ad(id);
          
          plugin.container.find('#glomeWidgetContent').find('[data-glome-template]').remove();
          plugin.container.find('#glomeWidgetContent').prepend(plugin.Templates.get('widget-ad'));
          
          var pager = plugin.Templates.get('widget-pager');
          pager.insertAfter(plugin.container.find('#glomeWidgetContent').find('[data-glome-template="widget-ad"]'));
          
          // @TODO: set pager max text
          //pager.find('.glome-pager.glome-pager-max').text();
          
          plugin.container.find('#glomeWidget').find('.glome-widget-title a')
            .attr('data-glome-ad-id', ad.id)
            .text(ad.title)
            .off('click.glome')
            .on('click.glome', function()
            {
              plugin.DOM.Widget.displayAd(jQuery(this).attr('data-glome-ad-id'));
              return false;
            });
          
          plugin.container.find('#glomeWidget').find('.glome-widget-subtext').text(ad.bonus);
        },
        
        displayAd: function(id)
        {
          plugin.DOM.Widget.hide();
          
          var popup = plugin.Templates.get('popup');
          popup.prependTo(plugin.container);
        }
      }
    };
    
    /**
     * Initialize Glome
     * 
     * @param mixed el           @optional DOM object (either plain of jQuery wrapped) or a string with traversable path
     * @param function callback  @optional Callback, triggered after initialization is complete
     * @param function onerror   @optional Onerror, triggered in the initialization fails
     */
    plugin.initialize = function(el, callback, onerror)
    {
      if (   callback
          && typeof callback !== 'function')
      {
        throw new Error('Constructor callback has to be a function');
      }
      
      // Create a new Glome ID if previous ID does not exist
      if (!plugin.id())
      {
        var date = new Date();
        this.createGlomeId(date.getTime(), callback, onerror);
      }
      else
      {
        plugin.API.login
        (
          plugin.id(),
          '',
          function()
          {
            plugin.Ads.load(callback, onerror);
          },
          function()
          {
            if (typeof onerror === 'function')
            {
              onerror();
            }
          }
        );
      }
      
      if (el)
      {
        this.Templates.load(function()
        {
          plugin.DOM.bindTo(el);
          plugin.DOM.init(callback, onerror);
        });
      }
      
      return true;
    };
    
    if (el)
    {
      return plugin.initialize(el, callback, onerror);
    }
  };
}(jQuery)