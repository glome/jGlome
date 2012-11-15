/**
 * Glome Inc GUI plugin for jQuery
 */
;(jQuery)
{
  var version = '0.1a';
  
  /**
   * Methods for the DOM operations
   * 
   * @var Object
   */
  var methods =
  {
    init: function(options)
    {
      return true;
    },
  };
  
  /**
   * Glome DOM operations glue
   * 
   * @param string method    Operation method
   * @param object options   Options set
   */
  jQuery.fn.glome = function(method, options)
  {
    if (typeof methods[method] == 'undefined')
    {
      throw new Error('Undefined method: ' + method);
    }
    
    return true;
  }
  
  /**
   * Glome master class, which is responsible for all of the non-DOM interactions
   */
  jQuery.Glome = function()
  {
    var plugin = this;
    var _template = null;
    
    jQuery.ajax
    (
      {
        url: 'template.html',
        context: this,
        dataType: 'html',
        isLocal: true,
        success: function(data)
        {
          this._template = jQuery(data);
          var tmp = data;
          var elements = [];
          
          while (regs = tmp.match(/(<link.+?>)/))
          {
            var regexp = new RegExp(regs[1]);
            tmp = tmp.replace(regexp, '');
            
            elements.push(jQuery(regs[1]));
          }
          
          for (var i = 0; i < elements.length; i++)
          {
            var element = elements[i];
            
            // Not related to Glome, no need to add
            if (!element.attr('data-glome'))
            {
              continue;
            }
            
            if (!jQuery('head').find('link[href="' + element.attr('href') + '"]').size())
            {
              jQuery('head').append(element);
            }
          }
        },
      }
    );
    
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
      
      // @TODO: typecasting
      
      var storage = JSON.parse(window.localStorage.getItem(key));
      
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
      
      var tmp = this._template.filter('#' + name);
      
      if (!tmp.size())
      {
        tmp = this._template.find('#' + name);
      }
      
      if (!tmp.size())
      {
        throw new Error('No template with name ' + name + ' found');
      }
      
      return tmp;
    }
    
    plugin.api = function()
    {
      
    }
  }
}(jQuery)