'use strict';

(function() {
    var mainApp = 'juice';
    var moduleName = 'progress';
    helpers.addModuleToApp(mainApp, moduleName);

    angular.module(mainApp + '.' + moduleName, ['juice.services', 'resource-helper', 'juice.user']).
    factory('ProgressService', ['ResourceHelperService', '$sce', 'UserService', ProgressService]);

    function ProgressService(ResourceHelperService, $sce, UserService) {
        var service = ResourceHelperService.createResources({
            getRawProgress: {
                url: '/juice/progress',
                method: 'GET',
                isArray: false
            }
        });
        var raw_progress = {};
		var viewUserProgressData = {};
		service.cumulativeTime = {'own': {week: 0, month:0, ever:0}, 'student': {week: 0, month:0, ever:0}};
		service.cumulativeTimeHM = {'own': {week: "", month:"", ever:""}, 'student': {week:"", month:"", ever:""}};
        service.updateProgress = function(){
            service.getRawProgress(function(data){
                raw_progress = data.progress;
            }).$promise.then(function(data){cumulativeTimeSpent(data, 'own')});
			UserService.getViewedUser(function(user){    //load viewUserData (for Coach role)
                 viewUserProgressData = user.progress;
		    }).$promise.then(function(data){cumulativeTimeSpent(data, 'student')});
        }
		
		service.updateProgress();

        function timeHM(tms) {
		   var h_s, min_s, spacer =" ";
           var ts = Math.round(tms / 1000);
		   if (ts <  60) return  "< 1 min";
		   var tm = Math.round(ts / 60);
		   var th = Math.floor(tm / 60);
		   tm = tm % 60;
		   if (th == 0) h_s = "";
		   if (th == 1) h_s = "1 hr";
		   if (th > 1) h_s = th + " hrs";
		   if (tm == 0) min_s = "";
		   if (tm == 1) min_s = "1 min";
		   if (tm > 1) min_s = tm + " mins";
           if (tm == 0 || th == 0) spacer = "";
		   return h_s + spacer + min_s;
        }

        function cumulativeTimeSpent(data, who) {
		   var WEEK = 604800000; //604800000 ms = 1 week
	       var MONTH = WEEK / 7 * 30;
		   service.cumulativeTime[who] = {week: 0, month:0, ever:0};
		   if (who == 'student' && !data.user) return; 
		   $.each(data.progress, function(k, module){
			   if (k != "_id"){
			     $.each(module, function(k, modulette){
			       $.each(modulette, function(k, tab){
			            $.each(tab, function(k, track){
			                 if (track.durations)   {
			                   $.each(track.durations, function(k, duration){
			                     if (duration && duration.last_updated){
									 var timeDiff = Date.now() - Date.parse(duration.last_updated);
		                             if (timeDiff <= WEEK ){
			                             service.cumulativeTime[who].week += duration.duration_ms;
			                         } 
			                         if (timeDiff <= MONTH){ 
                                          service.cumulativeTime[who].month += duration.duration_ms;
			                         }
			                         service.cumulativeTime[who].ever += duration.duration_ms;
			                     }
		                       });
							 }  
		                }); 
		             });	 
		         });
			   }
		   });
           service.cumulativeTimeHM[who].week = timeHM(service.cumulativeTime[who].week);
		   service.cumulativeTimeHM[who].month = timeHM(service.cumulativeTime[who].month);
		   service.cumulativeTimeHM[who].ever = timeHM(service.cumulativeTime[who].ever);
		};


		var viewUserProgressFlag = false;  //if viewUserProgressFlag is true, we'll be using the viewUser progress data
		service.setViewUserProgressFlag = function(flag) {
            viewUserProgressFlag = flag;
		}

	   
        function fixModuletteId(modulette_id){
            modulette_id = modulette_id.replaceAll('.', '_');
            return modulette_id.split('_').slice(0, 2).join('_');
        };

        function fixModuleId(module_id){
            return module_id.split('.')[0];
        };


        /* wrapper for different progress grabbers. Tab_id+track_id are not required */
        service.getProgress = function(module_id, modulette_id, tab_id, track_id){
            modulette_id = fixModuletteId(modulette_id);
            module_id = fixModuleId(module_id);
            var out = '';
            if(typeof(track_id) != 'undefined'){
                out = getTrackProgress(module_id, modulette_id, tab_id, track_id);
            }else if(typeof(modulette_id) != 'undefined'){
                out = getModuletteProgress(module_id, modulette_id);
            }
            return out;
        };

        service.getTooltip = function(module_id, modulette_id, tab_id, track_id, coachStudentViewFlag){
            modulette_id = fixModuletteId(modulette_id);
            module_id = fixModuleId(module_id);
            var out = '';
            if(typeof(track_id) != 'undefined'){
                out = $sce.trustAsHtml(getTrackTooltip(module_id, modulette_id, tab_id, track_id));
            }else if(typeof(modulette_id) != 'undefined'){
                out = $sce.trustAsHtml(getModuletteTooltip(module_id, modulette_id, coachStudentViewFlag));
            }
            return out;
        };

       service.getRecentAndDuration = function(module_id, modulette_id) {
			modulette_id = fixModuletteId(modulette_id);
            module_id = fixModuleId(module_id);
            var props = getModuletteProgressProperties(module_id, modulette_id);
			return {last_updated: props.last_updated, duration_ms: props.duration_ms};
        }  
        

        function getTrackTooltip(module_id, modulette_id, tab_id, track_id){
            var progress = getTrackProgress(module_id, modulette_id, tab_id, track_id);
            var thing = '';
            if(tab_id === 'guided_practice'){
                thing = 'Try It!';
            }
            if(tab_id === 'challenge'){
                thing = 'mini-game';
            }
            if(tab_id === 'refresher'){
                thing = 'overview';
            }
            if(progress === '0_of_6'){
                return 'You have not yet visited this ' + thing;
            }
            if(progress === '3_of_6'){
                return 'You started this ' + thing;
            }
            if(progress === '6_of_6'){
                return 'You completed this ' + thing;
            }
            return 'ERROR in track progress tooltop';
        }

        function getModuletteTooltip(module_id, modulette_id, coachStudentViewFlag){
            var not_visited = 'You have not yet visited this mini-lesson';
			if (coachStudentViewFlag) not_visited = 'The student has not yet visited this mini-lesson';
            var started_not_completed_any = 'You worked some parts of this mini-lesson.';
			if (coachStudentViewFlag) started_not_completed_any = 'The student worked some parts of this mini-lesson.';
            var completed_some = null; //need to compute this one
            var completed_all = 'You completed all the parts of this mini-lesson at least once';
			if (coachStudentViewFlag)  completed_all = 'The student completed all the parts of this mini-lesson at least once';
            var props = getModuletteProgressProperties(module_id, modulette_id);
            if(props.started_any == false){
                return not_visited;
            }
            if(props.completed_list.length === 0){
                return started_not_completed_any;
            }
            if(props.completed_list.length === 3){
                return completed_all;
            }
            if(props.completed_list.length > 0 && props.completed_list.length<3){
                //completed some
                var plaural = props.completed_list.length > 1;
                var this_these = plaural ? 'these' : 'this';
                var part = plaural ? 'parts' : 'part';
                var out = '<p>You completed ' + this_these + ' ' + part +' of this mini-lesson:</p><ul>'
				if (coachStudentViewFlag) out = '<p>The student completed ' + this_these + ' ' + part +' of this mini-lesson:</p><ul>'

                var display_mapping = {
                    refresher: 'Overview',
                    guided_practice:'At least one Try It!',
                    challenge: 'At least one mini-game'
                };
                props.completed_list.forEach(function(tab_id){
                    out+='<li>'+display_mapping[tab_id]+'</li>';
                });
                return out;
            }
            return 'ERROR in getModuletteTooltip. No correct tooltip found for '+props.completed_list.length;
        }


        var getModuletteProgress = function(module_id, modulette_id){
            //modulette_id = fixModuletteId(modulette_id);
            var props = getModuletteProgressProperties(module_id, modulette_id);
            return props.wedge_count+'_of_6';
        };

        //returns an object with some properties about the user's progress
        var getModuletteProgressProperties = function(module_id, modulette_id){
            var out = {
                wedge_count: 0,
                completed_list: [],
                started_any: false,
                last_updated: 0,
                duration_ms: 0
            };
            try{
                if (viewUserProgressFlag){
					var modulette_progress_obj = viewUserProgressData[module_id][modulette_id];
                } else {
					var modulette_progress_obj = raw_progress[module_id][modulette_id];
				}
                if(typeof(modulette_progress_obj) == 'undefined'){
                    return out;
                }
                var count = 0;
                var completed_list = [];
                for(var tab_id in modulette_progress_obj){
                    var tab_obj = modulette_progress_obj[tab_id];
                    var started = false;
                    var complete = false;
                    for(var track_id in tab_obj){
                        var track_progress = tab_obj[track_id];
                        if(!track_progress){
                            continue;
                        }
                        if(track_progress['started']){
                            started = true;
                        }
                        if(track_progress['complete']){
                            complete = true;
                        }
						if(track_progress['last_updated']){
							var date = Date.parse(track_progress['last_updated']);
							if (date > out.last_updated){
                                out.last_updated = date;
							}                            
                        }
						if(track_progress['duration_ms']){                            
						   out.duration_ms = out.duration_ms + track_progress['duration_ms'];
                        }
                    }
                    if(started){
                        count++;
                    }

                    if(complete){
                        completed_list.push(tab_id);
                        count++;
                    }

                }
                out.completed_list = completed_list;
                out.wedge_count = count;
                if(count){
                    out.started_any = true;
                }
                return out;
            }catch(e){
                return out;
            }
        };

        var getTrackProgress = function(module_id, modulette_id, tab_id, track_id){
            var track_progress = {};
            var of = '_of_6';
            var count = 0;
            try{
                if (viewUserProgressFlag){
					var progress = viewUserProgressData[module_id][modulette_id][tab_id][track_id];
                } else {
					var progress = raw_progress[module_id][modulette_id][tab_id][track_id];
				}

                if(progress.started){
                    count += 3;
                }
                if(progress.complete){
                    count += 3;
                }
                return count + of;
            }catch(e){
                return '0_of_6';
            }
        }
        return service;
    };
})();