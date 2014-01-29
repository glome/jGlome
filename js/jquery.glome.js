/**
 * Glome UI plugin for jQuery
 *
 * Copyright (C) 2013 Glome Oy <contact@glome.me>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
;(jQuery)
{
  /**
   * Glome master class, which is responsible for all of the non-DOM interactions
   */
  jQuery.Glome = function(options)
  {
    'use strict';

    var defaults =
    {
      container: null,
      callback: null,
      onerror: null,
      xhrFields: null,
      beforeSend: function(jqxhr)
      {
        if (!plugin.sessionToken)
        {
          return;
        }

        jqxhr.setRequestHeader('X-CSRF-Token', plugin.sessionToken);
        jqxhr.setRequestHeader('Cookie', plugin.cookie);
      },
      i18n: null
    }

    var plugin = this;
    var context = null;

    if (typeof this.options === 'undefined')
    {
      this.options = {};
    }

    if (typeof options === 'undefined')
    {
      options = {};
    }

    jQuery.extend(this.options, defaults, options);

    this.glomeid = null;
    this.idPrefix = '';
    this.ads = {};
    this.container = null;
    this.sessionCookie = null;
    this.sessionToken = null;
    this.contentPrefix = '';
    this.templateLocation = 'template.html';
    this.userData = null;
    this.stats = null;
    this.syncCode = null;
    this.pairs = {};

    /**
     * Current MVC instance
     */
    this.mvc = null;

    /**
     * Timestamp of the last successful action. This can be used in the
     * future for delayed logout or session time
     *
     * @var integer
     */
    this.lastActionTime = null;

    /**
     * The last visited shopping category
     */
    this.lastShopCategory = null;

    /**
     * Update last action time
     *
     * @param boolean force
     * @return int timestamp
     */
    this.updateLastActionTime = function(force)
    {
      // First time the last action time has to be enforced
      // upon successful login
      if (   !force
          && !plugin.lastActionTime)
      {
        return;
      }

      var date = new Date();
      plugin.lastActionTime = Math.round(date.getTime() / 1000);

      return plugin.lastActionTime;
    }

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

    // initialize logger
    try
    {
      // log levels
      this.GLOME_LOG_DEBUG = 1;
      this.GLOME_LOG_WARNING = 2;
      this.GLOME_LOG_ERROR = 3;
      this.GLOME_LOG_EXCEPTION = 4;
      this.console = (Cu.import("resource://gre/modules/devtools/Console.jsm", {})).console;
    }
    catch (e)
    {
      if (console)
      {
        this.console = console;
      }
      //alert(e);
    }

    /**
     * Return the current Glome ID
     *
     * return Glome ID
     */
    plugin.id = function()
    {
      if (! this.glomeid)
      {
        this.glomeid = this.pref('glomeid');
      }
      return this.glomeid;
    }

    /* !Debug */
    /**
     * Simple logging facility
     */
    plugin.Log =
    {
      log: function(message, level)
      {
        var date = new Date();
        var ts = date.toISOString();
        var enable = false;
        var prefix = ts + ' jGlome';

        switch (level)
        {
          case plugin.GLOME_LOG_DEBUG:
            enable = plugin.pref('debug');
            prefix += ' debug';
            break;
          case plugin.GLOME_LOG_DUMP:
            enable = true;
            prefix += ' dump';
            break;
          case plugin.GLOME_LOG_WARNING:
            enable = true;
            prefix += ' warning';
            break;
          case plugin.GLOME_LOG_ERROR:
            enable = true;
            prefix += ' error';
            break;
          case plugin.GLOME_LOG_EXCEPTION:
            enable = true;
            prefix += ' exception';
            break;
        }

        if (enable && plugin.console)
        {
          plugin.console.log(prefix + ': ' + message);
        }
        //date = ts = prefix = enable = null;
      },
      // simple text logger
      debug: function(message)
      {
        plugin.Log.log(message, plugin.GLOME_LOG_DEBUG);
      },
      // error logger
      error: function(message)
      {
        plugin.Log.log(message, plugin.GLOME_LOG_ERROR);
      },
      // warning logger
      warning: function(message)
      {
        plugin.Log.log(message, plugin.GLOME_LOG_WARNING);
      },
      // exception logger
      exception: function(message)
      {
        plugin.Log.log(message, plugin.GLOME_LOG_EXCEPTION);
      },
      // dump objects
      dump: function(object)
      {
        plugin.Log.log('', plugin.GLOME_LOG_DUMP);
        plugin.console.dir(object);
      }
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
       * Escape plain ampersands that are not HTML character references
       *
       * @param String str    Input string
       * @return String       Escaped string
       */
      escapeAmpersands: function(str)
      {
        if (!str)
        {
          return null;
        }

        return str.toString().replace(/&(?!([a-zA-Z0-9%$-_\.+!*'\(\),]+=|[#a-z0-9]+;))/g, '&amp;');
      },

      /**
       * Escape plain ampersands that are not HTML character references, recursively
       *
       * @param String str    Input string
       * @return String       Escaped string
       */
      escapeAmpersandsRecursive: function(input, level)
      {
        if (typeof level === 'undefined')
        {
          level = 0;
        }

        if (level > 10)
        {
          plugin.Log.warning('Too much of recursion in escapeAmpersandsRecursive');
          return null;
        }

        if (typeof input === 'string')
        {
          return plugin.Tools.escapeAmpersands(input);
        }
        else if (jQuery.isArray(input))
        {
          var tmp = [];
          for (var i = 0; i < input.length; i++)
          {
            tmp.push(plugin.Tools.escapeAmpersandsRecursive(input[i], level + 1));
          }
          return tmp;
        }
        else if (jQuery.isPlainObject(input))
        {
          var tmp = {};
          for (var i in input)
          {
            tmp[i] = plugin.Tools.escapeAmpersandsRecursive(input[i], level + 1);
          }
          return tmp;
        }

        return input;
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
      },

      /**
       * Add a listener to a context
       *
       * @param function listener      Listener function
       * @param string id              Listener id
       * @param string context         Listener context
       */
      addListener: function(listener, id, context)
      {
        if (typeof plugin[context] === 'undefined')
        {
          throw new Error('Trying to add a listener to undefined context');
        }

        if (typeof plugin[context].listeners === 'undefined')
        {
          throw new Error('Trying to add a listener to a restricted context');
        }

        if (typeof listener != 'function')
        {
          throw new Error('Glome.Ads.addListener requires a function as argument, when one is given');
        }

        if (!id)
        {
          id = 0;

          do
          {
            id++;
          }
          while (typeof plugin[context].listeners[id] !== 'undefined')
        }

        id = id.toString();

        plugin[context].listeners[id] = listener;
        return id;
      },

      /**
       * Remove a listener
       *
       * @param mixed listener
       * @param string context
       */
      removeListener: function(listener, context)
      {
        var i;

        if (typeof plugin[context] === 'undefined')
        {
          throw new Error('Trying to add a listener to undefined context');
        }

        if (typeof plugin[context].listeners === 'undefined')
        {
          throw new Error('Trying to add a listener to a restricted context');
        }

        if (typeof listener === 'function')
        {
          for (i in plugin[context].listeners)
          {
            if (plugin[context].listeners[i] === listener)
            {
              delete plugin[context].listeners[i];
            }
          }

          return true;
        }

        listener = listener.toString();

        if (typeof plugin[context].listeners[listener] !== 'undefined')
        {
          delete plugin[context].listeners[listener];
        }

        return true;
      },

      /**
       * Trigger context listeners
       *
       * @param string context
       */
      triggerListeners: function(context, type, t)
      {
        if (typeof plugin[context] === 'undefined')
        {
          throw new Error('Trying to add a listener to undefined context');
        }

        if (plugin[context].disableListeners)
        {
          return;
        }

        for (var i in plugin[context].listeners)
        {
          plugin[context].listeners[i].context = plugin.Categories;
          plugin[context].listeners[i](type, t);
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
     * Data storage backend when not using localStorage
     */
    plugin.setDataBackend = function(backend)
    {
        if (typeof backend.get !== 'function')
        {
          throw new Error('Method "get" is a requirement for data storage backend');
        }

        if (typeof backend.set !== 'function')
        {
          throw new Error('Method "set" is a requirement for data storage backend');
        }

        plugin.Data = backend;

        // Run initialization if applicable
        if (plugin.Data.init)
        {
          plugin.Data.init();
        }
    }

    if (this.options.dataBackend)
    {
      plugin.setDataBackend(this.options.dataBackend);
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
       * @param String name        Template name
       * @param boolean localize   Should the template be localized
       * @return jQuery DOM object
       */
      get: function(name, localize)
      {
        if (!name)
        {
          throw new Error('No template name defined');
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

        if (localize)
        {
          return this.parse(tmp, {});
        }

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

            // Remove references to future releases that already exist
            // on the template file
            part.find('.glome-future-releases').remove();

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

            var href = element.attr('href');

            if (href.substr(0, plugin.contentPrefix.length) !== plugin.contentPrefix)
            {
              element.attr('href', plugin.contentPrefix + href);
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
            url: plugin.contentPrefix + plugin.templateLocation,
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
        if (!data)
        {
          var data = {};
        }

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

        // Match only with single wrapping braces (i.e. "{...}"), double
        // braces are reserved for i18n library. JavaScript unfortunately
        // doesn't support negative lookbehind assertions on the go, so
        // we use *only* negative lookahead. Full regexp would be
        // /(?<!\{)\{([a-z0-9_]+)\}(?!\})/
        var matchMaker = new RegExp('\{([a-z0-9_]+)\}(?!\})');

        while (tmp.match(matchMaker))
        {
          var regs = tmp.match(matchMaker);
          var regexp = new RegExp(plugin.Tools.escape(regs[0]) + '(?!\})', 'g');
          var value = '‹«' + regs[1] + '»›';
          var key = regs[1];

          if (typeof data[key] !== 'undefined')
          {
            if (data[key] || typeof data[key] == 'number')
            {
              value = String(data[key]);
            }
            else
            {
              value = '';
            }
          }

          tmp = tmp.replace(regexp, value);
        }

        tmp = tmp.replace(/‹«([A-Za-z0-9_]+)»›/g, '{$1}');

        var div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        div.innerHTML = tmp;

        // Populate with i18n data
        if (   plugin.options.i18n
            && typeof plugin.options.i18n !== 'undefined'
            && jQuery(div).find('[data-i18n]').size())
        {
          jQuery(div).find('[data-i18n]')
            .each(function()
            {
              var str = jQuery(this).attr('data-i18n');
              var args = null;

              // Check for arguments
              if (jQuery(this).attr('data-i18n-arguments'))
              {
                try
                {
                  args = JSON.parse(jQuery(this).attr('data-i18n-arguments'));
                }
                catch (e)
                {
                  plugin.Log.warning(e, str);
                  args = null;
                }
              }

              try
              {
                var l10n = plugin.options.i18n.parse(str, args);

                if (jQuery(this).attr('placeholder'))
                {
                  jQuery(this).attr('placeholder', l10n);
                }
                else
                {
                  jQuery(this).text(l10n);
                }
              }
              catch (e)
              {
                plugin.Log.warning(e.message);
              }
            });
        }

        return jQuery(div).find('> *');
      }
    }

    /* !API */
    /**
     * Data access API
     */
    plugin.Api =
    {
      server: plugin.pref('api.server') || 'https://api.glome.me/',

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
        logout:
        {
          url: 'users/logout.json',
          allowed: ['read']
        },
        me:
        {
          url: 'users/{glomeid}.json',
          allowed: ['read', 'update', 'delete']
        },
        pair:
        {
          url: 'users/{pairid}.json',
          allowed: ['read']
        },
        categories:
        {
          url: 'adcategories.json',
          allowed: ['read']
        },
        subscriptions:
        {
          url: 'users/{glomeid}/adcategory/{subscriptionId}/{subscriptionStatus}.json',
          allowed: ['create']
        },
        adclick:
        {
          url: 'ads/{adId}/click/{glomeid}.json',
          allowed: ['read']
        },
        adnotnow:
        {
          url: 'ads/{adId}/notnow.json',
          allowed: ['create']
        },
        redeem:
        {
          url: 'users/{glomeid}/payments/redeem.json',
          allowed: ['read']
        },
        sync:
        {
          url: 'users/{glomeid}/sync.json',
          allowed: ['read', 'create']
        },
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

            case 'pairid':
              to = plugin.pairid;
              break;

            case 'subscriptionId':
              to = plugin.Categories.subscriptionId;
              break;

            case 'subscriptionStatus':
              to = plugin.Categories.subscriptionStatus;
              break;

            case 'adId':
              to = plugin.Ads.adId;
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
       * @param function callback      @optional Callback function
       * @param function onerror       @optional On error function
       * @param string method          @optional Request method (GET, POST, PUT, DELETE)
       * @param function beforesend    @optional Custom beforeSend function
       * @param function xhrfields     @optional Custom xhrFields data
       * @return jqXHR                 jQuery XMLHttpRequest
       */
      request: function(type, data, callback, onerror, method, beforesend, xhrfields)
      {
        if (arguments.length < 2)
        {
          throw new Error('Glome.Api.request expects at least two arguments');
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
          throw new Error('Glome.Api.request does not allow function as second argument for method "' + method + '"');
        }

        // Check for connection
        if (!plugin.online)
        {
          plugin.Log.warning('No Internet connection, impossible to do API calls');

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

        if (typeof beforesend === 'undefined')
        {
          var beforesend = plugin.options.beforeSend;
        }

        if (typeof xhrfields === 'undefined')
        {
          var xhrfields = plugin.options.xhrFields;
        }

        // Update the last action timestamp
        callback = plugin.Tools.mergeCallbacks(callback, function()
        {
          plugin.updateLastActionTime();
        });

        var parsedUrl = plugin.API.parseURL(plugin.API.server + this.types[type].url);

        var request = jQuery.ajax
        (
          {
            url: parsedUrl,
            data: data,
            type: method.toString(),
            dataType: 'json',
            xhrFields: xhrfields,
            beforeSend: beforesend,
            success: callback,
            error: onerror
          }
        );

        if (typeof request.settings === 'undefined')
        {
          request.settings = {};
        }

        request.settings.type = method.toString();
        request.settings.url = parsedUrl;

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
        if (plugin.pref('loggedin'))
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
            plugin.options.callback
          );
          return true;
        }

        if (!id)
        {
          id = plugin.id();
        }

        if (!id)
        {
          throw new Error('Glome ID not available');
        }

        if ( !id
            || !id.toString().match(/^[a-z0-9_]+$/))
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
            plugin.userData = data;
            plugin.pref('loggedin', true);

            // Enforce the last action time. This is a sign of a successful
            // login
            plugin.updateLastActionTime(true);

            try
            {
              var token = jqXHR.getResponseHeader('X-CSRF-Token');

              if (token)
              {
                plugin.sessionToken = token;
                plugin.pref('session.token', token);
                plugin.Log.debug('server provided X-CSRF-Token: ' + token);
              }

              if (! plugin.pref('standalone'))
              {
                var cookie = jqXHR.getResponseHeader('Set-Cookie').toString().replace(/;.+$/, '');

                if (cookie)
                {
                  plugin.cookie = cookie;
                  plugin.pref('session.cookie', cookie);
                  plugin.Log.debug('server provided Cookie: ' + cookie);
                }
              }

              plugin.Auth.getSyncCode(
                function(data)
                {
                  if (data[0])
                  {
                    plugin.Log.debug('code: ' + data[0].code);
                    if (data.length && data[0] && data[0].code)
                    {
                      plugin.syncCode = data[0].code
                    }
                  }
                },
                function()
                {
                  plugin.Log.debug('Error when trying to fetch open sync codes.');
                }
              );
            }
            catch (e)
            {
              plugin.Log.warning(e.message);
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

            plugin.pref('loggedin', false);
            plugin.sessionToken = '';
            plugin.pref('session.token', '');
            plugin.cookie = '';
            plugin.pref('session.cookie', '');

            plugin.Log.warning('Login error');
          },
          onerror
        );

        plugin.API.create
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
       * Logout current user
       *
       * @param integer a constant that might indicate why the logout was
       *                requested
       * @param function an optional callback that is executed after login
       *
       */
      logout: function(reason, callback)
      {
        var callbacks = plugin.Tools.mergeCallbacks
        (
          function()
          {
            plugin.lastActionTime = false;
            plugin.pref('loggedin', false);
            plugin.sessionToken = '';
            plugin.pref('session.token', '');
            plugin.cookie = '';
            plugin.pref('session.cookie', '');
          },
          callback
        );

        var onerror = function()
        {
          plugin.Log.warning('Logout error');
        };

        // Default error handling
        plugin.API.get
        (
          'logout',
          { reason: reason },
          callbacks,
          onerror
        );

        return true;
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
          throw new Error('Exceeded maximum number of times to create a Glome ID: ' + id);
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
      },

      /**
       * Queries full profile of the authenticated user
       * Sets the plugin.userData with the info received
       *
       * Fires glome.freshprofile upon completion
       *
       */
      getProfile: function()
      {
        if (! plugin.id())
        {
          throw new Error('Glome ID is not available');
        }

        var callback = function(data)
        {
          plugin.userData = data;
          jQuery('#glomeAdmin').trigger('profileupdate.glome');
          plugin.Log.debug('User profile received and event fired');
        }

        var onerror = function(data)
        {
          plugin.Log.debug('error:');
          plugin.Log.dump(data);
        }

        var request = plugin.API.read
        (
          'me',
          {},
          callback,
          onerror
        );
      },

      /**
       * Requests currently open sync code
       */
      getSyncCode: function(callback, onerror)
      {
        plugin.Log.debug('get open sync code');

        if (! plugin.glomeid)
        {
          throw new Error('Glome ID is not available');
        }

        plugin.API.read
        (
          'sync',
          {},
          callback,
          onerror
        );
      },

      /**
       * Requests a new sync code for pairing
       */
      createSyncCode: function(callback, onerror)
      {
        if (! plugin.glomeid)
        {
          throw new Error('Glome ID is not available');
        }

        plugin.API.request
        (
          'sync',
          {},
          callback,
          onerror,
          'POST'
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
      plugin.Prototype.listeners = {};

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
          }

          if (typeof plugin[container].listeners == 'undefined')
          {
            plugin[container].listeners = {};
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

            for (var i in o)
            {
              if (i === 'id')
              {
                i = '_id';
              }

              // Skip getters and setters
              if (   o.__lookupGetter__(i)
                  || o.__lookupSetter__(i))
              {
                continue;
              }

              try
              {
                this[i] = o[i];
              }
              catch (e)
              {
                plugin.Log.warning('Failed to copy ' + i);
              }
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
            this[i] = plugin.Tools.escapeAmpersandsRecursive(data[i]);
            //this[i] = data[i];
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
        plugin.Tools.triggerListeners(this.container, type, this)
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

        // Typecast to integer
        v = Number(v);

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
        return Number(this._id);
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
       * Selected ad. This is for enabling parsing of the action URL
       *
       * @param int
       */
      adId: 0,

      /**
       * Is ads updating in progress right now? This is to prevent flooding of onchange events
       *
       * @param boolean
       */
      disableListeners: false,

      /**
       * View states
       */
      states:
      {
        unread: 0,
        read: 1,
        visited: 2,
        ignore: -1
      },

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

        Ad.prototype.container = 'Ads';
        Ad.prototype.constructor = Ad;
        Ad.prototype.bonus = '';
        Ad.prototype.view_state = plugin.Ads.states.unread;

        /**
         * Default getter for property id. Validates the input.
         */
        Ad.prototype.__defineGetter__('bonusText', function(v)
        {
          var cashback = 'cashback';

          if (plugin.options.i18n)
          {
            cashback = plugin.options.i18n.parse(cashback);
          }

          if (   this.bonus_text
              && this.bonus_text !== 'missing')
          {
            return this.bonus_text;
          }
          else if (this.bonus_money != 0
              && this.bonus_percent != 0)
          {
            return this.bonus_money + ' e + ' + this.bonus_percent + ' % ' + cashback;
          }
          else if (this.bonus_money != 0)
          {
            return this.bonus_money + ' e ' + cashback;
          }
          else if (this.bonus_percent != 0)
          {
            return this.bonus_percent + ' % ' + cashback;
          }

          return '';
        });

        /**
         * Default getter for property id. Validates the input.
         */
        Ad.prototype.__defineGetter__('bonusTextShort', function(v)
        {
          if (this.bonus_money != 0
              && this.bonus_percent != 0)
          {
            return this.bonus_money + ' e + ' + this.bonus_percent + ' %';
          }
          else if (this.bonus_money != 0)
          {
            return this.bonus_money + ' e';
          }
          else if (this.bonus_percent != 0)
          {
            return this.bonus_percent + ' %';
          }

          return '';
        });

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

        // Aliases for category
        var cats = ['categories', 'adcategory', 'adcategories'];

        for (var i = 0; i < cats.length; i++)
        {
          var cat = cats[i];

          if (typeof filters[cat] !== 'undefined')
          {
            filters.category = filters[cat];
            delete filters[cat];
            break;
          }
        }

        if (   typeof filters.category !== 'undefined'
            && !jQuery.isArray(filters.category))
        {
          if (filters.category.toString().match(/^[0-9]+$/))
          {
            filters.category = [Number(filters.category)];
          }
          else
          {
            throw new Error('Glome.Ads.listAds requires category filter to be an integer or an array of integers');
          }
        }

        if (typeof filters.subscribed !== 'undefined')
        {
          var tmp = Object.keys(plugin.Categories.listCategories({subscribed: filters.subscribed}));

          // There is a category filter, get array intersect
          if (filters.category)
          {
            var intersect = [];

            for (var i = 0; i < filters.category.length; i++)
            {
              if (jQuery.inArray(filters.category[i], tmp) !== -1)
              {
                intersect.push(filters.category[i]);
              }
            }

            filters.category = intersect;
          }
          else
          {
            filters.category = tmp;
          }
        }

        var title = null;
        if (typeof filters['title'] !== 'undefined')
        {
          title = filters['title'];
        }

        // Loop through the ads and apply filters
        for (i in plugin.Ads.stack)
        {
          var ad = plugin.Ads.stack[i];
          var found = false;

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
                var tmp = filters;

                for (n = 0; n < filter.length; n++)
                {
                  if (!filter[n].toString().match(/^[0-9]+$/))
                  {
                    throw new Error('Glome.Ads.listAds requires ' + k + ' filter to be an integer or an array of integers');
                  }

                  for (var j = 0; j < ad[filterKey].length; j++)
                  {
                    if (ad[filterKey][j].id == filter[n])
                    {
                      if (title)
                      {
                        if (ad.title === title)
                        {
                          found = true;
                        }
                      }
                      else
                      {
                        found = true;
                      }
                      break;
                    }
                  }

                  if (found)
                  {
                    break;
                  }
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

              // Matching of the categories has already been done
              case 'subscribed':
                break;

              case 'view_state':
              case 'state':
                if (ad.view_state === filters[k])
                {
                  found = true;
                  break;
                }
                break;
              case 'title':
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

            // Temporarily store the listeners
            plugin.Ads.disableListeners = true;

            if (!data)
            {
              // @TODO: Display an error?
              return;
            }

            plugin.Ads.stack = {};
            for (var i = 0; i < data.length; i++)
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
       * @param function listener   Listerner function that should be added
       * @param string id           @optional listener ID for future referemce
       */
      addListener: function(listener, id)
      {
        return plugin.Tools.addListener(listener, id, 'Ads');
      },

      /**
       * Remove a listener
       *
       * @param function listener    Listerner function that should be removed
       * @return boolean
       */
      removeListener: function(listener)
      {
        return plugin.Tools.removeListener(listener, 'Ads');
      },

      /**
       * When stack changes, this method is triggered or when present, a function will be
       * registered to listeners list
       *
       * @param function listener    Listener function
       */
      onchange: function(type)
      {
        if (this.disableListeners)
        {
          return;
        }
        return plugin.Tools.triggerListeners('Ads', type);
      },

      /**
       * Redirects to an ad action URL
       *
       * @param id of the ad to be clicked
       */
      click: function(id)
      {
        if (typeof id !== 'number')
        {
          throw new Error('Ad id must be a valid integer');
        }

        // Set status as visited
        plugin.Ads.stack[id].view_state = plugin.Ads.states.visited;

        // must set this to be able to parse URL
        plugin.Ads.adId = id;

        return plugin.Api.read
        (
          'adclick',
          null,
          function(json)
          {
            plugin.Browser.openUrl(json.url);
          },
          null
        );
      },

      /**
       * Registers notnow action on an ad
       *
       * @param id of the ad to be clicked
       */
      notnow: function(id)
      {
        if (!id.toString().match(/^[1-9][0-9]*$/))
        {
          throw new Error('Ad id must be a valid integer');
        }
        id = parseInt(id);

        if (typeof plugin.Ads.stack[id] === 'undefined')
        {
          throw new Error('There is no ad with id ' + id);
        }

        // Set status as ignored
        plugin.Ads.stack[id].view_state = plugin.Ads.states.ignore;

        // must set this to be able to parse URL
        plugin.Ads.adId = id;

        return plugin.Api.create
        (
          'adnotnow',
          {
            user:
            {
              glomeid: plugin.id()
            }
          },
          null,
          null
        );
      }
    };

    /* !Categories */
    /**
     * Categories interface object
     *
     * Methods:
     *
     * Glome.Categories.load
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
      categoryId: 0,

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
        Category.prototype.subscribed = 1;

        // Category name
        Category.prototype.name = '';

        // Description
        Category.prototype.description = '';

        // Number of ads within this category
        Category.prototype.offers = 0;

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
            'off',
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

        if (   category.id
            && plugin.userData)
        {
          var categoryList = [];

          for (var i = 0; i < plugin.userData.disabled_adcategories.length; i++)
          {
            categoryList.push(plugin.userData.disabled_adcategories[i].id);
          }

          if (jQuery.inArray(category.id, categoryList) !== -1)
          {
            category.subscribed = 0;
          }
        }

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
                if (category[k] == filters[k])
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
       * @param function listener   Listerner function that should be added
       * @param string id           @optional listener ID for future referemce
       */
      addListener: function(listener, id)
      {
        return plugin.Tools.addListener(listener, id, 'Categories');
      },

      /**
       * Remove a listener
       *
       * @param function listener    Listerner function that should be removed
       * @return boolean
       */
      removeListener: function(listener)
      {
        return plugin.Tools.removeListener(listener, 'Categories');
      },

      /**
       * When stack changes, this method is triggered or when present, a function will be
       * registered to listeners list
       *
       * @param function listener    Listener function
       */
      onchange: function()
      {
        return plugin.Tools.triggerListeners('Categories');
      }
    };

    /* !Login */
    /**
     * Login sequence
     *
     * Methods:
     *
     * Glome.Login.go
     */
    plugin.Login =
    {
      /* performs a login */
      go: function()
      {
        plugin.Log.debug('called Login.go');

        plugin.MVC.run('Widget');
        jQuery('#glomeWidget').attr('data-state', 'loading');

        // ran when loggedin
        var onloggedin = plugin.Tools.mergeCallbacks
        (
          function()
          {
            plugin.Log.debug('load ads');
            plugin.Ads.load
            (
              function()
              {
                plugin.Log.debug('loaded ads');
                plugin.Log.debug('load categories');
                plugin.Categories.load(
                  function()
                  {
                    plugin.Log.debug('loaded categories');
                    plugin.Log.debug('update UI');
                    jQuery('#glomeWidget').attr('data-state', 'knock');
                    plugin.MVC.run('Widget');
                  }
                );
              },
              function()
              {
                // Failed to load the ads
                // @TODO: display an error?
              }
            );
          },
          plugin.options.callback
        );

        plugin.Log.debug('init login sequence');

        plugin.Auth.login
        (
          plugin.id(),
          '',
          onloggedin,
          function()
          {
            var onerrors = plugin.Tools.mergeCallbacks
            (
              function()
              {
                plugin.options.widgetContainer.removeAttr('hidden');
                plugin.MVC.run('RequirePassword');
              },
              plugin.options.onerror
            );

            plugin.Tools.triggerCallbacks(onerrors);
          }
        );
      }
    };

    /* !Heartbeat */
    /**
     * Heartbeat interface object
     *
     * Methods:
     *
     * Glome.Heartbeat.send
     */
    plugin.Heartbeat =
    {
      /**
       * Session state
       */
      alive: 'Hello!',

      /**
       * Heartbeat check
       *
       * @param mixed callback      Callback for successful load
       * @param mixed ad            ad to be displayed
       *
       */
      check: function(callback, ad)
      {
        plugin.Log.debug('heartbeat check');
        plugin.Tools.validateCallback(onerror);

        var onloggedout = function(data)
        {
          if (!data || data.message != plugin.Heartbeat.alive)
          {
            plugin.lastActionTime = false;
            plugin.Log.debug('heartbeat check noticed a terminated session');
            // report the reason of logout
            // 10: session time out
            plugin.Auth.logout(10, plugin.Login.go);
          }
          else
          {
            if (typeof data.earnings != 'undefined')
            {
              plugin.userData = data;
              plugin.Log.dump(data);
            }
          }
          return;
        };

        plugin.Log.debug('check heartbeat callback');
        if (callback && typeof callback != 'undefined')
        {
          var callbacks = plugin.Tools.mergeCallbacks
          (
            onloggedout,
            callback
          );
          plugin.Log.debug('merged heartbeat callbacks');
        }
        else
        {
          var callbacks = onloggedout;
        }

        var onerrors = function()
        {
          // redirect to login or start a new session
          plugin.pref('loggedin', false);
          plugin.Login.go();
          return;
        };

        // Request heartbeat
        plugin.Api.get
        (
          'login',
          null,
          callbacks,
          onerrors
        );
      },
    };

    /**
     * Stats
     */
    plugin.Statistics =
    {
      init: function()
      {
        if (plugin.stats == null)
        {
          plugin.Log.debug('statistics init start');
          plugin.stats = new Statistics();
          // selector of the raw data container
          plugin.rawdata = 'rawdata';
          // selector of the container to show stats
          plugin.placeholder = '#statistics';
          // request stats event
          plugin.getStatsEvent = new CustomEvent("statistics_get", {"detail": {"rawdata": plugin.rawdata}});
          plugin.Log.debug('statistics init end');
        }
      },
      /**
       * broadcast statistics_get event
       */
      get: function()
      {
        // add event listener
        plugin.Log.debug('getStatsEvent dispatch start');
        window.document.addEventListener('statistics_ready', plugin.Statistics.ready, true);
        window.document.dispatchEvent(plugin.getStatsEvent);
        plugin.Log.debug('getStatsEvent dispatch end');
      },
      /**
       * listen to statistics_ready event
       */
      ready: function(event)
      {
        plugin.Log.debug('statistics_ready listener start');
        // initialize stats drawing with our raw data
        plugin.Log.debug('graph placeholder: ' + plugin.placeholder);
        plugin.Log.debug('raw data placeholder: ' +  plugin.rawdata);
        plugin.Log.dump(jQuery('#' + plugin.rawdata).text());
        plugin.stats.init(plugin.placeholder, jQuery('#' + plugin.rawdata).text());
        plugin.Log.debug(1);
        // populate the since header
        var since = plugin.options.i18n.parse('stats since', [plugin.stats.firstRecord.humanTime]);
        plugin.Log.debug(2);
        jQuery(plugin.placeholder + ' .firstrecord').text(since);
        plugin.Log.debug(3);
        // display most visited stuff
        plugin.stats.mostVisited(plugin.placeholder + ' .mostvisited');
        plugin.Log.debug(4);
        // remove myself as a listener
        window.document.removeEventListener('statistics_ready', plugin.Statistics.ready, true);
        plugin.Log.debug('statistics_ready listener end');
      }
    };

    /* !MVC */
    /**
     * Sketch of MVC. @TODO: use backbone.js or something similar in the near future
     */
    plugin.MVC =
    {
      /**
       * Current context
       */
      currentContext: null,

      /**
       * Close Glome layout
       */
      closeLayers: function()
      {
        if (!plugin.options.container)
        {
          return;
        }

        plugin.options.container.find('[data-glome-template="public-wrapper"]').remove();
        plugin.options.container.attr('hidden', 'true');
      },

      /* !MVC Runner */
      run: function(route, args)
      {
        if (typeof plugin.MVC[route] !== 'function')
        {
          throw new Error('No route called "' + route.toString() + '"');
        }

        plugin.mvc = new plugin.MVC[route];

        if (typeof plugin.mvc.run !== 'undefined')
        {
          plugin.mvc.run(args);
          plugin.updateLastActionTime();
        }

        return plugin.mvc;
      },

      /* !MVC Prototype */
      Prototype: function()
      {
        var MVC = function()
        {
          // Model, default operations for all routes
          this.modelDefaults = function(args)
          {
            // There might never be need for this
          };

          // Model
          this.model = function(args)
          {
          };

          // View, default operations for all routes
          this.viewDefaults = function(args)
          {
            // There might never be need for this
          };

          // View
          this.view = function(args)
          {
          };

          // Controller, default operations for all routes
          this.controllerDefaults = function(args)
          {
            // Usability improvement: since focus itself doesn't empty the input fields,
            // remove placeholder text on focus and return them on blur
            if (   plugin.options.container
                && typeof plugin.options.container !== 'undefined')
            {
              // Allow to close on ESC
              jQuery(window)
                .off('keyup.glomeDefaults')
                .on('keyup.glomeDefaults', function(e)
                {
                  if (e.keyCode === 27)
                  {
                    var focus = false;

                    if (! plugin)
                    {
                      return;
                    }
                    var inputs = plugin.options.container.find('input, select, textarea');

                    for (var i = 0; i < inputs.size(); i++)
                    {
                      if (inputs.eq(i).is(':focus'))
                      {
                        // Reset the field if it is not a select
                        if (inputs.eq(i).get(0).tagName !== 'select')
                        {
                          inputs.eq(i).val('');
                          inputs.eq(i).trigger('blur');
                        }

                        focus = true;
                        break;
                      }
                    }

                    if (!focus)
                    {
                      plugin.MVC.closeLayers();
                      plugin.MVC.run('Widget');
                    }

                    return true;
                  }

                  return true;
                });

              plugin.options.container.find('input[placeholder]')
                .off('focus.glomeDefaults')
                .on('focus.glomeDefaults', function()
                {
                  if (!jQuery(this).attr('data-placeholder'))
                  {
                    jQuery(this).attr('data-placeholder', jQuery(this).attr('placeholder'));
                  }

                  jQuery(this).attr('placeholder', '');
                })
                .off('blur.glomeDefaults')
                .on('blur.glomeDefaults' ,function()
                {
                  if (jQuery(this).attr('data-placeholder'))
                  {
                    jQuery(this).attr('placeholder', jQuery(this).attr('data-placeholder'));
                  }
                });
            }
          };

          // Controller
          this.controller = function(args)
          {

          };

          // Triggers for context changes
          this.contextChange = function(args)
          {
            if (   plugin.MVC.currentContext
                && plugin.MVC.currentContext.contextChange
                && plugin.MVC.currentContext !== this)
            {
              plugin.MVC.currentContext.contextChange();
            }

            plugin.MVC.currentContext = this;
          };

          this.requireAuth = true;

          this.run = function(args)
          {
            this.contextChange(args);

            if (   this.requireAuth
                && !plugin.glomeid)
            {
              return false;
            }

            // Model the data
            try
            {
              if (!args)
              {
                args = {};
              }
              this.modelDefaults(args);
              this.model(args);
            }
            catch (e)
            {
              plugin.Log.warning(e.message);
              return false;
            }

            // Create views
            try
            {
              if (!args)
              {
                args = {};
              }
              this.viewDefaults(args);
              this.view(args);
            }
            catch (e)
            {
              plugin.Log.warning(e.message);
              return false;
            }

            // Set controllers
            try
            {
              if (!args)
              {
                args = {};
              }
              this.controllerDefaults(args);
              this.controller(args);
            }
            catch (e)
            {
              plugin.Log.warning(e.message);
              return false;
            }

            return true;
          }
        }
        return new MVC();
      },

      /* !MVC: Widget */
      Widget: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Prototype();
        mvc.prototype.widgetAd = null;
        mvc.prototype.requireAuth = false;

        mvc.prototype.model = function(args)
        {
          this.widgetAd = null;

          // If there is no widgetAd, use the last
          if (   args
              && args.adId)
          {
            try
            {
              this.widgetAd = new plugin.Ads.Ad(args.adId);
            }
            catch (e)
            {
              this.widgetAd = null;
            }
          }
          else if (!this.widgetAd)
          {
            var ads = Object.keys(plugin.Ads.listAds({subscribed: 1, view_state: plugin.Ads.states.unread}));

            if (ads.length)
            {
              var random = Math.floor(Math.random() * ads.length);
              var id = ads[random];
              this.widgetAd = plugin.Ads.stack[id];
            }
            else
            {
              this.widgetAd = null;
            }
          }
        }

        mvc.prototype.view = function(args)
        {
          // @TODO: For some reason the 'click' event bound in the controller starts to overflow
          // as jQuery off doesn't properly clean the events (or controller is called twice, who knows).
          // That is why the widget is removed completely and a new one is placed in stead. This causes
          // a very small footprint, but a footprint nevertheless and should be inspected "when
          // there is time"... ;)
          plugin.options.widgetContainer.find('[data-glome-template="widget"] > *').remove();
          this.widget = plugin.options.widgetContainer.find('[data-glome-template="widget"]');
          this.widget.attr('data-state', 'closed');

          // Reuse the old widget or create new
          if (!this.widget.size())
          {
            this.widget = plugin.Templates.populate('widget').appendTo(plugin.options.widgetContainer);

            this.widget.stopTime('ads');
            this.widget.stopTime('knock');

            // Refresh the ads
            this.widget
              .stopTime('ads')
              .everyTime(plugin.pref('api.refreshads') + 's', 'ads', function()
              {
                plugin.Log.debug('refresh Glome ads');
                plugin.Ads.load();
              });

            //~ this.widget
              //~ .stopTime('knock')
              //~ .everyTime(plugin.pref('knock') + 's', 'knock', function()
              //~ {
                //~ plugin.Log.debug('fire Glome knock');
                //~ if (jQuery(this).attr('data-state') === 'open')
                //~ {
                  //~ return;
                //~ }
//~
                //~ m.widgetAd = null;
                //~ m.run();
              //~ });

            this.widget
              .stopTime('butler')
              .everyTime(plugin.pref('butler') + 's', 'butler', function()
              {
                plugin.Log.debug('fire Glome butler');
                if (jQuery(this).attr('data-state') === 'open')
                {
                  return;
                }

                m.widgetAd = null;
                m.run();
                jQuery(this)
                  .off('mouseover.glome')
                  .on('mouseover.glome', function()
                  {
                    // Stop self closing timer if user reacts
                    jQuery(this).stopTime('butlerAutoClose');
                  })
                  .oneTime('5s', 'butlerAutoClose', function()
                  {
                    // Set to knock mode if the user doesn't react
                    jQuery(this).attr('data-state', 'knock');
                  })
                  .attr('data-state', 'open');
              });

            this.widget
              .stopTime('heartbeat')
              .everyTime(plugin.pref('api.heartbeat') + 's', 'heartbeat', function()
              {
                plugin.Heartbeat.check();
              });
          }
          else
          {
            plugin.Templates.populate('widget').find('> *').appendTo(this.widget);
          }

          if (this.widgetAd)
          {
            this.widget.find('.glome-ad-title').text(this.widgetAd.title);
            this.widget.find('.glome-ad-reward').text(this.widgetAd.bonusTextShort);
            this.widget.find('.glome-ad-logo img').attr('src', this.widgetAd.logo);
            this.widget.attr('data-knocking-ad', this.widgetAd.id);
            this.widget.attr('data-category', this.widgetAd.adcategories[0].id);
          }
          else
          {
            this.widget.attr('data-knocking-ad', '');
            this.widget.attr('data-category', '');
            this.widget.attr('data-state', 'closed');
            this.widget.find('.glome-ad-logo img').attr('src', '');
          }
        }

        mvc.prototype.controller = function(args)
        {
          jQuery(window).oneTime('50ms', function()
          {
            jQuery(window).trigger('resize.glome');
          });

          this.widget.find('[data-glome-mvc]')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run(jQuery(this).attr('data-glome-mvc'));
              return false;
            });

          // Open and close the widget. Closing widget hides always the knocking
          // until a new knock is initialized
          // We do a heartbeat check before opening the widget
          // TODO: log this event separately on the server for stats
          this.widget.find('#glomeWidgetIcon')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.Log.debug('widget clicked');

              if (jQuery(this).parent().attr('data-state') === 'open')
              {
                plugin.Log.debug('widget was open; close now');
                jQuery(this).parent().attr('data-state', 'closed');
              }
              else
              {
                // set anim
                jQuery('#glomeWidget').attr('data-state', 'loading');

                if (! plugin.lastActionTime)
                {
                  plugin.Log.debug('plugin.lastActionTime is false; run login');
                  plugin.Login.go();
                  return true;
                }

                if (plugin.mvc.widgetAd)
                {
                  plugin.Log.debug('widget was closed')

                  var callback = function()
                  {
                    if (plugin.lastActionTime)
                    {
                      plugin.Log.debug('running the heartbeat callback');
                      plugin.Log.debug('-> lastActionTime: ' + plugin.lastActionTime);
                      plugin.heartbeatAd.parent()
                        .attr('data-state', 'open')
                        .off('mouseover.glome')
                        .on('mouseover.glome', function()
                        {
                          jQuery(this).stopTime('widgetAutoclose');
                        })
                        .off('mouseout.glome')
                        .on('mouseout.glome', function()
                        {
                           jQuery(this).oneTime('3s', 'widgetAutoclose', function()
                          {
                             jQuery(this)
                              .off('mouseover.glome mouseout.glome')
                              .attr('data-state', 'closed');
                          });
                        });
                    }
                  };

                  // check if we have a working session
                  // if we do then open the widget
                  plugin.heartbeatAd = jQuery(this);
                  plugin.Log.debug('run heartbeat check with callback');
                  plugin.Heartbeat.check(callback);
                  plugin.Log.debug('ran heartbeat check');
                }
              }
          });

          this.widget.find('a')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run('ShowItem', {adId: jQuery(this).parents('[data-knocking-ad]').attr('data-knocking-ad'), forceCategory: jQuery(this).parents('[data-category]').attr('data-category')});
              return true;
            });
        }

        var m = new mvc();

        return m;
      },

      /* !MVC: CloseGlome */
      CloseGlome: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Prototype();
        mvc.prototype.requireAuth = false;

        mvc.prototype.model = function(args)
        {
          this.args =
          {
            reopen: plugin.pref('turnoff') + 's'
          }

          jQuery.extend(this.args, args);
          plugin.Log.debug(this.args);
        }

        mvc.prototype.view = function(args)
        {
          plugin.MVC.closeLayers();
          plugin.options.widgetContainer.attr('hidden', 'true');
        }

        mvc.prototype.controller = function(args)
        {
          // 9: reason of the logout is coffee break
          plugin.Auth.logout(9);
          var widget = plugin.options.widgetContainer.find('[data-glome-template="widget"]');
          widget.stopTime('heartbeat');

          var period = plugin.pref('turnoff').toString();
          alert(plugin.options.i18n.parse('start_coffee_break', [period]));

          plugin.Log.debug(plugin.options.i18n.parse('start_coffee_break', [period]));

          if (this.args.reopen)
          {
            jQuery(plugin.options.container)
              .oneTime(this.args.reopen, 'glomeReopen', function()
              {
                plugin.Login.go();
              });
          }
        }

        var m = new mvc();

        return m;
      },

      /* !MVC Public */
      Public: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Prototype();

        // Prototype for initializing a view
        mvc.prototype.viewInit = function()
        {
          plugin.options.container.removeAttr('hidden');
          plugin.options.container.find('> *').remove();

          plugin.options.container.find('[data-glome-template="admin-wrapper"]').remove();
          var wrapper = plugin.options.container.find('[data-glome-template="public-wrapper"]');

          if (!wrapper.size())
          {
            var wrapper = plugin.Templates.populate('public-wrapper')
              .appendTo(plugin.options.container);
          }

          if (!wrapper.find('[data-glome-template="public-header"]').size())
          {
            var header = plugin.Templates.populate('public-header');
            header.find('.glome-close')
              .off('click.glome')
              .on('click.glome', function()
              {
                plugin.MVC.closeLayers();
                plugin.MVC.run('Widget');
              });

            header.appendTo(wrapper);
          }

          if (!wrapper.find('[data-glome-template="public-footer"]').size())
          {
            var footer = plugin.Templates.populate('public-footer').appendTo(wrapper);
          }

          if (!wrapper.find('[data-glome-template="public-content"]').size())
          {
            plugin.Templates.populate('public-content').insertAfter(wrapper.find('[data-glome-template="public-header"]'));
          }

          this.contentArea = wrapper.find('[data-glome-template="public-content"]').find('[data-context="glome-content-area"]');
          this.contentArea.find('> *').remove();
        }

        // Initialize default controllers
        mvc.prototype.controllerInit = function(args)
        {
          jQuery(window).trigger('resize.glome');

          plugin.options.container.find('[data-glome-mvc]')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run(jQuery(this).attr('data-glome-mvc'));
              return false;
            });

          plugin.options.container.find('.force-reload')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.Ads.load(function()
              {
                alert('Loaded total of ' + plugin.Ads.count() + ' ads');
              });
              return false;
            });
        }

        // Set default controller
        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
        }

        var m = new mvc();

        return m;
      },

      /* !MVC: Require password */
      RequirePassword: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.requireAuth = false;
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-requirepassword');

          this.content.appendTo(this.contentArea);
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          var request = null;

          this.contentArea.find('#glomePublicRequirePasswordContainer').find('button')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.options.container.find('#glomePublicRequirePasswordContainer').trigger('submit');
              return false;
            });

          this.contentArea.find('#glomePublicRequirePasswordContainer')
            .off('submit.glome')
            .on('submit.glome', function(e)
            {
              plugin.Log.debug('password submitted; close dialog');
              // close the big view
              plugin.options.container.find('.glome-close').trigger('click');
              // make the loader as knock background
              jQuery('#glomeWidget').attr('data-state', 'loading');

              request = plugin.Auth.login
              (
                plugin.id(),
                jQuery(this).find('input[type="password"]').val(),
                function()
                {
                  plugin.Log.debug('async fetching ads');
                  plugin.Ads.load(function()
                  {
                    // take away loader from the knock
                    jQuery('#glomeWidget').attr('data-state', 'knock');
                    plugin.MVC.run('Widget');
                  });
                  plugin.Log.debug('async loading categories');
                  plugin.Categories.load();
                  plugin.pref('loggedin', true);
                },
                function()
                {
                  alert('Login failed due to wrong password');
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
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-startup');

          this.content.appendTo(this.contentArea);
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          this.content.find('#glomePublicFirstRunProceed')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunSubscriptions');
            });

          this.content.find('a.glome-skip')
            .off('click.glome')
            .on('click.glome', function()
            {
              plugin.options.container.find('.glome-close').trigger('click');
            });
        }

        var m = new mvc();

        return m;
      },

      /* !First run: subscriptions */
      FirstRunSubscriptions: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-subscriptions', {count: plugin.Categories.count(), selected: plugin.Categories.count({subscribed: 1})});
          this.content.appendTo(this.contentArea);

          for (var i in plugin.Categories.stack)
          {
            var row = this.contentArea.find('.glome-category[data-category="' + plugin.Categories.stack[i].id + '"]');

            if (!row.size())
            {
              var row = plugin.Templates.populate('category-row', plugin.Categories.stack[i]);
              row.appendTo(this.contentArea.find('.glome-categories'));
            }

            if (plugin.Categories.stack[i].subscribed)
            {
              row.find('button.glome-subscribe').attr('data-state', 'on');
            }
            else
            {
              row.find('button.glome-subscribe').attr('data-state', 'off');
            }
          }
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          this.contentArea.find('.glome-subscribe')
            .on('click.glome', function()
            {
              var id = jQuery(this).parents('[data-glome-category]').attr('data-glome-category');
              var changeCount = function()
              {
                var count = plugin.Categories.count({subscribed: 1});
                plugin.options.container.find('.glome-current').text(count);
              }

              if (plugin.Categories.stack[id].subscribed)
              {
                jQuery(this).attr('data-state', 'off');
                plugin.Categories.stack[id].unsubscribe(changeCount);
              }
              else
              {
                jQuery(this).attr('data-state', 'on');
                plugin.Categories.stack[id].subscribe(changeCount);
              }

              plugin.Categories.onchange('subscriptions');
            });

          this.contentArea.find('.glome-pager .glome-navigation-button.left')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunInitialize');
            });

          this.contentArea.find('.glome-pager .glome-navigation-button.right')
            .on('click.glome', function()
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
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function()
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-password');

          this.content.appendTo(this.contentArea);
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          this.contentArea.find('.glome-pager .glome-navigation-button.left')
            .off('click.glome')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunSubscriptions');
            });

          this.contentArea.find('.glome-pager .glome-navigation-button.right')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunFinish');
            });

          // Set the password if requested for
          plugin.options.container.find('#glomePublicSetPassword')
            .on('submit.glome', function(e)
            {
              var pw1 = jQuery(this).find('input[type="password"]').eq(0).val();
              var pw2 = jQuery(this).find('input[type="password"]').eq(1).val();

              if (pw1 !== pw2)
              {
                alert('Passwords do not match');
              }
              else if (!pw1)
              {
                plugin.options.container.find('#glomePublicPassword').find('.glome-navigation-button.right').trigger('click');
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
                    plugin.options.container.find('#glomePublicPassword').find('.glome-navigation-button.right').trigger('click');
                  }
                );
              }

              return false;
            });

          plugin.options.container.find('#glomePublicSetPassword').find('button')
            .on('click.glome', function()
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
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();
        mvc.prototype.view = function(args)
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-finish');

          this.content.appendTo(this.contentArea);
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          this.content.find('#glomePublicFinishClose')
            .on('click.glome', function()
            {
              plugin.options.container.find('.glome-close').trigger('click');
            });

          this.content.find('a.glome-settings')
            .off('click.glome')
            .on('click.glome', function()
            {
              plugin.options.container.find('.glome-close').trigger('click');
              plugin.MVC.run('AdminProfile');
              return false;
            });
        }

        var m = new mvc();

        return m;
      },

      /* !Public: Show an ad with new layout */
      ShowItem: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();

        mvc.prototype.model = function(args)
        {
          if (!args)
          {
            // Display the first ad if no other was requested
            args =
            {
              adId: Object.keys(plugin.Ads.stack)[0]
            }
          }

          if (args.adId)
          {
            this.ad = new plugin.Ads.Ad(args.adId);
          }
          else if (args.constructor.name === 'Ad')
          {
            this.ad = args;
          }

          if (args.forceCategory)
          {
            this.category = new plugin.Categories.Category(args.forceCategory);
          }
          else
          {
            this.category = new plugin.Categories.Category(this.ad.adcategories[0]);
          }
          // preserve the shopping category for navigation purposes
          plugin.lastShopCategory = this.category.id;
          plugin.Ads.adId = parseInt(args.adId);
          plugin.Categories.categoryId = this.category.id;

          this.more_from_brand = plugin.Ads.listAds({subscribed: 1, title: this.ad.title});
        }

        mvc.prototype.view = function(args)
        {
          var vars =
          {
            name: this.category.name,
            title: this.ad.title,
            description: this.ad.description,
            advertiser: this.ad.advertiser,
            bonus: this.ad.bonusText,
            bonustextshort: this.ad.bonusTextShort,
            id: this.ad.id,
            category: this.category.id,
            content: this.ad.content
          }

          this.viewInit();
          this.content = plugin.Templates.populate('public-item', vars);
          this.content.find('.glome-ad-image').get(0).src = this.ad.content;
          this.content.appendTo(this.contentArea);

          this.content.find('.more-from-brand > .ad').remove();

          // hide things if there are no more ads from this brand
          if (Object.keys(this.more_from_brand).length <= 1)
          {
            this.content.find('.more-from-brand').prev().hide();
            this.content.find('.more-from-brand').hide();
          }
          else
          {
            for (var i in this.more_from_brand)
            {
              var ad = this.more_from_brand[i];
              if (ad.id === this.ad.id)
              {
                continue;
              }
              jQuery.extend(ad, {category: this.category.id});
              var row = plugin.Templates.populate('more-from-brand', ad);
              row.find('img').attr('src', ad.content);
              row.appendTo(this.content.find('.more-from-brand'));
            }
          }
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);

          // show shop
          this.content.find('.glome-to-shop')
            .on('click.glome', function(e)
            {
              var categoryId = jQuery(this).parents('[data-category-id]').attr('data-category-id');
              plugin.MVC.run('ShowShop', {categoryId: categoryId});
              return false;
            });

          this.content.find('.glome-ad-image, .glome-goto-ad')
            .on('click.glome', function(e)
            {
              plugin.Ads.click(plugin.mvc.ad.id);
              plugin.options.container.find('.glome-close').trigger('click');
              return false;
            });

          this.content.find('.glome-notnow-ad')
            .on('click.glome', function(e)
            {
              plugin.Ads.notnow(plugin.Ads.adId);
              plugin.options.container.find('.glome-to-shop').trigger('click');
              return false;
            });

          // click handler for ads from same brand
          this.content.find('.more-from-brand .ad')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run('ShowItem', {adId: jQuery(this).attr('data-ad-id'), forceCategory: Number(jQuery(this).attr('data-category-id'))});
              return false;
            });
        }

        var m = new mvc();

        return m;
      },

      /* !Public: Show categories and ads */
      ShowShop: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Public();

        mvc.prototype.model = function(args)
        {
          if (   plugin.lastShopCategory
              && ! args.categoryId)
          {
            args.categoryId = plugin.lastShopCategory;
          }

          if (!args.categoryId)
          {
            args.categoryId = Object.keys(plugin.Categories.stack)[0];
          }
          // preserve the shopping category for navigation purposes
          plugin.lastShopCategory = args.categoryId;

          this.category = new plugin.Categories.Category(args.categoryId);
          this.ads = plugin.Ads.listAds({category: Number(args.categoryId)});
          this.category.offers = plugin.Ads.count({category: Number(args.categoryId)});
        }

        mvc.prototype.view = function(args)
        {
          this.viewInit();
          this.content = plugin.Templates.populate('public-shop'); //, this.category);
          this.content.appendTo(this.contentArea);

          // Populate categories to the shop nav
          this.content.find('#glomePublicShop .nav .glome-category').remove();

          for (var i in plugin.Categories.listCategories({subscribed: 1}))
          {
            var category = plugin.Categories.stack[i];
            var row = plugin.Templates.populate('nav-category-list-row', category).appendTo(this.content.find('.nav'));
          }

          // Display ads
          this.content.find('.ad-list > .ad').remove();

          for (var i in this.ads)
          {
            var ad = this.ads[i];
            var vars =
            {
              id: ad.id,
              category: args.categoryId,
              title: ad.title,
              bonus: ad.bonusText,
              content: ad.content
            }

            var row = plugin.Templates.populate('shop-ad', vars);
            row.find('img').attr('src', ad.content);
            row.appendTo(this.content.find('.ad-list'));
          }
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);

          this.content.find('.ad .module')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run('ShowItem', {adId: jQuery(this).parents('[data-ad-id]').attr('data-ad-id'), forceCategory: Number(jQuery(this).parents('[data-category-id]').attr('data-category-id'))});
              return false;
            });

          this.content.find('.nav').find('li.glome-category')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run('ShowShop', {categoryId: jQuery(this).attr('data-category-id')});
              return false;
            });
        }

        var m = new mvc();

        return m;
      },

      /* */
      Navigation: function()
      {
        function mvc()
        {

        }

        mvc.prototype = new plugin.MVC.Prototype();
        mvc.prototype.view = function(args)
        {
          if (   !args.header
              || !args.header.size())
          {
            return;
          }

          var nav = args.header.find('.glome-navigation');
          if (!nav.size())
          {
            var nav = plugin.Templates.populate('navigation-container');
            nav.insertAfter(args.header.find('.glome-icon'));
          }

          var items =
          {
            Profile:
            {
              mvc: 'AdminProfile',
              children:
              {
                Profile:
                {
                  mvc: 'AdminProfile',
                }
              }
            },
            Statistics:
            {
              mvc: 'AdminStatistics',
              children:
              {
                Statistics:
                {
                  mvc: 'AdminStatistics',
                },
              }
            },
            Rewards:
            {
              mvc: 'AdminRewards',
              children:
              {
                Rewards:
                {
                  mvc: 'AdminRewards',
                },
              }
            },
            Settings:
            {
              mvc: 'AdminSettings',
              children:
              {
                Settings:
                {
                  mvc: 'AdminSettings',
                },
              }
            }
          }

          for (var i in items)
          {
            var li = nav.find('> [data-page="' + i.toLowerCase() + '"]');

            if (!li.size())
            {
              var li = plugin.Templates.populate('navigation-item');
              li.find('a')
                .attr('href', items[i].mvc)
                .text(i);
              li
                .attr('data-page', i.toLowerCase())
                .attr('data-glome-mvc', items[i].mvc)
                .appendTo(nav);
            }

            if (items[i].children)
            {
              var subnav = plugin.Templates.populate('subnavigation-container').appendTo(li);

              for (var n in items[i].children)
              {
                var child = items[i].children[n];

                var subli = subnav.find('> [data-glome-mvc="' + child.mvc + '"]');

                if (!subli.size())
                {
                  var subli = plugin.Templates.populate('subnavigation-item')
                    .attr('data-glome-mvc', child.mvc)
                    .appendTo(subnav);

                }
                subli.find('> a')
                  .attr('href', '#' + child.mvc)
                  .text(n);
              }
            }
          }

          nav.find('a')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              try
              {
                plugin.MVC.run(jQuery(this).parent().attr('data-glome-mvc'));
              }
              catch (e)
              {
                plugin.Log.warning('Navigation failed due to ' + e.toString());
              }

              return false;
            });

          if (args.selected)
          {
            var sel = nav.find('[data-glome-mvc="' + args.selected + '"]');

            sel.each(function()
            {
              sel.addClass('selected');
              sel.siblings().removeClass('selected');

              sel.parents('li').addClass('selected');
              sel.parents('li').siblings().removeClass('selected');
            });
          }
        }

        var m = new mvc();
        return m;
      },

      /* !MVC Admin */
      Admin: function()
      {
        //
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Prototype();

        // Prototype for initializing a view
        mvc.prototype.viewInit = function(args)
        {
          plugin.options.container.find('> *').remove();

          var wrapper = plugin.options.container.find('[data-glome-template="admin-wrapper"]');

          if (!wrapper.size())
          {
            var wrapper = plugin.Templates.populate('admin-wrapper')
              .appendTo(plugin.options.container);
          }

          var header = wrapper.find('[data-glome-template="admin-header"]');
          if (!header.size())
          {
            var header = plugin.Templates.populate('admin-header');
            header.find('.glome-close')
              .off('click.glome')
              .on('click.glome', function()
              {
                plugin.options.container.find('[data-glome-template="admin-wrapper"]').remove();
                plugin.MVC.run('Widget');
              });

            header.appendTo(wrapper);
          }

          var selected = args.selected || '';
          plugin.MVC.run('Navigation', {header: header, selected: selected});

          if (!wrapper.find('[data-glome-template="admin-footer"]').size())
          {
            plugin.Templates.populate('admin-footer').appendTo(wrapper);
          }

          if (!wrapper.find('[data-glome-template="admin-content"]').size())
          {
            plugin.Templates.populate('admin-content').insertAfter(wrapper.find('[data-glome-template="admin-header"]'));
          }

          this.contentArea = wrapper.find('[data-glome-template="admin-content"]').find('[data-context="glome-content-area"]');
          this.contentArea.find('> *').remove();
        }

        mvc.prototype.controllerInit = function(args)
        {
          jQuery(window).trigger('resize.glome');

          plugin.options.container.find('[data-glome-mvc]')
            .off('click.glome')
            .on('click.glome', function(e)
            {
              plugin.MVC.run(jQuery(this).attr('data-glome-mvc'));
              return false;
            });
        }

        var m = new mvc();

        return m;
      },

      /* !MVC: Admin Profile */
      AdminProfile: function()
      {
        function mvc()
        {
        }

        var admin = new plugin.MVC.Admin();

        mvc.prototype = new plugin.MVC.FirstRunSubscriptions();
        mvc.prototype.viewInit = admin.viewInit;

        mvc.prototype.view = function(args)
        {
          if (!args)
          {
            args = {}
          }

          args.selected = 'AdminProfile';

          this.viewInit(args);
          this.content = plugin.Templates.populate('admin-profile', {count: plugin.Categories.count(), selected: plugin.Categories.count({subscribed: 1})});
          this.content.appendTo(this.contentArea);

          this.content.find('.glome-category').remove();

          for (var i in plugin.Categories.stack)
          {
            var row = this.contentArea.find('.glome-category[data-category="' + plugin.Categories.stack[i].id + '"]');

            if (!row.size())
            {
              var row = plugin.Templates.populate('category-row', plugin.Categories.stack[i]);
              row.appendTo(this.contentArea.find('.glome-categories'));
            }

            // Ensure that the ID is there
            row.attr('data-glome-category', i);

            if (plugin.Categories.stack[i].subscribed)
            {
              row.find('button.glome-subscribe').attr('data-state', 'on');
            }
            else
            {
              row.find('button.glome-subscribe').attr('data-state', 'off');
            }
          }
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);

          this.contentArea.find('.glome-subscribe')
            .on('click.glome', function()
            {
              var id = jQuery(this).parents('[data-glome-category]').attr('data-glome-category');
              var changeCount = function()
              {
                var count = plugin.Categories.count({subscribed: 1});
                plugin.options.container.find('.glome-current').text(count);
              }

              if (plugin.Categories.stack[id].subscribed)
              {
                jQuery(this).attr('data-state', 'off');
                plugin.Categories.stack[id].unsubscribe(changeCount);
              }
              else
              {
                jQuery(this).attr('data-state', 'on');
                plugin.Categories.stack[id].subscribe(changeCount);
              }

              plugin.Categories.onchange('subscriptions');
            });

          this.contentArea.find('.glome-pager .glome-navigation-button.left')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunInitialize');
            });

          this.contentArea.find('.glome-pager .glome-navigation-button.right')
            .on('click.glome', function()
            {
              plugin.MVC.run('FirstRunPassword');
            });
        }

        var m = new mvc();
        return m;
      },

      /* !MVC: Admin statistics */
      AdminStatistics: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Admin();

        mvc.prototype.view = function(args)
        {
          if (!args)
          {
            args = {}
          }

          args.selected = 'AdminStatistics';

          this.viewInit(args);
          this.content = plugin.Templates.populate('admin-statistics', {});
          this.content.appendTo(this.contentArea);

          var self = this;

          // get data about each paired user
          if (plugin.userData.children.length)
          {
            jQuery.each(plugin.userData.children, function(index, value)
            {
              if (value.pair)
              {
                plugin.pairid = value.pair.glomeid;
                // fetch profile of pair which contains the footprint
                // and put all to one container
                plugin.Api.get
                (
                  'pair',
                  {},
                  function(data)
                  {
                    plugin.pairs[value.pair.glomeid] = data;
                    plugin.Log.debug('added: ' + plugin.pairs[value.pair.glomeid]);

                    var row = self.contentArea.find('.pair-row[data-glome-pair="' + value.pair.glomeid + '"]');

                    if (! row.size())
                    {
                      var row = plugin.Templates.populate('admin-pair-row', data);
                      row.appendTo(self.contentArea.find('#glomeAdminStatisticsPairs'));
                    }

                    plugin.Log.debug('Pair: ' + value.pair.glomeid + ' has ' + Object.keys(plugin.pairs[value.pair.glomeid]['histories']).length + ' history item(s)');

                    for (var index in plugin.pairs[value.pair.glomeid]['histories'])
                    {
                      var item = plugin.pairs[value.pair.glomeid]['histories'][index];
                      var historyrow = plugin.Templates.populate('admin-history-row', item);
                      historyrow.appendTo(self.contentArea.find('.pair-row[data-glome-pair="' + value.pair.glomeid + '"] .rows'));
                    }
                  },
                  null
                );

                plugin.Log.debug('paired with ' + value.pair.glomeid);
              }
            });
          }
          else
          {
            plugin.Log.debug('This user has no pairs');
          }

          // now fill the templates
          //~ for (var glomeid in plugin.pairs)
          //~ {
            //~ var row = this.contentArea.find('.pair-row[data-glome-pair="' + glomeid + '"]');
//~
            //~ if (! row.size())
            //~ {
              //~ var row = plugin.Templates.populate('admin-pair-row', plugin.pairs[glomeid]);
              //~ row.appendTo(this.contentArea.find('#glomeAdminStatisticsPairs'));
            //~ }
//~
            //~ plugin.Log.debug('Pair: ' + glomeid + ' has ' + Object.keys(plugin.pairs[glomeid]['histories']).length + ' history items');
//~
            //~ for (var index in plugin.pairs[glomeid]['histories'])
            //~ {
              //~ var item = plugin.pairs[glomeid]['histories'][index];
              //~ var historyrow = plugin.Templates.populate('admin-history-row', item);
              //~ historyrow.appendTo(this.contentArea.find('.rows'));
            //~ }
          //~ }
        }

        mvc.prototype.controller = function(args)
        {
          var self = this;

          this.controllerInit(args);

          plugin.Statistics.get();
        }

        var m = new mvc();
        return m;
      },

      /* !MVC: Admin rewards */
      AdminRewards: function()
      {
        function mvc()
        {
        }

        mvc.prototype = new plugin.MVC.Admin();

        mvc.prototype.view = function(args)
        {
          if (!args)
          {
            args = {}
          }

          args.selected = 'AdminRewards';

          this.viewInit(args);
          this.content = plugin.Templates.populate('admin-rewards', {});
          this.content.appendTo(this.contentArea);
          this.content.find('.admin-rewards-row').remove();
        }

        mvc.prototype.controller = function(args)
        {
          var c = '';
          var row = '';
          var data = {};
          var rewards = false;

          var self = this;

          this.controllerInit(args);

          var parseEarning = function(array, container, redeem)
          {
            var rows = container.find('.rows');

            for (var currency in array)
            {
              data.currency = currency;
              var amount = Number(array[currency] / 100).toFixed(2);
              var splitted = amount.toString().split('.');

              data.full = Number(splitted[0]);
              data.decimal = splitted[1];

              plugin.Log.debug('amount (number): ' + amount);
              plugin.Log.debug('data.full (number): ' + data.full);
              plugin.Log.debug('data.decimal (string): ' + data.decimal);

              if (array[currency] > 0)
              {
                rewards = true;
                row = plugin.Templates.populate('admin-rewards-row', data);

                if (! parseInt(data.decimal))
                {
                  row.find('.decimal-separator, .decimal').remove();
                }

                rows.append(row);

                if (redeem)
                {
                  var button = plugin.Templates.populate('admin-redeem-button');
                  rows.append(button);
                }
              }
            }

            if (rewards)
            {
              container.find('h3').removeClass('glome-hidden');
            }
          }

          var callback = function(self)
          {
            self.content.find('.glome-rewards .rows').empty();

            if (   plugin.userData
                && plugin.userData.earnings)
            {
              // parse all fresh earnings
              if (   plugin.userData.earnings.fresh
                  && Object.keys(plugin.userData.earnings.fresh).length > 0)
              {
                c = self.content.find('.glome-rewards.fresh');
                parseEarning(plugin.userData.earnings.fresh, c, true);
              }
              // parse all pending earnings
              if (   plugin.userData.earnings.pending
                  && Object.keys(plugin.userData.earnings.pending).length > 0)
              {
                c = self.content.find('.glome-rewards.pending');
                parseEarning(plugin.userData.earnings.pending, c, true);
              }
              // parse all paid earnings
              if (   plugin.userData.earnings.paid
                  && Object.keys(plugin.userData.earnings.paid).length > 0)
              {
                c = self.content.find('.glome-rewards.paid');
                parseEarning(plugin.userData.earnings.paid, c, false);
              }
            }

            if (rewards)
            {
              self.content.find('.glome-total-rewards').removeClass('glome-hidden');
              self.content.find('.glome-earned-rewards .glome-button').removeClass('glome-hidden');
              self.content.find('.glome-earned-rewards .none').addClass('glome-hidden');
            }
            else
            {
              self.content.find('.glome-total-rewards').addClass('glome-hidden');
              self.content.find('.glome-earned-rewards .glome-button').addClass('glome-hidden');
              self.content.find('.glome-earned-rewards .none').removeClass('glome-hidden');
            }
          }

          // set event listeners
          jQuery('#glomeAdmin')
            .off('profileupdate.glome')
            .on('profileupdate.glome', function(event)
            {
              callback(self);
              self.content.find('.glome-button.redeem').click(function()
              {
                plugin.Log.debug('redeem click');
                var redeemOk = function(data)
                {
                  var feedback = jQuery('.glome-earned-rewards .feedback')
                    .hide()
                    .text('');

                  switch (data.status)
                  {
                    case 0:
                      plugin.Log.debug('ok:');
                      plugin.Log.dump(data);
                      plugin.Auth.getProfile();
                      plugin.options.container.find('.glome-close').trigger('click');
                      plugin.Browser.openUrl(data.url);
                      break;
                    case 1:
                      plugin.Log.debug('not ok: ' + data.message);
                      feedback.fadeIn('1000', function() {
                        feedback.text(data.message);
                      })
                      break;
                  }
                };

                var redeemFail = function(data)
                {
                  plugin.Log.debug('error:');
                  plugin.Log.dump(data);
                };

                var request = plugin.API.read
                (
                  'redeem',
                  {},
                  redeemOk,
                  redeemFail
                );
              });
            });

          plugin.Auth.getProfile();
        }

        var m = new mvc();
        return m;
      },

      /* !MVC: Admin statistics */
      AdminSettings: function()
      {
        function mvc()
        {

        }

        mvc.prototype = new plugin.MVC.Admin();

        mvc.prototype.view = function(args)
        {
          if (!args)
          {
            args = {}
          }

          args.selected = 'AdminSettings';

          this.viewInit(args);
          this.content = plugin.Templates.populate('admin-settings', {});
          this.content.appendTo(this.contentArea);

          // fetch sync code
          plugin.Auth.getSyncCode(
            function(data)
            {
              plugin.Log.debug('code: ' + data[0].code);

              if (data.length && data[0] && data[0].code)
              {
                plugin.syncCode = data[0].code
                jQuery('#glomeAdminSettingsPairDevices').find('button').hide();
                jQuery('#glomeAdminSettingsPairDevices').find('input.code1').val(plugin.syncCode.substr(0, 4));
                jQuery('#glomeAdminSettingsPairDevices').find('input.code2').val(plugin.syncCode.substr(4, 4));
                jQuery('#glomeAdminSettingsPairDevices').find('input.code3').val(plugin.syncCode.substr(8, 4));
              }
            },
            function()
            {
              plugin.Log.debug('Error when trying to fetch open sync codes.');
            }
          );
        }

        mvc.prototype.controller = function(args)
        {
          this.controllerInit(args);
          this.content.find('#glomeAdminSettingsChangePassword').find('button')
            .off('click')
            .on('click', function(e)
            {
              var old = jQuery(e.target).parent().find('input.old').val();
              var pw1 = jQuery(e.target).parent().find('input.pw1').val();
              var pw2 = jQuery(e.target).parent().find('input.pw2').val();

              if (pw1.length < 6)
              {
                alert('Password is too short, it should be over 6 characters');
                return false;
              }

              if (pw1 !== pw2)
              {
                alert('Passwords do not match');
                return false;
              }

              plugin.Auth.setPassword
              (
                pw1,
                pw2,
                old,
                function()
                {
                  alert('Your password was changed successfully');
                  plugin.MVC.run('AdminSettings');
                },
                function(jqXHR)
                {
                  alert('Password change failed');
                }
              )
            });

          // password reset
          this.content.find('#glomeAdminSettingsChangePassword').find('.remove-password')
            .off('click')
            .on('click', function(e)
            {
              var old = jQuery(e.target).parent().find('input.old').val();

              plugin.Auth.setPassword
              (
                '',
                '',
                old,
                function()
                {
                  alert('The password protection was removed from your profile. We advise you to set a new password as soon as possible.');
                  plugin.MVC.run('AdminSettings');
                },
                function(jqXHR)
                {
                  alert('Failed to remove password protection.');
                }
              )
            });

          // pair Glome IDs
          this.content.find('#glomeAdminSettingsPairDevices').find('button')
            .off('click')
            .on('click', function(e)
            {
              e.preventDefault();

              plugin.Auth.createSyncCode
              (
                function(data)
                {
                  jQuery(e.target).hide();

                  jQuery(e.target).parent().find('input.code1').val(data.code.substr(0, 4));
                  jQuery(e.target).parent().find('input.code2').val(data.code.substr(4, 4));
                  jQuery(e.target).parent().find('input.code3').val(data.code.substr(8, 4));
                },
                function(jqXHR)
                {
                  plugin.Log.error('Did not receive a pairing code.');
                }
              )
            });
        }

        var m = new mvc();
        return m;
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
    plugin.initialize = function(options)
    {
      jQuery.extend(plugin.options, defaults, options);

      plugin.Tools.validateCallback(plugin.options.callback);
      plugin.Tools.validateCallback(plugin.options.onerror);

      if (plugin.options.container)
      {
        jQuery(plugin.options.container).stopTime('glomeReopen');

        this.Templates.load(function()
        {
          // Wrap the containers with jQuery
          plugin.options.container = jQuery(plugin.options.container);

          if (plugin.options.widgetContainer)
          {
            plugin.options.widgetContainer = jQuery(plugin.options.widgetContainer);
          }
          else
          {
            plugin.options.widgetContainer = plugin.options.container;
          }
        });
      }

      if (plugin.options.server)
      {
        plugin.pref('api.server', plugin.options.server);
      }

      if (plugin.options.idPrefix)
      {
        plugin.idPrefix = plugin.options.idPrefix;
      }

      // Create a new Glome ID if previous ID does not exist
      if (!plugin.id())
      {
        // TODO: improve the Glome ID generation
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
            plugin.Statistics.init();
          },
          plugin.options.callback
        );
        this.Auth.createGlomeId(plugin.idPrefix + String(date.getTime()), callbacks, plugin.options.onerror);
      }
      else
      {
        this.firstrun = false;
        plugin.Login.go();
        plugin.Statistics.init();
      }

      // add event listener for shutdown
      window.document.addEventListener(
        'jglome_shutdown',
        function(e)
        {
          // stop all timers
          plugin.Log.debug('jglome_shutdown received');
          jQuery('div#glomeWidget')
            .stopTime('butler')
            .stopTime('ads')
            .stopTime('knock')
            .stopTime('heartbeat');
          plugin.Log.debug('all timers stopped');
          plugin = null;
        },
        true
      );

      return true;
    };

    if (this.options.container)
    {
      return plugin.initialize();
    }
  };
}(jQuery)