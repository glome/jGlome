/**
 * This file is just to provide some rudimentary clickable functionality to
 * Glome template
 */
jQuery(function()
{
  // Set the default view
  if (!window.location.hash.match(/#.+/))
  {
    window.location.hash = '#admin-subscriptions';
  }
  
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