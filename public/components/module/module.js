'use strict';

(function() {
  var mainApp = 'juice';
  var moduleName = 'module';
  helpers.addModuleToApp(mainApp, moduleName);
  var pages = [
    moduleName
  ];
  var pagesWithControllers = [
    moduleName
  ];
  angular.module(mainApp + '.' + moduleName, ['resource-helper', 'juice.progress', 'juice.treenav']).
      config(['$stateProvider', routerConfig]).
      factory('ModuleService', ['ResourceHelperService', 'ModuletteService', 'UserService', ModuleService]).
      factory('interactiveData', function() {
        return {interactive: '---'};
      }).
      controller('ModuleCtrl', ['$scope', '$rootScope', '$stateParams', 'ModuleService', '$location', 'AudioControllerService', 'audio', 'BreadcrumbsService', 'ProgressService', 'interactiveData', 'DataStoreService', '$state', 'WalkthroughTooltipService', 'UserService', 'TreeNavService', ModuleCtrl]);

  function ModuleService(ResourceHelperService, ModuletteService, UserService){
    var out = ResourceHelperService.createResources({
      getModule: {
        url: configs.file_path + UserService.getProgramPath() + ':module_id' + '/module.txt', // !PM to add support for Programs
        method: 'GET',
        params: {module_id:'@module_id'}
      }
    });
    out.getWidgetDataFile = ModuletteService.getWidgetDataFile; //using the same data grabber as the modulette
    return out;
  }

  function routerConfig($stateProvider) {
    $stateProvider.state({
      name: "module_no_module_id",
      url: '/module/',
      templateUrl: '/components/module/no_module_id.html'+hashAppend
    }).state({
      name: "module",
      url: '/module/:module_id',
      templateUrl: '/components/module/module.html'+hashAppend,
      controller: ModuleCtrl
    }).state({
      name: "module_with_action",
      url: '/module/:module_id/:action',
      templateUrl: '/components/module/module.html'+hashAppend,
      controller: ModuleCtrl
    }).state({
      name: "module_no_module_ids",
      url: '/module',
      templateUrl: '/components/module/no_module_id.html'+hashAppend
    });
  }

  function ModuleCtrl($scope, $rootScope, $stateParams, ModuleService, $location, AudioControllerService, BreadcrumbsService, ProgressService, interactiveData, DataStoreService, $state, WalkthroughTooltipService, UserService, TreeNavService) {
    $scope.$location = $location;
    $scope.audioService = AudioControllerService;
    $scope.module_id = $stateParams.module_id.split('.')[0];
    $scope.progress = ProgressService;
    $scope.makeHtmlId = helpers.makeHtmlId;
    $scope.showLearnMore = false;
    $scope.learnMoreClick = function(){
      console.log('here');
      $scope.showLearnMore = !$scope.showLearnMore ;
    }
	$scope.keyboardNav = false;
    var shouldShowModal = false;
    shouldShowModal = ($location.hash() === 'auth');
    $location.hash('');
    $scope.showModal = function(show){
      if(window.force_modal){
        return true;
      }
      //return true;
      if(typeof(show)!='undefined'){
        shouldShowModal = show;
      }
      return shouldShowModal && $scope.loaded;
    };

    delete interactiveData.previousFeedback;

    function generateModPageTree(tree, module) {
       //var tree = new Tree();
	   var groups = module.modulette_groups;
	   console.log(groups)
	   for (var i=0; i<groups.length; i++ ) {
		   var node = TreeNavService.newNode(groups[i].record_id_, i+1);
		   node.parent = tree.root;
		   node.parent.children[i] = node;
		   for (var j=0; j<groups[i].modulettes.length; j++ ){
             var child = TreeNavService.newNode(groups[i].modulettes[j].id.replace(/ /g, "_"), j+1);
			 child.parent = node;
			 node.children[j] =  child;
		   }
	   }
	   if (module.challenge_wheel_available==='1') {
          var node = TreeNavService.newNode("CW", groups.length + 1);
		   node.parent = tree.root;
		   node.parent.children[groups.length] = node;
	   }
	   tree.current = tree.root.children[0];
	   return tree;
	}

    $scope.treeItemId = function(id) {
       if(id) return id.replace(/\./g, "_").replace(/ /g, "_");
	}

    $scope.tree_arrowKeys = function(e) {
	 if (e.target.attributes[0].nodeValue == "CW"){
	    $scope.challengeWheelClick();
     }
     TreeNavService.arrowKeys($scope.modPageTree, e);
    }

    $scope.keyboardNavStyle = function(modid) {
		var expanded = $("#" + modid).attr("aria-expanded")
        return  expanded=="true" || !$scope.keyboardNav? {} : {'color': 'lightgray'}  
    } 

	$scope.setKeyNav = function() {
        $scope.keyboardNav = true;
	}

	 $scope.$on("initRefresherTab", function () {
            setTimeout(function () {
                $("#tab-modules").focus()
            }, 500);

        });

    //initialized on loading of data for module
    function setupChallengeWheel(challenge_widget_type) {
      $scope.showChallengeWheelWidget = false;
      $scope.challenge_widget_name = challenge_widget_type;
      $scope.showChallengeWheelWidget = false;
      $scope.widgetFileName = $scope.module_id + '.challenge_wheel'
      $scope.challengeWheelClick = function () {
        if(!challenge_widget_type){
          throw 'No challenge wheel widget type defined for this module';
        }
        var path = '/module/' + $stateParams.module_id + '/show_challenge_wheel';
        $('#loading').show();
        if($location.path() == path){
          $state.reload();
        }else {
          $location.path(path);
        }
      }
      
       


      if($stateParams.showChallengeWheel){
        $scope.challegeWheelClick();
      }
      var launchLoadedWidget = function (fileData) {
        interactiveData.interactive = fileData;
        var filename = 'none';
        interactiveData.widgetSession = DataStoreService.createSession($scope.challenge_widget_name, $scope.widgetFileName, $scope.module_id, 'module', 'no-track', $scope.module_id, 'no-modulette-id');
        $scope.showChallengeWheelWidget = true;
        $stateParams.showChallengeWheel = false;
      }
      if($stateParams.action == 'show_challenge_wheel'){
        $('#loading').show();
        var start_time = new Date().getTime();
        DataStoreService.getMyRecentRecord({data_file:$scope.widgetFileName}, function(result){
          interactiveData.previousFeedback = result && result.records[0] && result.records[0].data;

          ModuleService.getWidgetDataFile($scope.challenge_widget_name, $scope.widgetFileName,
              function delayedWidgetLaunch(fileData){
                var min_time = 1000;
                var now = new Date().getTime();
                var elapsed = now - start_time;
                var remaining = min_time - elapsed;
                if(remaining < 0){
                  remaining = 0;
                }
                setTimeout(function(){launchLoadedWidget(fileData);}, remaining);
              }
          );
        });

      }
    };

    BreadcrumbsService.hide();

    $scope.module = null;

    if($scope.module_id == 'preview'){
      var data = paramsFromServer.preview_data;
      delete paramsFromServer.preview_data;
      $scope.module_id = data.id.split('.')[0];
      handleLoadedModule(data);
    }else {
      ModuleService.getModule({module_id: $scope.module_id}, handleLoadedModule);
    }
    
	var narration_path = configs.narration_path + $scope.module_id + '/';
    var narration_path_prog = configs.narration_path + UserService.getProgramPath() + $scope.module_id + '/';

    $scope.module_icon = configs.file_path + $scope.module_id + '/module.png';
    $scope.program_module_icon = configs.file_path + UserService.getProgramPath() + $scope.module_id + '/module.png'


    function handleLoadedModule(data){
      $scope.module = data;
	  $scope.ariasetsize = $scope.module.challenge_wheel_available==='1' ? $scope.module.modulette_groups.length + 1 : $scope.module.modulette_groups.length;
      setupChallengeWheel($scope.module.challenge_widget_type);
      BreadcrumbsService.updateList([
        {
          'text':$scope.module.title,
          'link':'/juice/module/'+ $scope.module.id,
          'fallback_icon_url': configs.file_path + $scope.module_id + '/module.png',
          'icon_url': configs.file_path + UserService.getProgramPath() + $scope.module_id + '/module.png'
        }
      ]);
	  var tree = new TreeNavService.Tree();  // create nav tree for keyboard navigation
	  $scope.modPageTree = generateModPageTree(tree, $scope.module);
	  console.log("MOD PAGE TREE", $scope.modPageTree);
      $scope.loaded = true;
      BreadcrumbsService.show();
      $rootScope.$broadcast('pageComplete');
      WalkthroughTooltipService.initalize('module');
	  //$("#skiplink").attr("href","");
	  $("#pagetitle").html("JUICE Module " + $scope.module.title);
	  $("#pagetitle").focus();
    }

    $scope.restartTour = function(){
      WalkthroughTooltipService.play('module', 1);
    }

    $scope.$on("$destroy", function() {
      AudioControllerService.stop();
    });

    $scope.audioClick = function(id){
      if(id != AudioControllerService.currentlyPlayingId) {
        var filename = 'group_'+id+'.mp3';
        if(id =='overview'){
          filename = 'overview.mp3';
        }
        if(id=='challenge_wheel'){
          filename = '../challenge_wheel.mp3';
        }
		if (narration_path_prog != narration_path) {  // if in a program....
			 $.ajax({                                 //...try tro load program-specific file
                  type: "GET",
                  url: narration_path_prog + filename
             }).done(function () {
                  AudioControllerService.play(narration_path_prog + filename, id);
             }).fail(function () {
                  AudioControllerService.play(narration_path + filename, id);
             });
		} else {
           AudioControllerService.play(narration_path + filename, id);
        }        
      }else{
        AudioControllerService.stop();
      }
    };
  }
})();