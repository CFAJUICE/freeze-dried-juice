(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'home';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, ['juice.progress', 'dashboard.directives', 'juice.treenav']).
      config(['$stateProvider', routerConfig]).
      factory('HomeService', ['ResourceHelperService', 'UserService', HomeService]).
	  controller('DashboardCtrl', ['$scope', '$stateParams', 'UserService', 'BreadcrumbsService', 'HomeService', 'ProgressService', '$location', '$state', 'TreeNavService', DashboardCtrl]);

  function routerConfig($stateProvider) {
    $stateProvider.state({
      name: "home",
      url: '/', 
      //templateUrl: '/components/home/home.html',
      templateUrl: '/components/dashboard/dashboard.html'+hashAppend,
      //controller: HomeCtrl
	  controller: DashboardCtrl
    }).
    state({
          name: "homePreview",
          url: '/preview',
          templateUrl: '/components/home/home.html'+hashAppend,
          //controller: HomeCtrl
    }).
	state({
          name: "dashboard",
          url: '/dashboard',
          templateUrl: '/components/dashboard/dashboard.html'+hashAppend,
          controller: DashboardCtrl
    }).
		  state({
		  name: "dashboard.coaches",
          url: '/dashboardcoaches',
          templateUrl: '/components/dashboard/dashboardcoaches.html'+hashAppend
          //controller: DashboardCtrl
			  
    }).
	state({
		  name: "dashboard.goals",
          url: '/dashboardgoals',
          templateUrl: '/components/dashboard/dashboardgoals.html'+hashAppend
          //controller: DashboardCtrl
			  
    }).
	state({
		  name: "dashboard.modules",
          url: '/dashboardmodules',
          templateUrl: '/components/dashboard/dashboardmodules.html'+hashAppend
          //controller: DashboardCtrl
			  
    }).
		state({
		  name: "dashboard.recents",
          url: '/dashboardrecents',
          templateUrl: '/components/dashboard/dashboardrecents.html'+hashAppend
          //controller: DashboardCtrl
			  
    });
  }

    function HomeService(ResourceHelperService, UserService) {
        var out = ResourceHelperService.createResources({
            getModulesFromS3: {
                url: configs.file_path + UserService.getProgramPath() + 'modules.txt',  // !PM to add support for Programs
                method: 'GET',
                params: {module_id: '@module_id'},
                isArray: true
            }
        });
        out.getModules = function (callback) {
            if (paramsFromServer.preview_data) {
                var modules = paramsFromServer.preview_data;
                delete paramsFromServer.preview_data;
                callback(modules);
            } else {
                out.getModulesFromS3(callback);
            }
        }
        return out;
    }

    function removeHiddenModules(modules) {
      var out = [];
	  modules.forEach(function(module){
         if(module.hide_from_dashboard=="1"){
            return;//continue to next module
         } else {
			var new_module = jQuery.extend(true, {}, module);  
            out.push(new_module);
	     }
      });
      return out;  
	}

