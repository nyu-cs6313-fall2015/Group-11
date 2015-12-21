$(document).ready(function(){
  $("#filters").on("hide.bs.collapse", function(){
    $(".filter").html('<span class="glyphicon glyphicon-collapse-down"></span> Filters');
  });
  $("#filters").on("show.bs.collapse", function(){
    $(".filter").html('<span class="glyphicon glyphicon-collapse-up"></span> Hide Filters');
  });

  $("#howto").on("hide.bs.collapse", function(){
    $(".howTo").html('<span class="glyphicon glyphicon-collapse-down"></span> How To Read The Visualization');
  });
  $("#howto").on("show.bs.collapse", function(){
    $(".howTo").html('<span class="glyphicon glyphicon-collapse-up"></span> Hide How To Read The Visualization');
  });

  // var $myGroup = $('#myGroup');
  // $myGroup.on('show','.collapse', function() {
  //     $myGroup.find('.collapse.in').collapse('hide');
  // });

});
