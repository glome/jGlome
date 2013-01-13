/**
 * This file is just to provide some rudimentary clickable functionality to
 * Glome template
 */
jQuery(function()
{
  'use strict';
  
  // Set the default view
  if (!window.location.hash.match(/#.+/))
  {
    window.location.hash = '#admin-subscriptions';
  }
  
  jQuery('#glomeAdminContent').find('[data-template="admin-subscriptions"] .glome-row').eq(0).cloneTimes(15);
  jQuery('#glomeAdminContent').find('[data-template="admin-rewards"] .glome-row').eq(0).cloneTimes(15);
  
  jQuery('.glome-button[data-state]')
    .on('click', function(e)
    {
      if (jQuery(this).attr('data-state') === 'on')
      {
        jQuery(this).attr('data-state', 'off');
      }
      else
      {
        jQuery(this).attr('data-state', 'on');
      }
    });
  
  jQuery('[data-template="admin-subscriptions"] .glome-button[data-state]')
    .on('click', function(e)
    {
      var total = jQuery(this).parents('.glome-content').find('.glome-button[data-state]').size();
      var on = jQuery(this).parents('.glome-content').find('.glome-button[data-state="on"]').size();
      
      jQuery('#glomeAdminSubscriptions').find('.glome-counter .glome-current').text(on);
      jQuery('#glomeAdminSubscriptions').find('.glome-counter .glome-max').text(total);
    });
  jQuery('[data-template="admin-subscriptions"] .glome-button[data-state]').eq(0).trigger('click');
  
  jQuery(window)
    .on('hashchange', function()
    {
      var hash = window.location.hash.toString().replace(/#/, '');
      var context = (hash.match(/admin/)) ? 'admin' : 'window';
      var page = hash.replace(/(admin|ad)-/, '');
      
      // Toggle main context
      jQuery('[data-context="' + context + '"]').siblings().addClass('hidden');
      jQuery('[data-context="' + context + '"]').removeClass('hidden');
      
      // Toggle context page
      jQuery('[data-context="' + context + '"]').find('#glomeAdminContent > .glome-full-width > .glome-content').not('[data-template="' + hash + '"]').addClass('hidden');
      jQuery('[data-context="' + context + '"]').find('#glomeAdminContent > .glome-full-width > .glome-content').filter('[data-template="' + hash + '"]').removeClass('hidden');
      
      // Toggle navigation selected item
      jQuery('[data-context="' + context + '"]').find('> .glome-header').find('[data-page="' + page + '"]').addClass('selected');
      jQuery('[data-context="' + context + '"]').find('> .glome-header').find('[data-page="' + page + '"]').siblings().removeClass('selected');
    })
    .trigger('hashchange');
  
});

jQuery.fn.cloneTimes = function(times)
{
  for (var i = 0; i < Number(times); i++)
  {
    var cloned = jQuery(this).clone(false);
    cloned.insertAfter(jQuery(this));
  }
}