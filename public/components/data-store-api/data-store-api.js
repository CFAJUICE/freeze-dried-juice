(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'data-store-api';
  helpers.addModuleToApp(mainApp, moduleName);

  var data_store_service_modules = ['ResourceHelperService', 'IdGenerator', 'ProgressService'];
  if(window.location.pathname.indexOf('/preview/') === -1){
    data_store_service_modules.push('HomeService');//homeservice shouldn't be used in preview
  }
  data_store_service_modules.push(DataStoreService);

  angular.module(mainApp + '.' + moduleName, ['juice.services', 'resource-helper', 'juice.progress']).
    factory('DataStoreService', data_store_service_modules);

  function DataStoreService(ResourceHelperService, IdGenerator, ProgressService, HomeService) {
    var service = ResourceHelperService.createResources({
      getRecords: {//not really used
        url: '/juice/records',
        method: 'GET',
        isArray: false
      },
      postRecord: {
        url: '/juice/record',
        method: 'POST',
        isArray: false
      },
      getSystemTime: {
        url: '/juice/get_time',
        method: 'GET',
        isArray: false
      },
      getMyRecentRecord:{
        url: '/juice/my_records?widget_data_file=:data_file&limit=1&complete=true',
        method: 'GET',
        params: {data_file:'@data_file'}
      }
    });

    service.modules = null;
    function getModules(callback) {
      if(service.modules){
        return callback(service.modules);
      } else {
        if(HomeService) {
          HomeService.getModulesFromS3(function (modules) {
            service.modules = modules;
            callback(modules);
          });
        }
      }
    }
    getModules(function(modules){
      //do nothing... already set to service.modules
    })

    service.createSession = function(widget_name, widget_data_file, modulette_name, tab_id, track_id, module_id, modulette_id){
      var session = this;
      session.record = {
        widget_name:widget_name,
        widget_data_file:widget_data_file,
        session_id: IdGenerator.uuid(),
        modulette_name:modulette_name,
        tab_id:tab_id,
        track_id:track_id,
        module_id:module_id,
        modulette_id:modulette_id
      };

      function clone(obj){
        if(!obj){
          return obj;
        }
        try {
          return JSON.parse(JSON.stringify(obj));
        }catch(e){
          console.log('Error parsing string', JSON.stringify(obj), obj);
          return obj;
        }
      }

      function addCompetenciesToRecord(record, callback) {
        if(record.competencies || record.competencies_id){
          return callback(record);
        }
        getModules(function (modules) {
          var record = session.record;
          modules.forEach(function (module) {
            var test_id = module.id.split('.')[0];
            if (test_id === module_id) {
              //found correct module!
              record.competencies = clone(module.competencies);
              record.competencies_id = clone(module.competencies_id);
              module.modulettes.forEach(function (modulette) {
                if (modulette.name === modulette_name) {
                  record.subcompetencies = clone(modulette.subcompetencies);
                  record.subcompetencies_id = clone(modulette.subcompetencies_id);
                }
              });
            }
          });
          callback(record);
        });
      }


      function applyServerDateTime(callback) {
        service.getSystemTime(function (data) {
          session.record.started = new Date(data.datetime);
          if(typeof(callback)=='function'){
            callback();
          }
        });
      }
      applyServerDateTime();

      var forceDataString = function(data){
        if(typeof(data)=='string'){
          return data;
        }
        return JSON.stringify(data);
      };
      session.save = function(data, complete, callback){
        //console.log("SAVE", data);
        function doSave() {
          session.record.data = forceDataString(data);
          session.record.complete = complete;
          addCompetenciesToRecord(session.record, function compCallback(record){
            service.postRecord(record, function(){
              ProgressService.updateProgress();
              if(typeof(callback)=='function'){
                callback(data, complete);
              }
            });
          });
        }
        if(session.record.started){
          doSave();
        }else{
          //if the server hasn't given a datetime yet for started, we have to wait for it.
          applyServerDateTime(doSave);
        }
      };
      return session;
    };

    return service;
  };
})();