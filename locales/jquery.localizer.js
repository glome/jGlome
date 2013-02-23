jQuery(function()
{
  jQuery('table thead input[type="checkbox"]')
    .on('change', function()
    {
      var lang = jQuery(this).attr('value');
      
      if (jQuery(this).is(':checked'))
      {
        jQuery(this).parents('table').find('[lang="' + lang + '"]').addClass('hidden');
      }
      else
      {
        jQuery(this).parents('table').find('[lang="' + lang + '"]').removeClass('hidden');
      }
    });
});