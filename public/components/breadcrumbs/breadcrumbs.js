'use strict';

(function() {
  var mainApp = 'juice';
  var moduleName = 'breadcrumbs';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('BreadcrumbsService', ['ProgramValueService', BreadcrumbsService]).
      directive('breadcrumbs', ['BreadcrumbsService', '$location', breadcrumbs]);

  function BreadcrumbsService(ProgramValueService){
    var service = {

      show_breadcrumbs:true,
      breadcrumb_list:[],
      hide:function(){
        service.show_breadcrumbs = false;
      },
      show:function(){
        service.show_breadcrumbs = true;
      },
      getList:function(){
        return service.breadcrumb_list;
      },
      updateList:function(list){
        ProgramValueService.runAfterLoaded(function(programValues){

          var siteParent = programValues.breadcrumbs.site_parent;
          if(!siteParent.program_name_added_to_text) {
            if((siteParent.text !== 'College for America') && (!siteParent.program_name)){
              siteParent.program_name = 'ERROR: Program name must be set';
            }
            if (siteParent.program_name) {
              siteParent.text += ' - ' + siteParent.program_name;
            }
            siteParent.program_name_added_to_text = true;//prevent this from happening twice
          }
          programValues.breadcrumbs.site.link = "/juice/";
          var base_list = [
            siteParent,
            programValues.breadcrumbs.site
          ];
          service.breadcrumb_list.length = 0;
          var updated_list = base_list.concat(list);
          updated_list.forEach(function(el){
            service.breadcrumb_list.push(el);
          });
        });
      },
      appendUniqueToList:function(element){
        //if an array of elements is passed, then run this function on each of those elements
        if(element instanceof Array){
          var elements = element;
          elements.forEach(function(element){
            service.appendUniqueToList(element);
          });
          return;
        }else {
          //check to see if element is already in breadcrumb list, and if not, add it
          var match_found = false;
          service.breadcrumb_list.forEach(function (list_element) {
            if (list_element.link == element.link) {
              console.log('url already used', list_element.link, element.link, element);
              match_found = true;
            }
          });
          if (!match_found) {
            service.breadcrumb_list.push(element);
          }
        }
      }
    };
    service.updateList([]);
    return service;
  }

  function breadcrumbs(BreadcrumbsService, $location) {
    return {
      templateUrl:'/components/breadcrumbs/breadcrumbs.html'+hashAppend,
      link:function breadcrumbsLink($scope, element, attrs){
        $scope.server_instance = paramsFromServer.server_instance;
        $scope.service = BreadcrumbsService;
        $scope.breadcrumb_list = BreadcrumbsService.breadcrumb_list;
        $scope.location = $location;
      }
    };
  }
})();