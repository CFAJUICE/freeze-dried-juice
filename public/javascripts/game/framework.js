/* global angular */
(function() {
  'use strict';
  angular.module('pick_and_stack_constants',[]).value('ASSETS', {});  //!PM
  angular.module('puzzler', ['juice.games']);
  angular.module('sorter', ['juice.games']);
  angular.module('fridge_magnets', ['juice.games']);
  angular.module('stacker', ['juice.games']);
  angular.module('tumbler', ['juice.games']);
  angular.module('balancer', ['juice.games']);
  angular.module('pick_and_stack', ['juice.games']);
  angular.module('quick_pick', ['juice.games']);
  angular.module('highlighter', ['juice.games']);
  angular.module('game_example', ['juice.games']);
  angular.module('perfect_word', ['juice.games']);
  angular.module('fix_it', ['juice.games']);
  angular.module('juice.games', [
    'ui.router',
    'ui.bootstrap',
    'juice',
    'juice.clicks',
    'juice.services',
    'juice.games.services',
    'juice.games.directives',
    'juice.games.controllers',
    'puzzler',
    'sorter',
    'stacker',
    'fridge_magnets',
    'tumbler',
    'balancer',
    'pick_and_stack',
    'quick_pick',
    'highlighter',
    'game_example',
    'perfect_word',
	'pick_and_stack_constants',  
    'fix_it'
  ]);
})();