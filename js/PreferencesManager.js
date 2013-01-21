/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PreferencesManager(branch_name, callback)
{
  // Keeping a reference to the observed preference branch or it will get
  // garbage collected.
  this._prefService = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);

  this._branch = this._prefService.getBranch(branch_name);
  this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  this._callback = callback;

  this.prefList = [];

  this.initialized = false;
  this.disableObserver = false;
  this.privateBrowsing = false;

    // Initialize prefs list
  var defaultPrefs = this._branch.getChildList("", {});
  var types = {};
  types[this._branch.PREF_INT] = "Int";
  types[this._branch.PREF_BOOL] = "Bool";

  for each (var name in defaultPrefs)
  {
    var type = this._branch.getPrefType(name);
    var typeName = (type in types ? types[type] : "Char");

    try
    {
      var pref = [name, typeName, this._branch["get" + typeName + "Pref"](name)];

      this.prefList.push(pref);
      this.prefList[" " + name] = pref;
    }
    catch(e)
    {
      console.log('Exception while getting the default preferences:\n' + e + '\n');
    }
  }

  // Initial prefs loading
  this.reload();

  console.log('init done. prefList:\n' + this.prefList + '\n');
}

PreferencesManager.prototype.observe = function(subject, topic, data)
{
  switch (topic)
  {
    case 'nsPref:changed':
      this._callback(this._branch, data);
      break;
    case 'profile-after-change':
      this.init();
      this.initialized = true;
      break;
    case 'profile-before-change':
      if (this.initialized)
      {
        //filterStorage.saveToDisk();
        this.initialized = false;
      }
      break;
    case 'private-browsing':
      if (prefName == "enter")
      {
        this.privateBrowsing = true;
      }
      else if (prefName == "exit")
      {
        this.privateBrowsing = false;
      }
      break;
  }
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PreferencesManager.prototype.register = function(trigger)
{
  this._branch.addObserver('', this, false);

  if (trigger)
  {
    var that = this;
    this._branch.getChildList('', {}).forEach(
      function (pref_leaf_name)
      {
        that._callback(that._branch, pref_leaf_name);
      }
    );
  }
};

PreferencesManager.prototype.unregister = function()
{
  if (this._branch)
  {
    this._branch.removeObserver('', this);
  }
}

/**
 * Get URL with API server prepended if the URL is not with protocol or
 * if it isn't protocol relative
 */
PreferencesManager.prototype.getUrl = function(url)
{
  // Check if the URL has protocol or is protocol relative
  if (url.match(/^([a-z]+:)?\/\//i))
  {
    return url;
  }

  // Otherwise add domain with protocol
  return this['api.server'].replace(/\/$/, '') + '/' + url.replace(/^\//, '');
};

PreferencesManager.prototype.get = function(pref)
{
  return this[pref];
};

// Saves a property of the object into the corresponding pref
PreferencesManager.prototype.savePref = function(pref)
{
  try
  {
    this._branch["set" + pref[1] + "Pref"](pref[0], this[pref[0]]);
  }
  catch (e)
  {
    console.log('Exception while setting a preference:\n' + e + '\n');
  }
};

// Saves the changes back into the prefs
PreferencesManager.prototype.save = function()
{
  this.disableObserver = true;

  for each (var pref in this.prefList)
  {
    this.savePref(pref);
  }

  this.disableObserver = false;

  // Make sure to save the prefs on disk (and if we don't - at least reload the prefs)
  try
  {
    this._prefService.savePrefFile(null);
  }
  catch(e)
  {
    console.log('Exception while saving preferences:\n' + e + '\n');
  }

  this.reload();
};

// Reloads the preferences
PreferencesManager.prototype.reload = function() {
  // Load data from prefs.js
  for each (var pref in this.prefList)
    this.loadPref(pref);
};

// Loads a pref and stores it as a property of the object
PreferencesManager.prototype.loadPref = function(pref)
{
  try
  {
    this[pref[0]] = this._branch["get" + pref[1] + "Pref"](pref[0]);
  }
  catch (e)
  {
    // Use default value
    this[pref[0]] = pref[2];
  }
};
