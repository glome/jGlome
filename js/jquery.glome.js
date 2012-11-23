/**
 * Glome Inc GUI plugin for jQuery
 */
;(jQuery)
{
  var version = '0.1a';
  
  /**
   * Glome master class, which is responsible for all of the non-DOM interactions
   */
  jQuery.Glome = function(el)
  {
    var plugin = this;
    var _template = null;
    var context = jQuery(el);
    
    this.glomeid = null;
    this.ads = {};
    this.container = null;
    
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
    
    /**
     * Get a locally stored value
     * 
     * @param string key
     * @return mixed        Returns the typecasted value
     */
    plugin.get = function(key)
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
    };
    
    /**
     * Set a value for the local storage
     * 
     * @param String key    Storage identifier
     * @param mixed value   Storage value
     * @return mixed        True on successful storage
     */
    plugin.set = function(key, value)
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
    };
    
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
          return plugin.get(key);
          
        // Set preference
        case 2:
          return plugin.set(key, value);
        
        default:
          throw new Error('Glome.pref excepts either one argument for get or two arguments for set');
      }
    };
    
    /**
     * Load template file
     * 
     * @param callback   @optional, Function or array of functions that will be executed after template has been loaded
     */
    plugin.loadTemplates = function(callback)
    {
      var callbacks = [];
      
      callbacks.push
      (
        function(data)
        {
          this._template = jQuery(data);
          var tmp = data;
          var elements = [];
          var index = 0;
          
          // Get all links directly from the raw text source
          while (regs = tmp.match(/(<link.+?>)/))
          {
            var str = Glome.Tools.escape(regs[1]);
            var regexp = new RegExp(str, 'g');
            tmp = tmp.replace(regexp, '');
            
            elements.push(jQuery(regs[1]));
            
            if (i > 10)
            {
              console.log('break on overflow');
              break;
            }
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
    
    /**
     * Get a template part
     * 
     * @param String name  Template name
     * @return template DOM wrapped as a jQuery object
     */
    plugin.template = function(name)
    {
      if (arguments.length !== 1)
      {
        throw new Error('Glome.loadTemplate expects exactly one parameter');
      }
      
      if (   typeof this._template == 'null'
          || typeof this._template !== 'object')
      {
        throw new Error('Glome template failed to load');
      }
      
      var tmp = this._template.filter('#' + name).clone();
      
      if (!tmp.size())
      {
        tmp = this._template.find('#' + name).clone();
      }
      
      if (!tmp.size())
      {
        throw new Error('No template with name ' + name + ' found');
      }
      
      return tmp;
    }
    
    /* !API */
    plugin.Api =
    {
      server: 'https://api.glome.me/',
      
      // Store the handles here
      types:
      {
        ads:
        {
          url: 'ads.json',
          allowed: ['get', 'set']
        },
        user:
        {
          url: 'users.json',
          allowed: ['get', 'set']
        }
      },
        
      /**
       * Get request
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
        if (typeof this.types[type] == 'undefined')
        {
          throw new Error('Glome.Api.get does not support request ' + type);
        }
        
        if (   !this.types[type].allowed
            || jQuery.inArray('get', this.types[type].allowed) == -1)
        {
          throw new Error('Getting this type ' + type + ' is not allowed');
        }
        
        // Callback function defined, but no data
        if (   typeof data == 'function'
            || jQuery.isArray(data))
        {
          onerror = callback;
          callback = data;
          data = {};
        }
        
        // Type check for data
        if (   data
            && !jQuery.isPlainObject(data))
        {
          throw new Error('When passing data to Glome.Api.get, it has to be an object. Now received typeof ' + typeof data);
        }
        
        // Type check for callback. Allowed are function and array.
        if (   callback
            && typeof callback !== 'function'
            && !jQuery.isArray(callback))
        {
          throw new Error('Callback has to be a function or an array, now received typeof ' + typeof callback);
        }
        
        var request = jQuery.ajax
        (
          {
            url: this.server + this.types[type].url,
            data: data,
            type: 'GET',
            dataType: 'json',
            success: callback,
            error: onerror
          }
        );
        
        return request;
      },
      
      /**
       * Set data on Glome server
       * 
       * @param string type
       * @param Object data
       * @param function callback   Callback function, @optional
       * @param function onerror    On error function, @optional
       * @return jqXHR              jQuery XMLHttpRequest
       */
      set: function(type, data, callback, onerror)
      {
        if (typeof this.types[type] == 'undefined')
        {
          throw new Error('Glome.Api.set does not support request ' + type);
        }
        
        if (   !this.types[type].allowed
            || jQuery.inArray('set', this.types[type].allowed) == -1)
        {
          throw new Error('Setting this type ' + type + ' is not allowed');
        }
        
        // Type check for data
        if (   data
            && !jQuery.isPlainObject(data))
        {
          throw new Error('When passing data to Glome.Api.get, it has to be an object. Now received typeof ' + typeof data);
        }
        
        // Type check for callback
        if (   callback
            && typeof callback !== 'function')
        {
          throw new Error('Callback has to be a function, now received typeof ' + typeof callback);
        }
        
        if (!onerror)
        {
          onerror = null;
        }
        
        // Type check for callback
        if (   onerror
            && typeof onerror !== 'function')
        {
          throw new Error('onerror has to be a function, now received typeof ' + typeof onerror);
        }
        
        var request = jQuery.ajax
        (
          {
            url: this.server + this.types[type].url,
            data: data,
            type: 'POST',
            dataType: 'json',
            success: callback,
            error: onerror
          }
        );
        return request;
      }
    };
    
    /**
     * Initialize Glome
     * 
     * @param string ID
     * @param int counter Recursive call counter
     */
    plugin.createGlomeId = function(id, counter)
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
      
      this.Api.set
      (
        'user',
        {
          user:
          {
            glomeid: glomeId
          }
        },
        function(data)
        {
          plugin.pref('glomeid', data.glomeid);
          plugin.glomeid = data.glomeid;
        },
        function()
        {
          plugin.createGlomeId(id, counter + 1);
        }
      );
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
      load: function(callback)
      {
        if (   callback
            && typeof callback !== 'function')
        {
          throw new Error('Glome.loadAds callback has to be a function');
        }
        
        plugin.Api.get
        (
          'ads',
          {
            user:
            {
              glomeid: plugin.id()
            }
          },
          [
            function(data)
            {
              for (var i = 0; i < data.length; i++)
              {
                var id = data[i].id;
                plugin.ads[id] = data[i];
              }
            },
            callback
          ]
        );
      }
    };
    
    /* !DOM manipulation */
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
        
        jQuery(plugin.container).append(plugin.template('glomeWindow'));
        
        if (!jQuery(plugin.container).find('#glomeWindow').size())
        {
          return false;
        }
        
        jQuery('#glomeWidget').find('.glome-counter').text(Object.keys(plugin.ads).length);
        
        return true;
      },
      
      /**
       * Bind resize to window
       */
      resize: function()
      {
        jQuery(window)
          .on('resize.glome', function()
          {
            
          });
      }
    };
    
    /**
     * Initialize Glome
     * 
     * @param mixed el     DOM object (either plain of jQuery wrapped) or a string with traversable path
     */
    plugin.initialize = function(el)
    {
      // Create a new Glome ID if previous ID does not exist
      if (!plugin.id())
      {
        var date = new Date();
        this.createGlomeId(date.getTime());
      }
      
      if (el)
      {
        this.loadTemplates(function()
        {
          this.DOM.bindTo(el);
          this.DOM.init();
        });
      }
      
      return true;
    };
    
    if (el)
    {
      plugin.initialize(el);
    }
  };
}(jQuery)