/*
     function splitModulesByCompetencies(modules, dashboardFlag){
      var out = [];
      modules.forEach(function(module){
        if(module.hide_from_dashboard=="1"){
          return;//continue to next module
        }
		var i = 0;
        module.competencies.forEach(function(comp){
          var new_module = jQuery.extend(true, {}, module);
          if (!dashboardFlag) new_module.competencies = [comp];
          if (dashboardFlag) {
             if (i==0) out.push(new_module);  //remove duplicate modules if on dashboard page (vs old home page)
		  } else {
             out.push(new_module);
		  }
		  i++;
        });
      });
	  //console.log("Modules", out);
      return out;
    }
*/

    function addModuleIcons(modules, programPath){
      modules.forEach(function(module){
          var module_id = module.id.split('.')[0];
          module.icon = configs.file_path + module_id + '/module.png';
          module.program_icon = configs.file_path + programPath + module_id + '/module.png';
      });
      return modules;
    }

    function processModules(modules, $scope, dashboardFlag, programPath){ //dashboardFlag true for new style dashboard!
      //modules = splitModulesByCompetencies(modules, dashboardFlag);
	  modules = removeHiddenModules(modules);
      modules = addModuleIcons(modules, programPath);
      modules = modules.sort(function(obj1, obj2) {
        return parseInt(obj1.dashboard_order) - parseInt(obj2.dashboard_order);
      });
      $scope.modules = modules;
    }
 
    function sortModulesByGP(modules, $scope) {
       //make list of unique Goals
	  var goals = {};
      modules.forEach(function(module){  
        if(module.hide_from_dashboard=="1"){
            return;//continue to next module
        }
        //--if (!goals[module.goal])  goals[module.goal] = {}; 
		 //add to list of unique projects for this goal
		 var moduleGoal = module.goal; 
		 for (var i=0; i < module.projects.length ; i++ ) { 
		   var projectGoals = [];
		   projectGoals.push(module.projects[i].goal ? module.projects[i].goal : moduleGoal) 
		   projectGoals.forEach(function(projectGoal) {
			   var name = module.projects[i].name;
			   if (!goals[projectGoal])  goals[projectGoal] = {};
			   var dashboard_order = module.projects[i].dashboard_order;
			   if (!goals[projectGoal][name]) goals[projectGoal][name] = {"dashboard_order":dashboard_order}; //[] --was goals[module.goal][name]
			   if (!goals[projectGoal][name]["module_list"]) goals[projectGoal][name]["module_list"] = []; //[]    --was goals[module.goal][name]
			   goals[projectGoal][name]["module_list"].push(module.id); //--was goals[module.goal][name]
		   });
		}
      });
	  //reformat to return arrays
	  var i = 0;
	  var out = [];
	  $.each(goals, function(key, value){
		 var tmp = [];
		 var j = 0;
		 $.each(value, function(k, v) {
           tmp.push({projectName:k, modules:v.module_list, dashboard_order:v.dashboard_order});
		   j++;
		 });
		 tmp = tmp.sort(function(obj1, obj2) {
            return parseInt(obj1.dashboard_order) - parseInt(obj2.dashboard_order);
         });
		 out.push(tmp);
		 out[i]['name']= key;
		 i++;
	  });
      $scope.modulesByGP = out.sort(function(obj1, obj2) {
		          if ([obj1.name, obj2.name].sort()[0] ==  obj1.name) {
                        return -1;
		          } else {
                        return 1;
                  }
	        });	   
      //console.log("GOALS", out);
	}
    
	

  function DashboardCtrl($scope, $stateParams, UserService, BreadcrumbsService, HomeService, ProgressService, $location, $state, TreeNavService) {
	var WEEK = 604800000; //604800000 ms = 1 week
	var MONTH = WEEK / 7 * 30;
	$scope.common = {};
	$scope.showTitle = false;
	$scope.common.anyprojectExpandedFlag = false;
	$scope.$location = $location;
    $scope.getProgress = ProgressService.getProgress;
	$scope.getTooltip = ProgressService.getTooltip;
	$scope.timeSpentHM = ProgressService.cumulativeTimeHM;
    $scope.roles = UserService.getRoles();
	$scope.user = UserService.getUser();
    $scope.isStudent = true;
	$scope.keyboardNav = false;
    var not_student_roles = ['Coach', 'Reviewer', 'Educator'];
    if(not_student_roles.indexOf($scope.roles)===-1){
      $scope.isStudent = false;
    }
   
    $("#skiplink").attr("href","#tab-modules");
	$("#pagetitle").html("JUICE Home");
	$("#pagetitle").focus();


    function generateModuleTree(tree, modules) {
       //var tree = new Tree();
	   for (var i=0; i<modules.length; i++ ) {
		   var node = TreeNavService.newNode(modules[i].id, i+1);
		   node.parent = tree.root;
		   node.parent.children[i] = node;
		   for (var j=0; j<modules[i].modulettes.length; j++ ){
             if(modules[i].modulettes[j].hide_from_dashboard == "0") {
               var k = parseInt(modules[i].modulettes[j].order) - 1;  //not quite right!
			   var child = TreeNavService.newNode(modules[i].modulettes[j].id.replace(/\./g, "_"), k+1);
			   child.parent = node;
			   node.children[k] =  child;
             }
		   }
	   }
	   tree.current = tree.root.children[0];
	   return tree;
	}



    $scope.getRecentAndDuration = ProgressService.getRecentAndDuration;

    $scope.treeItemId = function(id) {
       if(id) return id.replace(/\./g, "_");
	}
	
    $scope.moduleRecentlyVisited = function(index) {		
        var module = $scope.modules[index];
        var weekFlag = false;
		var monthFlag = false;
		var everFlag = false;
        module.modulettes.forEach(function(modulette) {
           var obj = $scope.getRecentAndDuration(module.id, modulette.id);
		   var timeDiff = Date.now() - obj.last_updated;
		   if (timeDiff <= WEEK ){
			   weekFlag = true;
			} 
			if (timeDiff <= MONTH){ 
               monthFlag = true;
			}
			if (obj.last_updated > 0){ 
               everFlag = true;
            }
         });
		 return {week: weekFlag, month: monthFlag, ever: everFlag};
    }

	$scope.anyModuleRecentlyVisited = function() {
       var out = {week:false, month:false, ever:false};
	   if ($scope.modules) {
         for (var i=0; i<$scope.modules.length ; i++){
		   if ($scope.moduleRecentlyVisited(i).week) out.week = true;
		   if ($scope.moduleRecentlyVisited(i).month) out.month = true;
		   if ($scope.moduleRecentlyVisited(i).ever) out.ever = true;
         }
	   }
	   return out;
	}

	 $scope.moduletteRecentlyVisited = function(moduleIndex, moduletteIndex, timeFrame) {
        var module = $scope.modules[moduleIndex];
        var obj = $scope.getRecentAndDuration(module.id, moduletteIndex);
		var timeDiff = Date.now() - obj.last_updated; 
		var flag = $scope.tab_id == 'recents' || $scope.tab_id =='coaches';
		if (timeFrame == 'week') return flag && (timeDiff <= WEEK) ;
		if (timeFrame == 'month') return flag && (timeDiff <= MONTH) ;
		if (timeFrame == 'ever') return flag && obj.last_updated > 0;
    }

    UserService.getViewedUser(function(user){
        if(!user){
            console.log('Error, getViewedUser returned nothing');
        }
          $scope.viewedUser = user;
          //console.log('viewedUser', user);
         // console.log('user', $scope.user);
         // console.log('userProgress',ProgressService.raw_progress);
    });

    function rolesCanCoach(roles){
        return (roles === 'Coach' || roles === 'Educator');
    }

	$scope.$watch('viewedUser', function() {
        if (rolesCanCoach($scope.roles) && $scope.viewedUser && ($scope.viewedUser.progress || $scope.viewedUser.message_type=="no_user_found")) {
            $scope.showTabsArray[0] = true;
			ProgressService.setViewUserProgressFlag(true);
			$scope.tab_id = 'coaches';
			$state.transitionTo('dashboard.' + $scope.tab_id);
        }
    });


    BreadcrumbsService.updateList([
    ]);

      var programPath = UserService.getProgramPath();
      console.log('about to get modules....???')
	HomeService.getModules(function (modules) {
        console.log('these are the modules', modules, paramsFromServer.modules)
        processModules(modules, $scope, true, programPath);
		sortModulesByGP($scope.modules, $scope);
		$scope.modulesSetSize = $scope.modules.length;
		$scope.selectedTreeItem = $scope.modules[0].id;
		var tree = new TreeNavService.Tree();  // create nav tree for keyboard navigation
		$scope.moduleTree = generateModuleTree(tree, $scope.modules);
		$scope.tree = $scope.moduleTree;
		console.log("TREE", $scope.moduleTree);
      });

      $scope.$watch('$viewContentLoaded', function() {
         $scope.showTitle = true;
      });
 


	$scope.globalClick = function() {
        //$scope.common.anyprojectExpandedFlag = false;
	}

     $scope.dashboardData = {};
	 $scope.dashboardData.tabs  = [{id: "coaches"}, {id: "modules"}, {id: "recents"}, {id: "goals"}];

	$scope.showTabsArray = [false, true, true, true];
	$scope.tab_id = "modules";

    

   /*if ($scope.roles == 'Coach') {           // replace by $watch on $scope.viewedUser
        $scope.tab_id = 'coaches';
		$scope.showTabsArray[0] = true;
		ProgressService.setViewUserProgressFlag(true);
   }*/

   $scope.studentExists = function(){
       if(!$scope.viewedUser) {
           return false;
       }
       return $scope.viewedUser.message_type=='no_student_id' || $scope.viewedUser.user ;
   }

   $scope.showTabs = function(){
       if($scope.viewedUser && rolesCanCoach($scope.roles)) $scope.showTabsArray[0] = $scope.viewedUser.progress || $scope.viewedUser.message_type=="no_user_found";
	   return $scope.showTabsArray;
   }

    $state.transitionTo('dashboard.' + $scope.tab_id);
    $scope.tabClick = function(tab_id){
      //$location.path(baseLocation + tab_id);
      $scope.tab_id = tab_id;
	  $state.transitionTo('dashboard.' +tab_id);
	  //console.log('USER:', UserService.getUser());
	  if (tab_id == 'coaches'){
		  ProgressService.setViewUserProgressFlag(true);   //switch user progress data to session user data
	  } else {
          ProgressService.setViewUserProgressFlag(false);  //switch user progress data to session user data
      }
	  if (tab_id == "modules") {
		  $scope.tree = $scope.moduleTree;
	  } else {
          $scope.tree = null;
	  }
    }

    $scope.isCoachStudentView = function() {
      return $scope.tab_id == "coaches";
    }

	$scope.dashClickHandler = function(loc) {
		return '';
		//return $scope.isCoachStudentView() ? '' : '';
	}

    $scope.keyboardNavStyle = function(modid) {
		var expanded = $("#" + modid).attr("aria-expanded")
        return  expanded=="true" || !$scope.keyboardNav? {} : {'color': 'lightgray'}  
    } 
	

    $scope.tab_arrowKeys = function(key, tabId) {
     var nextTab;
	 if (key == 39){
	   $scope.keyboardNav = false;
	   if (tabId == $scope.dashboardData.tabs[0].id) nextTab = $scope.dashboardData.tabs[1].id;
	   if (tabId == $scope.dashboardData.tabs[1].id) nextTab = $scope.dashboardData.tabs[2].id;
	   if (tabId == $scope.dashboardData.tabs[2].id) nextTab = $scope.dashboardData.tabs[3].id;
	   if (tabId == $scope.dashboardData.tabs[3].id) {
		 if (rolesCanCoach($scope.roles)) {
             nextTab = $scope.dashboardData.tabs[0].id;
         } else {
			 nextTab = $scope.dashboardData.tabs[1].id;
		 }  
	   }	 
	 }
     
	 if (key == 37){
		$scope.keyboardNav = false;
	   if (tabId == $scope.dashboardData.tabs[3].id) nextTab = $scope.dashboardData.tabs[2].id;
	   if (tabId == $scope.dashboardData.tabs[2].id) nextTab = $scope.dashboardData.tabs[1].id;
	   if (tabId == $scope.dashboardData.tabs[0].id) nextTab = $scope.dashboardData.tabs[3].id;
	   if (tabId == $scope.dashboardData.tabs[1].id) {
		 if (rolesCanCoach($scope.roles)) {
             nextTab = $scope.dashboardData.tabs[0].id;
         } else {
			 nextTab = $scope.dashboardData.tabs[3].id;
		 }
       }
	 }

	 if (key == 9 && $scope.tab_id == "modules") {
		 $scope.keyboardNav = true;
	 }

     if (key == 37 || key == 39){
	     //$("#tab-"+nextTab).attr("tabindex", 0);
	     $("#tab-"+nextTab).focus();
	     //$("#tab-"+tabId).attr("tabindex", -1);
     }
  }

  
  $scope.tree_arrowKeys = function(e) {
     TreeNavService.arrowKeys($scope.tree, e);
  }


  }

  
})();