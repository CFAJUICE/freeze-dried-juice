'use strict';

(function () {
    var mainApp = 'juice';
    var moduleName = 'search';
    helpers.addModuleToApp(mainApp, moduleName);
    var pages = [
        moduleName
    ];
    var pagesWithControllers = [
        moduleName
    ];
    angular.module(mainApp + '.' + moduleName, ['resource-helper', 'juice.progress', 'juice.treenav']).
        config(['$stateProvider', routerConfig]).
        factory('SearchService', ['ResourceHelperService', SearchService]).
        controller('SearchCtrl', ['$scope', '$stateParams', 'SearchService', 'BreadcrumbsService', 'TopnavService', 'ProgressService', '$location', 'UserService', 'HomeService', 'TreeNavService', SearchCtrl]);

    function SearchService(ResourceHelperService) {
        var out = ResourceHelperService.createResources({
            getResults: {
                url: '/juice/dosearch?q=:q',
                method: 'GET',
                isArray: false,
                params: {q: '@q'},
            },
        });
        return out;
    }

    function routerConfig($stateProvider) {
        $stateProvider.state({
            name: 'search',
            url: '/search/',
            controller: SearchCtrl,
            templateUrl: '/components/search/search.html' + hashAppend
        });
    }

    function SearchCtrl($scope, $stateParams, SearchService, BreadcrumbsService, TopnavService, ProgressService, $location, UserService, HomeService, TreeNavService) {
        var q = $location.search().q;
        $scope.filePath = configs.file_path;
        $scope.progress = ProgressService;
        $scope.showScores = (paramsFromServer.user.roles === 'Admin');
        $scope.programModules = {};
        HomeService.getModules(function (modules) {
            modules.forEach(function (module) {
                $scope.programModules[module.id] = module;
            })
            console.log( $scope.programModules);
        })
        $scope.keyboardNav = false;

        $("#skiplink").attr("href","#resultshdr");
	    $("#pagetitle").html("JUICE Search");
	    $("#pagetitle").focus();

        TopnavService.searchBoxText = q;
        TopnavService.onQueryUpdate = function (new_q) {
            q = new_q;
            doSearch();
        };

        $scope.toggle = function (id) {
            $('#' + id).toggle('slow');
        }

        BreadcrumbsService.appendUniqueToList([
            {
                'text': 'Search',
                //'icon_url': '/components/topnav/images/help-icon.png',
                'link': '/juice/search'
            }
        ]);
        $('#loading').show();
        $('#page-search').hide();
        function doSearch() {
            $('#loading').show();
            $('#page-search').hide();
            SearchService.getResults({q: q}, function (raw_results) {
                $scope.results = buildResults(raw_results);
                console.log('raw_results', raw_results);
				var tree = new TreeNavService.Tree();  // create nav tree for keyboard navigation
		        $scope.tree = generateSearchTree(tree, $scope.results);
				$("#resultshdr").focus();
				console.log('TREE', $scope.tree);
            });
        }

		$scope.treeItemId = function(id) {
          if(id) return id.replace(/\./g, "_");
	    }

		$scope.tree_arrowKeys = function(e) {
           TreeNavService.arrowKeys($scope.tree, e);
        }

		$scope.tab_key = function() {
          $scope.keyboardNav = true;
		}

	  	$scope.keyboardNavStyle = function(modid) {    
		    var expanded = $("#" + $scope.treeItemId(modid)).attr("aria-expanded")
            return expanded == "true" || !$scope.keyboardNav ? {'opacity':'1'} : {'opacity':'0.35'};
        } 

		$scope.openPictureIt = function(parentInd, ind) {
		   var href = configs.file_path + $scope.results[parentInd].children[ind].file_name;
		   window.GARecordPictureIt(href); 
		   window.open(href, '', 'resizable=yes,status=no,location=no,toolbar=no,menubar=no,fullscreen=no,scrollbars=no,dependent=no,width=825,left=100,height=695,top=50');
		   return false;
		}

        function generateSearchTree(tree, results) {
			console.log('results', results);
			var level1Size = 0;
			var level1Pos = {};
			for (var i=0; i<results.length; i++ ) {
			   if ($scope.programModules[results[i].id]) {  //filter for modules in program
				   level1Size = level1Size +1;
				   level1Pos[results[i].id] = i +1;
				   var node = TreeNavService.newNode(results[i].id, i+1);
				   node.parent = tree.root;
				   node.parent.children[i] = node;
				   if (results[i].children.length <= 0) {
                      setTimeout(function() {$("#" + node.id).removeAttr("aria-expanded")}, 250);
				   } else {
                      setTimeout(function() {$("#" + node.id).attr("aria-expanded", "false")}, 250);
				   }
				   for (var j=0; j<results[i].children.length; j++ ){			 
					   //var k = parseInt(modules[i].modulettes[j].order) - 1;  //not quite right!
					   var child = TreeNavService.newNode(results[i].children[j]._id, j+1);
					   child.parent = node;
					   node.children[j] =  child;
				   } 
			   }
			 }
			 $scope.level1Size= level1Size;
			 $scope.level1Pos = level1Pos;
	         tree.current = tree.root.children[0];
	         return tree;
	    }

        $scope.results = null;
        function buildResults(raw_results) {
            var programPath = UserService.getProgramPath();
            var out = []; //will be sorted
            var modules = {}; //just used for easy lookup
            function pushModuleIntoResults(module) {
                if (module == null) {
                    module = {
                        key: 'null'
                    };
                }
                var key = module.key;
                module.icon = configs.file_path + module.key + '/module.png';
                module.program_icon = configs.file_path + programPath + module.key + '/module.png';
                if (!modules[key]) {
                    modules[key] = module;
                    out.push(module);
                }
                if (!module.children) {
                    module.children = [];
                }
                return modules[key];
            }

            function updateSortScore(module) {
                if (!module.title) {
                    module.sort_score = 0;
                    return;
                }
                var sum = module.score ? module.score : 0;
                module.children.forEach(function (child) {
                    sum += child.score;
                });
                var count = module.children.length;
                if (module.score) {
                    count++;
                }
                module.sort_score = sum / count;
            }
            if(!raw_results.modules){
                raw_results.modules = [];
            }
            raw_results.modules.forEach(function (module) {
                pushModuleIntoResults(module);
            });

            var collections = ['modulettes', 'ancillary_files'];
            collections.forEach(function (collection_name) {
                raw_results[collection_name].forEach(function (obj) {
                    var module = pushModuleIntoResults(obj.module);
                    delete obj.module;
                    if (obj.order) {
                        obj.order = Number(obj.order);
                    } else {
                        obj.order = 99;
                    }
                    obj.type = collection_name;
                    if(obj.title.toLowerCase().indexOf('screen reader')!==-1){
                        obj.icon = '/images/accessible_icon.png';
                    }
                    module.children.push(obj);
                });
            });

            function sortChildren(module) {
                var maxScore = 0;
                var indexMaxScore = -1;
                module.children.forEach(function (child, index) {
                    if ((child.score > maxScore) && (child.type === 'modulettes')) {
                        indexMaxScore = index;
                        maxScore = child.score;
                    }
                });
                module.children.forEach(function (child, index) {
                    if ((child.score == maxScore) && (child.type === 'modulettes')) {
                        child.order = child.order - 100;
                    }
                });
                module.children.sort(helpers.propertySorter('order'));

                var seperator_set = null; //one seperate for each child type. will be set to child.type
                module.children.forEach(function (child) {
                    if (seperator_set == child.type) return;
                    if (child.order >= 0) {
                        child.prefix_seperator = true;
                        seperator_set = child.type;
                    }

                    if (child.type === 'ancillary_files') {
                        child.prefix_seperator = true;
                    }
                });
            }

            out.forEach(function (module) {
                updateSortScore(module);
                sortChildren(module);
            });

            out.sort(helpers.propertySorter('-sort_score'));

            $('#loading').hide();
            $('#page-search').show();
            return out;
        }

        doSearch();

    }
})();