/**
 * Set up environment for Rhino
 */
load('http://code.jquery.com/qunit/qunit-git.js');
QUnit.init();
QUnit.config.blocking = false;
QUnit.config.autorun = true;
QUnit.config.updateRate = 0;
QUnit.log = function(result, message)
{
  print(result ? 'PASS' : 'FAIL', message);
}

// Load Rhino environment
load('js/tests/env.rhino.1.2.js');

// Load jQuery
load('https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js');

// Load jGlome
load('js/jquery.glome.js');

// Load and run tests
load('js/tests/jGlomeTest.js');
