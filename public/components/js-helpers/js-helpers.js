/**
 * A collection of javascript helper functions.
 *
 * Items that belong here:
 * * Things that are not related to angular
 * * Things that need to be globally accessable
 * * Adding on to the prototype of native js things (like adding Array.foreach
 * * Or things that need to run in an angular module.config (you can't inject non-core angular
 *      modules into a config)
 *
 *
 * @module js-helpers
 */
String.prototype.capitalize = function(){
  return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
};

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

window.onerror = function handleError(message, source, lineno, colno, error){
  var err = message+ ' --- ' + source +':'+lineno;
  helpers.logError('general', err);
}

var GAME_LOADED = false;  //to prevent crash when closing some games before they are fully loaded. Should really not be global...

var helpers = {
  replaceS3BucketInData: function(fileData, file_path){
    if(!file_path){
      file_path = public_configs.fileResources;
      console.log('configs.filepath', file_path);
    }else{
	console.log('filepath passed in as', file_path);
    }

    var tmpfile = JSON.stringify(fileData).replaceAll(file_path, "S3_BUCKET_");
    return JSON.parse(tmpfile.replaceAll("S3_BUCKET_", file_path).replaceAll(file_path+'/', file_path));
  },

  replaceS3BucketVariables: function(str){
    if(typeof(str)!=='string') return '';
    var fileResources = public_configs ? public_configs.fileResources : '';
    str = str.
      replaceAll('S3_BUCKET_', fileResources).
      replaceAll('S3_FILE_PATH', fileResources).
      replaceAll(fileResources+'/', fileResources);//remove double slash
    return str;
  },
  
  //example: People.sort(dynamicSort("Name")); will sort an array of people objects by the property "Name". "-Name" would be reverse order
  propertySorter: function (property) {
    var sortOrder = 1;
    if (property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function (a, b) {
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    }
  },

  isArray: function(thing){
    return (Object.prototype.toString.call( thing ) === '[object Array]');
  },

  strToBoolean: function (str) {
    if (str) {
      if ((str == '0') || (str == 'false')) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  },
  err: function (msg) {
    if (typeof(msg) === 'string') {
      console.log('ERROR: ' + msg);
    } else {
      console.log('ERROR: ', msg);
    }
  },

  logError: function (module, error) {
    var record = {
      module: module,
      message: error
    };

    $.post('/juice/js_error', record);
  },

  makeHtmlId: function (str) {
    return str.replace(/^[^a-z]+|[^\w:.-]+/gi, "");
  },

  capitalizeFirstLetter: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  pathToControllerName: function (path, pagesWithControllers) {
    if (!pagesWithControllers) pagesWithControllers = [];

    if (pagesWithControllers.indexOf(path) === -1) {
      return null;
    }

    var path = path.replace(/\_/g, '/').replace(/\-/g, '/');
    path = path.split('/');
    var out = '';
    path.forEach(function (path_element) {
      out += helpers.capitalizeFirstLetter(path_element);
    });
    out += 'Ctrl';
    return out;
  },
  addPagesAndControllers: function ($stateProvider, pages, pagesWithControllers, extraViewPath) {
    if (!extraViewPath) extraViewPath = '';
    for (var i in pages) {
      var page = pages[i];
      var obj = {
        url: '/' + page,
        templateUrl: '/components/' + extraViewPath + page + '.html'+hashAppend,
        controller: helpers.pathToControllerName(page, pagesWithControllers),
        controllerAs: 'vm'
      };
      $stateProvider.state(page, obj);
    }

  },

  appModules: {},
  addModuleToApp: function (appName, moduleRefName) {
    if (!this.appModules[appName]) {
      this.appModules[appName] = [];
    }
    this.appModules[appName].push(appName + '.' + moduleRefName);
  },
  getAppModules: function (appName) {
    if (!this.appModules[appName]) {
      return [];
    }
    return this.appModules[appName];
  }
};

helpers.decodeEntities = (function() {
  // this prevents any overhead from creating the object each time
  var element = document.createElement('div');

  function decodeHTMLEntities (str) {
    if(str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }

    return str;
  }

  return decodeHTMLEntities;
})();


function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function multiReplaceAll(findAndReplaceObj, str) {
  forEach(findAndReplaceObj, function(replace, find){
    str = replaceAll(find, replace, str);
  });
  return str;
}

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

/**
 * Iterate over an Object, Array of String with a given callBack function
 * Source: http://michd.me/blog/javascript-foreach-object-array-and-string/
 *
 * @param {Object|Array|String} collection
 * @param {Function} callBack
 * @return {Null}
 */
function forEach(collection, callBack) {
  var
      i = 0, // Array and string iteration
      iMax = 0, // Collection length storage for loop initialisation
      key = '', // Object iteration
      collectionType = '';

  // Verify that callBack is a function
  if (typeof callBack !== 'function') {
    throw new TypeError("forEach: callBack should be function, " + typeof callBack + "given.");
  }

  // Find out whether collection is array, string or object
  switch (Object.prototype.toString.call(collection)) {
    case "[object Array]":
      collectionType = 'array';
      break;

    case "[object Object]":
      collectionType = 'object';
      break;

    case "[object String]":
      collectionType = 'string';
      break;

    default:
      collectionType = Object.prototype.toString.call(collection);
      throw new TypeError("forEach: collection should be array, object or string, " + collectionType + " given.");
  }

  switch (collectionType) {
    case "array":
      for (i = 0, iMax = collection.length; i < iMax; i += 1) {
        callBack(collection[i], i);
      }
      break;

    case "string":
      for (i = 0, iMax = collection.length; i < iMax; i += 1) {
        callBack(collection.charAt(i), i);
      }
      break;

    case "object":
      for (key in collection) {
        // Omit prototype chain properties and methods
        if (collection.hasOwnProperty(key)) {
          callBack(collection[key], key);
        }
      }
      break;

    default:
      throw new Error("Continuity error in forEach, this should not be possible.");
  }

  return null;
}
