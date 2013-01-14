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
    window.location.hash = '#public-startup';
  }
  
  var select = jQuery('<select />')
    .on('change', function()
    {
      window.location.hash = '#' + jQuery(this).val();
    })
    .attr('id', 'glomeTemplateSwitch')
    .prependTo('body')
    .css
    (
      {
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 20000
      }
    );
  
  var pages = jQuery('[data-page]');
  
  for (var i = 0; i < pages.size(); i++)
  {
    var page = pages.eq(i).attr('data-page');
    var context = pages.eq(i).parents('[data-glome-container]').attr('data-context');
    
    var option = jQuery('<option />')
      .attr('value', context + '-' + page)
      .text(context + ': ' + page)
      .appendTo(select);
  }
  
  jQuery('#glomeAdminContent').find('[data-template="admin-subscriptions"] .glome-row').eq(0).cloneTimes(15);
  jQuery('#glomeAdminContent').find('[data-template="admin-rewards"] .glome-row').eq(0).cloneTimes(15);
  jQuery('#glomePublicContent').find('[data-template="public-subscriptions"] .glome-row').eq(0).cloneTimes(15);
  jQuery('#glomePublicContent').find('[data-template="public-category"] .glome-row').eq(0).cloneTimes(15);
  jQuery('#glomePublicContent').find('[data-template="public-categorylist"] .glome-row').eq(0).cloneTimes(15);
  
  jQuery('.glome-close')
    .on('click', function()
    {
      window.location.hash = '#widget';
    });
  
  jQuery('#glomePublicFinish').find('button')
    .on('click', function()
    {
      window.location.hash = '#widget-widget';
    });
  
  jQuery('.glome-pager button')
    .on('click', function()
    {
      var context = jQuery(this).parents('[data-glome-container]').attr('data-context');
      
      if (jQuery(this).hasClass('left'))
      {
        var page = jQuery(this).parents('[data-page]').prev().attr('data-page');
      }
      else
      {
        var page = jQuery(this).parents('[data-page]').next().attr('data-page');
      }
      
      window.location.hash = '#' + context + '-' + page;
    });
  
  jQuery('.glome-button[data-state]')
    .on('click', function(e)
    {
      if (jQuery(this).attr('data-state-change') === 'false')
      {
        return true;
      }
      
      if (jQuery(this).attr('data-state') === 'on')
      {
        jQuery(this).attr('data-state', 'off');
      }
      else
      {
        jQuery(this).attr('data-state', 'on');
      }
    });
  
  jQuery('#glomePublicStartup').find('.glome-button')
    .off('click')
    .on('click', function()
    {
      window.location.hash = '#public-subscriptions';
    });
  
  jQuery('[data-template="admin-subscriptions"], [data-template="public-subscriptions"]').find('.glome-button[data-state]')
    .on('click', function(e)
    {
      var total = jQuery(this).parents('.glome-content').find('.glome-button[data-state]').size();
      var on = jQuery(this).parents('.glome-content').find('.glome-button[data-state="on"]').size();
      
      jQuery(this).parents('.glome-content').find('.glome-selection-counter .glome-current').text(on);
      jQuery(this).parents('.glome-content').find('.glome-selection-counter .glome-max').text(total);
    });
  
  jQuery('[data-template="admin-subscriptions"], [data-template="public-subscriptions"]').find('.glome-button[data-state]:first').trigger('click');
  
  jQuery('#glomeWidget')
    .on('click', function()
    {
      if (jQuery(this).attr('data-state') == 'knock')
      {
        jQuery(this).attr('data-state', 'open');
      }
      else
      {
        jQuery(this).attr('data-state', 'knock');
      }
    });
  
  jQuery(window)
    .on('hashchange', function()
    {
      var hash = window.location.hash.toString().replace(/#/, '');
      var regs = hash.match(/(admin|public|widget)/);
      
      if (!regs)
      {
        return;
      }
      
      var regexp = new RegExp(regs[1] + '-');
      var context = regs[1];
      var page = hash.replace(regexp, '');
      
      jQuery('#glomeTemplateSwitch').find('option[value="' + context + '-' + page + '"]').attr('selected', 'selected').siblings().removeAttr('selected');
      
      // Toggle main context
      jQuery('[data-context="' + context + '"]').siblings().addClass('hidden');
      jQuery('[data-context="' + context + '"]').removeClass('hidden');
      
      // Toggle context page
      jQuery('[data-context="' + context + '"]').find('#glomeAdminContent, #glomePublicContent, #glomeWidgetContent').find('[data-context="glome-content-area"] > .glome-content').not('[data-template="' + hash + '"]').addClass('hidden');
      jQuery('[data-context="' + context + '"]').find('#glomeAdminContent, #glomePublicContent, #glomeWidgetContent').find('[data-context="glome-content-area"] > .glome-content').filter('[data-template="' + hash + '"]').removeClass('hidden');
      
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