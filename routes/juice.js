var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var multer = require('multer');
var s3_f = require('../custom_node_modules/multer-s3');
var http = require("http");
var https = require("https");
var cp = require('child_process');
var exec = cp.exec;
var execSync = cp.execSync;
var fs = require('fs');
var sjcl = require('sjcl');
var config = global.app_config;
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var fileUpload = require('express-fileupload');
var json2csv = require('nice-json2csv');
var s3Buckets = {dev:config.aws_dev_file_bucket, qa:config.aws_qa_file_bucket, prod:config.aws_prod_file_bucket};
AWS.config.region = config.aws_region;

fileResources = global.app_config.fileResources;

AWS.config.update({accessKeyId:config.aws_access_key_id, secretAccessKey: config.aws_secret_access_key});

function propertySorter(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    };
}


var help = {};

var path = '/api_help';
help[path] = {
    description: 'Returns a list of available apis for user access (strictly programatic apis aren\'t listed). The colon is used for :PARAMETER and :OPTIONAL_PARAMETER? (? makes it optional)',
    method:'get',
    output:'json',
    admin_required:true
}
router.get(path, function(req, res){
    if(requireAdminRole(req, res)) return;
    var out = {};
    for(var path in help){
        var obj = help[path];
        if(path.indexOf('.html')!==-1){
            out[path] = obj;
        }else{
            out['/juice'+path] = obj;
        }
    }
    return res.json(out);
});

var path = '/';
help[path] = {
    description: 'Main path to load up the juice website',
    method:'get',
    output:'html',
}

var path = '/server_error.html';
help[path] = {
    description: 'Is returned when nginx has a problem accessing the node app',
    method:'get',
    output:'html',
}
var path = '/unauthenticated.html';
help[path] = {
    description: 'Page that is returned when you are not logged in',
    method:'get',
    output:'html',
}


function saveToCollection(obj, collection, res){
    db.collection(collection).save(obj, function(err){
        if(err){
            return res.json({success:false, message:'Failed to save to '+collection, err:err});
        }
        return res.json({success:true, message:'Saved to '+collection});
    });
}

//Will output the request object (avoiding circular reference error)
function test_req(req, res, next){
    var test = {};
    for(var key in req){
        if(typeof(req[key])!='object'){
            test[key] = req[key];
        }else{
            var obj = {};
            var ref = req[key];
            for(var key2 in ref){
                if(typeof(ref[key2])!='object'){
                    obj[key2] = ref[key2];
                }
            }
            test[key] = obj;
        }
    }
    return res.json(test);
}

router.use(function handleQueryFlags(req, res, next) {


    var urlPath = (req.url.split('?')[0]).split('/')[1];
    var camperOnlyRoutes = ["author", "author-program", "ancillary", "preview", "viewjson", "searchpub", "s3copy", "audio", "audiomap1", "s3save"]; //!PM 04/25/2017 removed "module", "modulette" 
//console.log("URLS", req.url, urlPath);         
    if (camperOnlyRoutes.indexOf(urlPath) >= 0) {
        if (!((urlPath == 'author' || urlPath == 's3save' || urlPath == 'searchpub') && req.body.data)) req.session.tester = false;     // reset tester session if route can be acessed from CAMPER only! Exception for POST operations that save from Juice.
    }

    if(((req.query.tester === 'true') || req.query.sb) && (config.ignore_tester_security)) {
        req.session.tester = true;
    }

    if(req.session.user && req.session.user.roles === 'Admin'){
        req.session.tester = true;
    }

    var sb = req.query.sb;
    if (sb && !req.session.tester) {
        var de_sb = sjcl.decrypt(config.quickbase_decrypt_key, JSON.stringify({
            "iv": config.quickbase_decrypt_key2,
            "v": 1,
            "iter": 10000,
            "ks": 128,
            "ts": 64,
            "mode": "ccm",
            "adata": "",
            "cipher": "aes",
            "salt": "",
            "ct": sb
        }));
        var diff = Math.abs(parseInt(de_sb) - new Date().getTime());
        if (diff < 300000) {
            req.session.tester = true;  //5 min validity window.
        }
        //TODO: Fix decryption and remove the next line
        //req.session.tester = true;
        if (!req.session.tester) {
            return res.json({
                'message': "error with tester session",
                sb: sb,
                de_sb: de_sb,
                math_abs_parse_int: Math.abs(parseInt(de_sb)),
                date: new Date().getTime(),
                diff: diff
            });
        }
    }

    var user = req.session.user;
    var allowedRoutes = ['admin_login', 'oauth_test', 'process_oauth', 'git_hash', 'GSUPC', 'gsupc', 'pilot', 'servertime', 's3programcusttime', 'connect', 'connect-login', 'connect-access-code', 'logout'];  //!PM--removed s3save
    var isCamperOnlyRoute = camperOnlyRoutes.indexOf(urlPath) !== -1;
    var isNonLoggedInRoute = allowedRoutes.indexOf(urlPath) !== -1;

    if (isCamperOnlyRoute && !req.session.tester) {
        return notLoggedIn(req, res, next);
    }

    if(isNonLoggedInRoute){
        req.allowedRoute = true;
        return next();
    }

    if(!req.session.tester) {
        if (!isNonLoggedInRoute && !user) {
            return notLoggedIn(req, res, next);
        }
        if (!isNonLoggedInRoute && user && user.providerName && !user.has_valid_access_code) {
            return notLoggedIn(req, res, next);
        }

        if (user && user.access_code) {
            var valid_access_code = true;
            if (!config.social_login_access_codes) {
                return renderTemplate(req, res, 'static-connect-access-code', {'message': 'Social access codes not accepted.'});
            }
            var access_code_config = config.social_login_access_codes[user.access_code]
            if (!access_code_config) {
                return renderTemplate(req, res, 'static-connect-access-code', {'message': 'We do not recognize the code you entered. Please check it for typos and try again.'});
            }
            if (isTimeInPast(access_code_config.account_login_date_limit)) {
                return renderTemplate(req, res, 'static-connect-access-code', {'message': 'We’re sorry! The JUICE Pilot Test Code for your account is no longer active. Please contact your academic program.'});
            }
        }

        if (user && isTimeInPast(user.access_code_experation)) {
            user.has_valid_access_code = false;
            return notLoggedIn(req, res, next);
        }
    }
    //return res.json([isNonLoggedInRoute, req.session.user]);
    return next();
});

function isSocialLogin(req){
    if(config.force_social_login){
        return true;
    }
    if(req.headers.host.indexOf('connect')!==-1){
        return true;
    }else{
        return false;
    }
}


function renderTemplate(req, res, template_name, params){

    if(!params){
        params = {};
    }
    if(!params.site_auth_type){
        if(isSocialLogin(req)){
            params.site_auth_type = 'social-auth';
        }else{
            params.site_auth_type = 'oauth-auth';
        }
    }
    if(req.session.provider_name && req.session.identifier){
        params.provider_name = req.session.provider_name;
        params.identifier = req.session.identifier;
    }
    var now = new Date();
    if(req.cookies.connect_expire_time){
	var expire = new Date(req.cookies.connect_expire_time);
	if(now > expire){
	    delete req.cookies.connect_provider_name;
	    delete req.cookies.connect_identifier;
	    delete req.cookies.connect_expire_time;
	}
    }
    params.cookies = req.cookies;
    params.user = req.session.user;
    params.fileResources = fileResources;
    //return res.json(params);

    return res.render(template_name, params);
}

function notLoggedIn(req, res, next){
    if(!isSocialLogin(req)){
        //return res.sendFile(resolve(__dirname + '/../public/unauthenticated.html'));
        return res.render('static-page-unauthenticated', {gitHash:gitHash});
    }else{
        if(req.url.indexOf('connect')>-1){
            return next();
        }else {
            return res.redirect('/juice/connect');
        }
    }
}

objSize = function(obj) {
    return Object.keys(obj).length;
};

router.use(function socialLoginValidator(req, res, next){
    if(req.session && req.session.user){
        req.session.program_id = getProgramIdFromUser(req.session.user);
    }
    if(req.allowedRoute && (req.url.indexOf('connect')===-1)){
	    return next();
    }
    var origin = req.headers.origin;
    if(!origin) {
        origin = req.headers.referer;
    }
    if(req.body && req.body.token && req.headers && origin && ((origin.indexOf('.rpxnow.com')!==-1)||(origin==="null"))){
        return handleSocialLoginToken(req, res, next);
    }
    if(req.session && req.session.user && req.session.user.providerName){
        return validateSocialAccessCode(req, res, next);
    }
    return next();
});



var janrain = require('janrain-api'),
    engageAPI = janrain(config.janrain_api_key);

function handleSocialLoginToken(req, res, next){
    engageAPI.authInfo(req.body.token, true, function(err, data) {
        if (err) {
            console.log('ERROR: ' + err.message);
            return res.json(err.message);
        } else{
            var user = data.profile;
            user.login_type = 'social';
            user.user_id = user._id = user.identifier;
            tool_consumer_instance_guid = 'social';
            user.display_name = user.displayName;
            req.session.user = user;
            return validateSocialAccessCode(req, res, next);
        }
    });
}

function validateSocialAccessCode(req, res, next){
    if(!req.session.user){
        return res.json('Error... shouldn\'t be here without access code');
    }
    var user = req.session.user;
    if(user.has_valid_access_code) {
        if(req.url==='/connect'){
            return res.redirect('/juice');
        }else {
            return next();
        }
    }

    function lowerCaseNoSpaces(str){
        return str.replace(/\s+/g, '').toLowerCase()
    }

    getUserSettingsFromUser(user, function(settings){
        if(!settings) settings = {};
        var code = settings._access_code;
        var valid_access_code = true;
        var code_from_submission = false;
        var message = null;
        if(req.body && req.body.access_code){
            code = req.body.access_code;
            code_from_submission = true;
        }
        if(!config.social_login_access_codes){
            return res.json('No access codes are in server config');
        }

        if(code) {
            for (var key in config.social_login_access_codes) {
                if (lowerCaseNoSpaces(key) === lowerCaseNoSpaces(code)) {
                    code = key;
                }
            }
        }
        var access_code_config = config.social_login_access_codes[code]
        if(!access_code_config){
            valid_access_code = false;
        }else {
            var user_properties = access_code_config.user_properties;
            if(user_properties){
                for(var key in user_properties){
                    user[key] = user_properties[key];
                }
            }
        }

	if(config.skip_social_login_access_codes === true){
	    valid_access_code = true;
	}
	
        if(valid_access_code) {
            db.collection('user_settings').find({_access_code:code}).toArray(function(err, results) {
                var count_of_users = 0;
                if (results) {
                    count_of_users = results.length;
                }
                var do_login = true;
		if(config.skip_social_login_access_codes){
		    access_code_config = {
		    };
		}
		
                if (settings._access_code === code) {
                    if (isTimeInPast(access_code_config.account_login_date_limit)) {
                        return renderTemplate(req, res, 'static-connect-access-code', {'message': 'We’re sorry! The JUICE Program Code has expired. We can’t set up your JUICE account right now.', gitHash:gitHash});
                    } else {
                        do_login = true;
                    }
                } else if (access_code_config.max_users && access_code_config.max_users <= count_of_users) {
                    return renderTemplate(req, res, 'static-connect-access-code', {'message': 'We’re sorry! The JUICE Program Code you entered is no longer active. We can’t set up your JUICE account right now.', gitHash:gitHash});
                } else if (access_code_config.account_creation_time_limit && isTimeInPast(access_code_config.account_creation_date_limit)) {
                    return renderTemplate(req, res, 'static-connect-access-code', {'message': 'We’re sorry! The JUICE Program Code has expired. We can’t set up your JUICE account right now.', gitHash:gitHash});
                }
                setUserSetting(user, '_access_code', code, function(){
                    user.has_valid_access_code = true;
                    user.access_code = code;
                    if(access_code_config.account_login_date_limit){
                        user.access_code_experation = access_code_config.account_login_date_limit;
                    }
                    if(req.url.indexOf('connect')===-1){
                        loginAsUser(req, res, user, next);
                    }else{
                        loginAsUser(req, res, user, '/juice/');
                    }
                });
            });
        }else{
            if(code){
                return renderTemplate(req, res, 'static-connect-access-code', {'message':'Invalid access code', gitHash:gitHash});
            }else{
                return renderTemplate(req, res, 'static-connect-access-code', {gitHash:gitHash});
            }
        }

    });
}

function isTimeInPast(dateTimeString){
    if(!dateTimeString){
        return false;
    }
    var now = new Date().getTime();
    var compare = new Date(dateTimeString).getTime();
    console.log('TESST', now, compare);
    if(now > compare){
        return true;
    }else{
        return false;
    }
}

path = '/connect';
help[path] = {
    description: 'Log in via access code',
    method:'get'
}
router.get(path, function connect(req, res) {
    if(!isSocialLogin(req)){
        res.send('Error: Social login not available on this server. Try connect.juiceyourskills.com');
    }
    renderTemplate(req, res, 'static-connect-social', {gitHash:gitHash});
});


path = '/connect-login';
help[path] = {
    description: 'Log in via access code',
    method:'get'
}
router.get(path, connectLogin);
router.post(path, connectLogin);
function connectLogin(req, res) {
    res.render(req.session);
    renderTemplate(req, res, 'static-connect-social', {gitHash:gitHash});
}


/*


path = '/connect-login'
help[path] = {
    description: 'Log in via social connect',
    method:'post'
}
router.post(path, connectLogin);
router.get(path, connectLogin);
function connect_access_code(req, res) {

    // return res.json(data);
}
});
}
*/




router.setDb = function(db_connection){
    db = db_connection;
}

router.get('/servertime', function(req, res) {
   res.set("Access-Control-Allow-Origin", "*");
   res.send("QBU_serverTime = " + new Date().getTime().toString());
});


router.get('/s3programcusttime/:dbid', function(req, res) {
   res.set("Access-Control-Allow-Origin", "*");
   var s3 = new AWS.S3();
   var params = {
      Bucket: config.aws_dev_file_bucket, 
      Key: "programs/" + req.params.dbid + "/program.json"
   };
   s3.headObject(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else  {
		 //console.log(data); 
         res.send("QBU_s3programcusttime = " + new Date(data.LastModified).getTime()); 
	  }          
   });
});


router.get('/files/:fname', function(req, res) {
  var fileName = req.params.fname;
  fs = require('fs');
  fs.readFile('files/'+fileName, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var dataString = data.replace(/\r/g, " ").replace(/\n/g, " "); 
	res.send(data);
  });
});



router.post(path, function connect_access_code_post(req, res){
    var access_code = req.body.access_code.trim();
    var message = '';
    var success = true;
    if(!access_code){
        success = false;
        message = 'Please enter the access code';
    }else{
        access_code = access_code.trim();
        if(!config.social_login_access_codes){
            success = false;
            message = 'No social access codes available';
        }else if(config.social_login_access_codes.indexOf(access_code)===-1){
            success = false;
            message = 'Invalid access code';
        }else{
            success = true;
            message = 'Success';
        }
    }
    renderTemplate(req, res, 'static-connect-access-code', {message:message, gitHash:gitHash});
    //config.oauth_consumer_key_mapping
});


path = '/preview/:widgetName/:fileName?'
help[path] = {
    description: 'Loads preview of a widget using a specific file',
    method:'get'
}
router.get(path, function(req, res) {
   var widgetName = req.params.widgetName;
   var fileName = req.params.fileName;
   var program = req.query["program"];
   if (program)  {
	   //program = "TEST_" + program;
   } else program = "";
   var feedbackReviewFlag = req.query["feedbackreview"];
   feedbackReviewFlag ? feedbackReviewFlag = true : feedbackReviewFlag = false; 
   console.log('feedbackReviewFlag', feedbackReviewFlag);
   var bucket = req.query["bucket"];
   var bucketName = config.fileResources;
   res.header("Cache-Control", "no-cache, no-store, must-revalidate");
   res.header("Pragma", "no-cache");
   res.header("Expires",0);
   res.render('preview', {widgetName: widgetName, fileName: fileName, bucketName: bucketName, feedbackReviewFlag:feedbackReviewFlag, paramsFromServer:JSON.stringify({user:{custom_programid: program}}), scriptTags:assembleScriptTags('preview')});
});


function walkthru(obj, parentKey) {
  var n = 0;
  Object.keys(obj).forEach(function(key,index) {
	    var val = obj[key];
		n = n + 1;
		if (parentKey && parentKey == 'rounds') {
          val.id = 'ROUND ' + n;
		}
        if (key == '$$hashKey') {
		  delete obj.$$hashKey;
	    } else if ((key == 'img')){
            obj[key] = 'IMAGE'; 
		} else {             
	        if (val && typeof val === 'object') walkthru(val, key);
        }
  });	
  return obj;
}

function jsonCleanUp(obj) {
   delete obj.general;
   delete obj.splash;
   if(obj.instructions) delete obj.instructions.image;
   return walkthru(obj);;
}



router.get('/viewjson/:widgetName/:fileName?', function(req, res) {
   var widgetName = req.params.widgetName;
   var fileName = req.params.fileName;
   var bucket = req.query["bucket"];
   var bucketName = config.fileResources;
   res.header("Cache-Control", "no-cache, no-store, must-revalidate");
   res.header("Pragma", "no-cache");
   res.header("Expires",0);
   http.get("http:" + bucketName + fileName.replace(/\./g,"/") +".txt", function(resp) {
	  
          // Buffer the body entirely for processing as a whole.
          var bodyChunks = [];
          resp.on('data', function(chunk) {
             bodyChunks.push(chunk);
          }).on('end', function() {
             var data = Buffer.concat(bodyChunks).toString();
             var content = data.replace(/\r/g, " ").replace(/\n/g, " "); 
            try {
              ms = JSON.parse(content);
            } catch (e) {
              ms = {};
            }             
	         res.send(jsonCleanUp(ms));
          });
     }).on('error', function(e) {
     });
});

path = '/author/:widgetName/:fileName?/:refKey?';
help[path] = {
    description: 'Load widget authoring tool',
    method:'get',
    output:'html'
}
router.get(path, function(req, res) {
   var widgetName = req.params.widgetName;
   var fileName = req.params.fileName;
   if (fileName=="-") fileName = "";
   if (fileName) fileName = fileName.replace(/\./g, "/")
   var refKey = req.params.refKey;
   var program = req.query["program"];
   var tableId = req.query["tableid"];
   var rid = req.query["rid"];
   res.header("Cache-Control", "no-cache, no-store, must-revalidate");
   res.header("Pragma", "no-cache");
   res.header("Expires",0);
   res.render('author', {widgetName: widgetName, fileName: fileName, refKey: refKey, programPrefix: program, tableId: tableId, rid: rid, paramsFromServer:{}, scriptTags:assembleScriptTags('author')});
});

function assembleServerParams(req) {
    var paramsFromServer = {
        overviewHeader: "Modulette Preview",
        overviewSubHeader: "Overview subheader",
        user: req.session.user
    };
    var acceptedParams = ['widgetName', 'fileName', 'modStructure', 'preview_data', 'user'];
    if (req.body.modstructure) req.body.modStructure = req.body.modstructure;
    for (var i = 0; i < acceptedParams.length; i++) {
        var param = acceptedParams[i];
        var el = null;
        if (req.query[param]) {
            el = req.query[param];
        } else if(req.body[param]) {
            el = req.body[param];
        }
        if (el) {
            if (typeof(el) == 'string') {
                try {
                    paramsFromServer[param] = JSON.parse(el);
                } catch (e) {
                    paramsFromServer[param] = el;
                }
            } else {//its not a string, its an object
                paramsFromServer[param] = el;
            }
        }
    }
    if (typeof(req.session.paramsFromServer) === 'object') {
        for (var key in req.session.paramsFromServer) {
            paramsFromServer[key] = req.session.paramsFromServer[key];
        }
    }
    paramsFromServer['user_settings'] = req.session.user_settings;

    paramsFromServer.ga_tracking_code = config.ga_tracking_code;
    paramsFromServer.program_id = req.session.program_id;
    paramsFromServer['fileResources'] = fileResources;
    paramsFromServer['server_instance'] = config.server_instance;
    paramsFromServer['slim'] = req.session.slim;
    return JSON.stringify(paramsFromServer);
}

function addServerParam(req, key, value){
    if(!req.session){
        req.session = {};
    }
    if(!req.session.paramsFromServer){
        req.session.paramsFromServer = {};
    }
    req.session.paramsFromServer[key] = value;
}

function getFileAndRender(path, moduletteName, res) {
  if (path == 'local')  {
	 fs = require('fs');
     fs.readFile('files/'+moduletteName+'.txt', 'utf8', function (err,data) {
       if (err) {
         return console.log(err);
       }
       var tocString = data.replace(/\r/g, " ").replace(/\n/g, " "); //JSON.stringify(data);
       try {
         ms = JSON.parse(tocString);
       } catch (e) {
         ms = {};
       }
	    res.render('modulette', { modStructure: tocString, overviewHeader: ms.overviewHeader, overviewSubHeader: ms.overviewSubHeader, scriptTags:assembleScriptTags()});
     });
  } else {	//S3
     //http = require('http');
     http.get(fileResources + moduletteName.replace(/\./g,"/") +".txt", function(resp) {
	  
          // Buffer the body entirely for processing as a whole.
          var bodyChunks = [];
          resp.on('data', function(chunk) {
             bodyChunks.push(chunk);
          }).on('end', function() {
             var data = Buffer.concat(bodyChunks).toString();
             var tocString = data.replace(/\r/g, " ").replace(/\n/g, " "); //JSON.stringify(data);
            try {
              ms = JSON.parse(tocString);
            } catch (e) {
              ms = {};
            }

	         res.render('modulette', { modStructure: tocString, overviewHeader: ms.overviewHeader, overviewSubHeader: ms.overviewSubHeader, scriptTags:assembleScriptTags() });
          });
     }).on('error', function(e) {
     });
  }
}

router.get('/undefined', function(req, res){
    return res.send('');
})


router.post('/author', function(req, res) {
   function extractProgramId(fileName) {
      if (fileName && fileName.indexOf('programs/') == 0) {
	      return fileName.split('/')[1];
      } else return 'juice';
   }

   var data = req.body.data.data;
   var fname = req.body.data.fname;
   var refKey = req.body.data.refKey;
   var tableId = req.body.data.tableId;
   var rid = req.body.data.rid;
    var user_token = config.qb_keys.betsytoken1; //default
    var program_id = extractProgramId(fname);
    var mapping = programIdMapping[program_id];
    if(mapping && mapping.quickbase_key_name){
        user_token = config.qb_keys[mapping.quickbase_key_name] ? config.qb_keys[mapping.quickbase_key_name] : user_token;
    }
    fname = fname.replace(/\./g, "/");
    data = data.replace(/\\n/g,"").replace(/\\t/g,"");
    var s3 = new AWS.S3({params: {Bucket: config.aws_dev_file_bucket, Key: fname+".txt"}});
    s3.upload({Body: data}, function(err) {
        if (err == null) {
            //
            //****write file name to QB****
            //
			if (tableId == ""){
				res.send("OK");
			} else {
               https.get(tableId + "?a=API_EditRecord&rid=" + rid + "&_fnm_file_name=" + fname.replace(/\//g, ".") +"&usertoken="+user_token, function(resp) {
                // Buffer the body entirely for processing as a whole.
                var bodyChunks = [];
                resp.on('data', function(chunk) {
                    bodyChunks.push(chunk);
                }).on('end', function() {
                    var data = Buffer.concat(bodyChunks).toString();
                    if (data.indexOf('<errcode>0') >= 0 ){ // if call to QB successfull 
                        res.send("OK");
                    } else {
                        res.send("ERROR: "+data);
                    }
                });
               }).on('error', function(e) {
		         var out = {success:false, 
			     e:e, 
			     url:(tableId + "?a=API_EditRecord&rid=" + rid + "&_fnm_file_name=" + fname.replace(/\//g, ".") +"&usertoken="+user_token),
			     tableId:req.body.data.tableId
			   };
                res.json(out);
              });
		  }
        } else {
            res.send("ERROR");
        }
    });


});


// using multer for multipart form encoding
// to use S3 as storage--hard-coded valuesused for testing purposes.
upload = multer({
    storage: s3_f({
        dirname: '',
        bucket: config.aws_dev_file_bucket,
        secretAccessKey: config.aws_secret_access_key,
        accessKeyId: config.aws_access_key_id,
        region: config.aws_region,
        contentType: s3_f.AUTO_CONTENT_TYPE,
        filename: function (req, file, cb) {
            cb(null, req.body.fname);
        }
    })
});


// using multer for multipart form encoding
// to use S3 as storage
uploadAudio = multer({
    storage: s3_f({
        dirname: '',
        bucket: config.aws_narration_bucket,
        secretAccessKey: config.aws_secret_access_key,
        accessKeyId: config.aws_access_key_id,
        region: config.aws_region,
        contentType: s3_f.AUTO_CONTENT_TYPE,
        filename: function (req, file, cb) {
            var arr = (req.query.prefix + file.originalname).split(".");
            var fn;
            if (arr.length > 2) { //if there is more than one "." in the name
                for (var i = 0; i < arr.length - 1; i++) {
                    fn ? fn = fn + "/" + arr[i] : fn = arr[i];
                }
                fn = fn + "." + arr[arr.length - 1];
            } else fn = file.originalname;

            cb(null, fn);
        }
    })
});

	// using multer for multipart form encoding
// to use S3 as storage
uploadImages = multer({
    storage: s3_f({
        dirname: '',
        bucket: config.aws_dev_file_bucket,
        secretAccessKey: config.aws_secret_access_key,
        accessKeyId: config.aws_access_key_id,
        region: config.aws_region,
        contentType: s3_f.AUTO_CONTENT_TYPE,
        filename: function (req, file, cb) {
			var ofn = file.originalname;
			var modId = req.query.modprefix;
			if (ofn.indexOf(modId) != 0) ofn = modId + ofn; //add correct bucket name (module or modulette prefix) if not included in the file name 
			if (req.query.prefix) ofn = req.query.prefix + ofn;			
            var arr = ofn.split(".");
            var fn;
            if (arr.length > 2) { //if there is more than one "." in the name
                for (var i = 0; i < arr.length - 1; i++) {
                    fn ? fn = fn + "/" + arr[i] : fn = arr[i];
                }
                fn = fn + "." + arr[arr.length - 1];
            } else fn = ofn;
            cb(null, fn);
        }
    })
});


router.post('/ancillary', upload.single('fileToUpload'), function(req, res) {
	var table = req.body.table;
	if (!table){
		res.send("<p>Your file was successfully uploaded</p>"); //<input type='button' value='Close' onclick='window.history.go(-2)'/>");  //not necessarly successsful!!!
	} else {
	    res.send("<p>Your file was successfully uploaded</p>"); //<input type='button' value='Close' onclick='window.location.replace(\"https://QUICKBASE_INSTANCE.quickbase.com/db/" + table + "?a=td\")'/>");
	}
});

router.post('/audio', uploadAudio.array('fileToUpload'), function(req, res) { //
    res.send("<p>Your files were successfully uploaded</p>");  //not necessarly successsful!!! // <input type='button' value='Close' onclick='window.history.go(-2)'/>
});

router.post('/images', uploadImages.array('fileToUpload'), function(req, res) { //
    res.send("<p>Your images were successfully uploaded</p>");  //not necessarly successsful!!!
});


//to use local storage

/*var storage = multer.diskStorage({
   destination: './',
   filename: function (req, file, cb) {
	   console.log("---", req.body.fname);
	   cb(null, req.body.fname);
   }
});*/
//var upload = multer({ storage: storage});
//router.use(upload.single('fileToUpload'));


/*function audiomapCallback(err, counter){
	if (err == null) {
         //res.send("<p>Your files were successfully uploaded</p><input type='button' value='Close' onclick='window.history.go(-2)'/>");
		 console.log("OK");
      } else {
         console.log("ERROR");
      }
}*/

router.post('/audiomap', function(req, res) {
   var data = JSON.parse(req.body.data);
   //var fname = req.body.fname;
   for (var prefix in data) {
	  var fname = data[prefix].metadata.file.replace(/\./g, "/")+"_audio-manifest.txt";
	  //console.log(fname);
	  //console.log(JSON.stringify(data[prefix]));
      var s3 = new AWS.S3({params: {Bucket: config.aws_narration_bucket, Key: fname}});
      s3.upload({Body: JSON.stringify(data[prefix])}, function(err) {
        if (err == null) {
         //res.send("OK");
        } else {
         //res.send("ERROR");
        }
     });
	}
	res.send("<p>Your files were successfully uploaded</p><input type='button' value='Close' onclick='window.history.go(-2)'/>");
});


router.post('/audiomap1', function(req, res) {
   res.setHeader("Access-Control-Allow-Origin", "*");
   var data = req.body.data;
   var fname = req.body.fname;
   console.log(fname);
   var s3 = new AWS.S3({params: {Bucket: config.aws_narration_bucket, Key: fname}});
   s3.upload({Body: data}, function(err) {
        if (err == null) {
          res.send("<i>" + fname + "</i>" + " uploaded succesfully");
        } else {
          res.send("ERROR UPLOADING" + "<i>" + fname + "</i>");
        }
   });
});



var record_fields = [
    'data', 'widget_name', 'widget_data_file', 'session_id', 'complete','modulette_name', 'tab_id', 'track_id', 'started', 'module_id', 'modulette_id', 'competencies', 'competencies_id', 'subcompetencies', 'subcompetencies_id'
];
function getUser(req){
    var user = {
        user_id: 'not_logged_in',
        custom_source: 'none'
    }
    if( req.session && req.session.user && req.session.user.user_id){
        user = req.session.user;
    }
    if(!user.custom_source){
        user.custom_source = 'none';
    }
    return user;
}

function getUserId(req){
    var user = getUser(req);
    return user.user_id;
}

function skipOldRecords(params){
    applyDefaultsToSortParams(params);
    if(params.random){
        //if this just need to keep under about 100, then only test and delete randomly 1 out of a hundred times
        var r = Math.random()*params.limit;
        console.log(r, params.limit -1)
        if(r > params.limit - 1){
            // then we will check and remove extra records
        }else{
            return ; // do nothing
        }
    }

    db.collection(params.collection).find(params.query).sort(params.sort).limit(params.limit).toArray(function(err, objects) {
        console.log('testing length', objects.length, params.limit)
        if(objects.length < params.limit){
            return;//nothing to do here;
        }
        var object = objects[objects.length - 1];
        if(object){
            var d = object.date;
            var remove = {};
            remove[params.sort_field] = {$lt: d};
            db.collection(params.collection).remove(remove);
        }
    });
}

var outputFilteringHelp = 'Example of sorting, filtering, limiting: ?limit=2&sort_field=roles&sort_order=1&$context_id=juicetestaccount ' +
    '(note the $ for filtering by field value). You can also say something like $context_id=THIS,THAT to do an OR query, or put ' +
    '$context_id=!NOT_THIS to exclude things';
// params is an object with possible fields: *collection, limit[100], *sort_field, sort_order[-1], query[{}]
function outputTop100FromCollection(req, res, params){
    if(requireAdminRole(req, res)) return;
    params = applyDefaultsToSortParams(params, req);
    if(req.query.show_query) {
        return res.json(params.query);
    }
    if(!params.limit){
	params.limit = 100;
    }
    if(!(params.limit < 5000)){
	params.limit = 5000;
    }

    db.collection(params.collection).find(params.query).sort(params.sort).limit(params.limit).toArray(function(err, objects) {
        res.json({success:true, objects:objects});
    });
}

function requireAdminRole(req, res, message){
    if(!message) message = 'You must be logged in as a user with an Admin role to see this page';
    var user = getUser(req);
    if(!user || (user.roles != 'Admin')){
        res.status(403).send(message);
        return true;
    }
    return false; //all good
}

function applyDefaultsToSortParams(params, req){
    if(typeof(req)!=='undefined') {
        for (var key in req.params) {
            if (typeof(params[key]) === 'undefined') {
                params[key] = req.params[key];
            }
        }
    }

    if(!params.sort_order){
        params.sort_order = -1
    }
    if(!params.query){
        params.query = {};
    }

    params.limit = params[key] ? Number(params[key]) : 100;
    if(req.query.limit){
        params.limit = Number(req.query.limit);
    }
    if(req.query.sort_order){
        params.sort_order = Number(req.query.sort_order);
    }

    if(req.query.sort_field){
        params.sort_field = req.query.sort_field;
    }

    if(!params.sort) {
        params.sort = {};
        params.sort[params.sort_field] = params.sort_order;
    }

    console.log(params);

    if(req.query){
        for(var key in req.query){
            var value = req.query[key];
            if(key.substr(0,1) == '$'){
                key = key.substr(1);
                if(typeof(params.query.$and) === 'undefined'){
                    params.query.$and = [];
                }

                var values = value.split(',');
                values.forEach(function(val){
                    var constraint = {};
                    var ne = false;
                    if(val.substr(0,1)==='!'){
                        val = val.substr(1);
                        ne = true;
                    }
                    if(ne) {
                        constraint[key] = {$ne: val};
                    } else {
                        constraint[key] = {$eq: val};
                    }
                    params.query.$and.push(constraint);
                });
            }
        }
    }

    return params;
}


router.post('/js_error', function js_record(req, res){
    if(!req.body) {
        return res.json({success: false, message: 'I ain\'t got nobody'});
    }
    var record = {
        module:req.body.module,
        message:req.body.message,
        date:new Date()
    };
    db.collection('js_errors').insertOne(record);
    skipOldRecords({collection: 'js_errors', sort_field: 'date', limit: 100, random:true});
    return res.json({success:true});
});



path = '/js_errors';
help[path] = {
    description: 'Get the 100 most recent errors. (older records are automatically deleted). '.outputFilteringHelp,
    method:'get',
    output:'json',
    admin_required:true
}
router.get('/js_errors', function outputErrors(req, res) {
    outputTop100FromCollection(req, res, {collection: 'js_errors', sort_field: 'date'});
    skipOldRecords({collection: 'js_errors', sort_field: 'date', limit: 100, random:true});
});

path = '/logins/:limit?';
help[path] = {
    description: 'Get the n most recent logins.'+outputFilteringHelp,
    method:'get',
    output:'json',
    admin_required:true,
    parameters:{limit:'Number of results to return. Default is 100'}
}
router.get(path, function outputErrors(req, res) {
    outputTop100FromCollection(req, res, {collection: 'logins', sort_field: 'date'});
});


path = '/feedback/:limit?';
help[path] = {
    description: 'Get the n most recent feedback messages. '+outputFilteringHelp,
    method:'get',
    output:'json',
    admin_required:true,
    parameters:{limit:'Number of results to return. Default is 100'}
}
router.get(path, function outputErrors(req, res) {
    outputTop100FromCollection(req, res, {collection: 'feedback', sort_field: 'date'});
});
router.post(path, function postFeedback(req, res){
    if(!req.body.text){
        return res.json({success:false, message:'Please enter a feedback message'})
    }
    var user = getUser(req);
    var obj = {
        date: new Date(),
        user: getUserId(req),
        context_id: user.context_id,
        program_id: getProgramIdFromUser(user),
        roles: user.roles,
        text: req.body.text.split('\n'),
        url: req.body.url
    };
    saveToCollection(obj, 'feedback', res);
});

path = '/searches/:limit?'
help[path] = {
    description: 'Get the 100 most recent searches. '+outputFilteringHelp,
    method:'get',
    output:'json',
    admin_required:true,
}
router.get(path, function outputErrors(req, res) {
    outputTop100FromCollection(req, res, {collection: 'searches', sort_field: 'date'});
});


function incrementProperty(obj, property){
    if(!obj[property]){
        obj[property] = 1;
    }else{
        obj[property]++;
    }
    return obj[property];
}


path = '/try_it_user_report'
help[path] = {
    description: 'Get report data for try it/guided practic',
    method:'get',
    output:'json',
    get_parameters:['filePath','contextId','startDate','endDate'],
    admin_required:true
}

function drillDown(obj, path_array){
    if(path_array.length === 0){
        return obj;
    }
    if(path_array.length === 1){
        return obj[path_array[0]];
    }

    if(typeof(obj[path_array[0]])==='undefined'){
        return;
    }
    return drillDown(obj[path_array[0]], path_array.slice(1));
}

router.get(path, function tryItUserReport(req, res) {
    if (requireAdminRole(req, res)) return;
    var query = buildTryItReportQuery(req, res);

        var s3FilePath = 'http:' + fileResources + req.query.filePath.replaceAll('.', '/') + '.txt';
        loadJsonFile(s3FilePath, function (fileData) {
            getMappedUsersList({}, function(users) {
                db.collection('records').find(query).toArray(function(err, records) {
                    mergeRecordsUsersQObjectsAndSteps(records, fileData, users, function cb(data) {
                        if(req.query.json) {
                            return res.json(data);
                        } else {
                            return res.csv(data, 'TryItUserReport.'+req.query.filePath+'.csv');
                        }

                    })
                });
            });
        });
});

function createRowTemplateFromFileData(fileData){
    var row = {
        user_id: "USER_ID",
        name: "NAME",
        date: "DATE"
    };


    fileData.steps.forEach(function(step, index){
        step.stepText = '';
        var questionTextFields = ['headerText', 'leftText', 'rightText'];
        questionTextFields.forEach(function(field){
            if(step[field]){
                step.stepText+= step[field];
            }
        })

        var pattern = /ju-[a-z][a-z]\=\"([a-z0-9\_\-]+)/g
        var results = step.stepText.match(pattern);
        if(results){
            results.forEach(function(result){
                if(!result) return;
                var question_id = result.split('"')[1].substr(0, 39);
                var short_id = question_id.substr(0,7);
                var column_header = 'step'+(index+1)+':'+short_id;
                row[column_header] = question_id;
            })
        }
    });
    return row;
}

function mergeRecordsUsersQObjectsAndSteps(records, fileData, users, callback) {
    var out = [];
    //return callback(fileData);
    var rowTemplate = createRowTemplateFromFileData(fileData);
    //return callback(rowTemplate);
    //return callback(records);
    records.forEach(function(record){
        var user = users[record.user_id];
        var row = {
            user_id: record.user_id,
            name: user ? user.lis_person_name_full : 'No user found',
            date: record.last_updated.toISOString()
        };
        for(var key in rowTemplate){
            if(!row[key]) {
                row[key] = rowTemplate[key];
            }
        }


        // collect question data from record
        // These steps will not match file data exactly if new steps are added
        var steps = drillDown(record, ['data', 'steps']);
        if ((!steps) || (!isArray(steps))) {
            return; //nothing to do on this record
        }
        var question_data = {};
        steps.forEach(function (step, index) {
            if(isArray(step.questions)){
                step.questions.forEach(function(question){
                    var value = 'N';
                    if(isArray(question.tries)){
                        question.tries.forEach(function(tri, index){
                            if(value === 'N'){
                                value = 0;//we have at least one answer
                            }
                            if(isArray(tri.correct)){
                                var correct = true;
                                tri.correct.forEach(function(c){
                                    if(!c){
                                        correct = false;
                                    }
                                });
                                tri.correct = correct;
                            }
                            if(tri.correct===true){
                                value = index+1;
                            }
                        });
                    }
                    question_data[question.id] = value;
                })
            }
        });

        //fill in the row data using the question data matching the columns
        for(var key in row){
            if(key.substr(0,4)==='step'){
                var question_id = row[key];
                row[key] = question_data[question_id];
            }
        }
        //go through record steps and record quests
        out.push(row);
    });

    return callback(out);
}

function makeColumnHeader(step_index, question_id) {
    var id_length = 8; //for quesiton_ids
    var step_name = 'step' + (step_index + 1);
    return step_name + ':' + question_id.substr(0, id_length)
}

function getMappedUsersList(query, callback){
    db.collection('users').find({}).toArray(function(err, user_records) {
        var users = {};//lets make a simple lookup for users
        user_records.forEach(function (user) {
            users[user.user_id] = user;
        });
        callback(users);
    });
}


path = '/try_it_report_data'
help[path] = {
    description: 'Get report data for try it/guided practic',
    method:'get',
    output:'json',
    get_parameters:['filePath','contextId','startDate','endDate'],
    admin_required:true
}

router.get(path, tryItReportData);

function tryItReportData(req, res) {

    //return res.json(req.params);
    if(requireAdminRole(req, res)) return;

    var query = buildTryItReportQuery(req, res);
    getReportDataFromQuery(query, function cb(data){
        res.json(data)
    });
}

function getReportDataFromQuery(query, callback){
    db.collection('records').find(query).toArray(function(err, results) {
        //return res.json(results);
        var users = {};
        var out = {};
        var summary = {
            number_of_records: results.length,
            unique_user_count: 0,
            count_completed: 0,
            percent_complete: null,
            total_duration_ms: 0,
            total_steps_complete: 0,
            counts_on_each_try: [0, 0, 0],
            successes_on_each_try: [0, 0, 0],
            success_rates_for_tries: [0, 0, 0]
        }
        out.summary = [];
        var steps = out.steps = [];
        var q_objs = out.q_objs = {};
        var counts_on_each_try = summary.counts_on_each_try;
        var successes_on_each_try = summary.successes_on_each_try;
        results.forEach(function (record) {
            incrementProperty(users, record.user_id);
            if (record.complete) {
                summary.count_completed++;
            }
            summary.total_duration_ms += record.duration_ms;
            if (record.data.steps) {
                summary.total_steps_complete += record.data.steps.length ? record.data.steps.length : 0;
                record.data.steps.forEach(function (step, s_index) {
                    if (!out.steps[s_index]) {
                        out.steps[s_index] = {questions: {}}
                    }
                    var s_obj = out.steps[s_index];

                    if (step.questions) {
                        step.questions.forEach(function (question, q_index) {
                            if (q_objs[question.id]) {
                                s_obj.questions[question.id] = q_objs[question.id];
                            }
                            if (!s_obj.questions[question.id]) {
                                s_obj.questions[question.id] = {
                                    try_counts: [],
                                    total_tries: 0,
                                    unsuccessful_count: 0
                                };
                            }
                            q_objs[question.id] = s_obj.questions[question.id];
                            var q_obj = s_obj.questions[question.id];
                            if (!q_obj.user_answers_table) {
                                q_obj.user_answers_table = [];
                            }
                            if (question.tries) {
                                var record_id = record._id;
                                var user_answer_row = null;
                                q_obj.user_answers_table.forEach(function (row) {
                                    if (row.record_id === record._id) {
                                        user_answer_row = row;
                                    }
                                });
                                if (!user_answer_row) {
                                    user_answer_row = {
                                        record_id: record._id,
                                        user_id: record.user_id,
                                        date: record.last_updated,
                                        tries: []
                                    }
                                    q_obj.user_answers_table.push(user_answer_row);
                                    q_obj.user_answers_table.sort(propertySorter('-date'));
                                }
                                q_obj.total_tries += question.tries.length;
                                var has_success = false;
                                question.tries.forEach(function (tri, index) {
                                    if (!q_obj.try_counts[index]) {
                                        q_obj.try_counts[index] = {try_count: 0, correct_count: 0}
                                    }
                                    try_counts_obj = q_obj.try_counts[index];
                                    incrementProperty(try_counts_obj, 'try_count');
                                    if (index > 2) {
                                        return;//we don't track past this point
                                    }

                                    counts_on_each_try[index]++;
                                    if (isArray(tri.correct)) {
                                        var correct = true;
                                        tri.correct.forEach(function (c) {
                                            if (!c) {
                                                correct = false;
                                            }
                                        });
                                        tri.correct = correct;
                                    }

                                    if (tri.correct) {
                                        has_success = true;
                                        successes_on_each_try[index]++;
                                        incrementProperty(try_counts_obj, 'correct_count');
                                    } else {
                                        incrementProperty(try_counts_obj, 'failed_count');
                                    }
                                    if (!try_counts_obj.answers) {
                                        try_counts_obj.answers = [];
                                    }


                                    if (isArray(tri.answer_text)) {
                                        tri.answer_text = tri.answer_text.join(',');
                                    }

                                    if (isArray(tri.answer)) {
                                        tri.answer_text = tri.answer.join(',');
                                        tri.answer = '';
                                    }

                                    if (typeof(tri.answer_text) !== 'string') {
                                        tri.answer_text = tri.answer[0];
                                        tri.answer = '';
                                        if (tri.answer_text === '') {
                                            tri.answer_text = 'NO ANSWER';
                                        }
                                    } else {
                                        if ((!tri.answer) && (tri.answer !== 0)) {
                                            tri.answer = '';
                                        } else {
                                            tri.answer = '' + (tri.answer + 1) + ': '
                                        }
                                    }
//                                  tri.answer_text = String(tri.answer_text);

                                    if (!tri.answer_text) {
                                        tri.answer_text = '';
                                    }

                                    var answer_text = '' + tri.answer + (tri.answer_text.substr(0, 15));
                                    var answer_long_text = '' + tri.answer + (tri.answer_text.substr(0, 100));
                                    var answer_obj = null;
                                    try_counts_obj.answers.forEach(function (cur_answer) {
                                        if (cur_answer.long_text == answer_long_text) {
                                            answer_obj = cur_answer;
                                            answer_obj.count++;
                                        }
                                    });
                                    if (!answer_obj) {
                                        answer_obj = {
                                            text: answer_text,
                                            long_text: answer_long_text,
                                            correct: tri.correct,
                                            count: 1
                                        }
                                        try_counts_obj.answers.push(answer_obj);

                                    }
                                    try_counts_obj.answers.sort(propertySorter('-count'));
                                    var total_answer_count = 0;
                                    try_counts_obj.answers.forEach(function (answer) {
                                        total_answer_count += answer.count;
                                    });
                                    try_counts_obj.answers.forEach(function (answer) {
                                        answer.percent = Math.round(100 * (answer.count / total_answer_count)) + '%';
                                    });

                                    user_answer_row.tries.push({
                                        text: answer_text,
                                        long_text: answer_long_text,
                                        correct: tri.correct
                                    });

                                });
                                if (!has_success) {
                                    incrementProperty(q_obj, 'unsuccessful_count');
                                }
                            }
                        });
                    }
                });
            }
        });
        for (var key in users) {
            summary.unique_user_count++;
        }
        counts_on_each_try.forEach(function (count, index) {
            summary.success_rates_for_tries[index] = Math.round(100 * (successes_on_each_try[index] / counts_on_each_try[index])) + '%';
            if (counts_on_each_try[index] === 0) {
                summary.success_rates_for_tries[index] = 'No Tries';
            }
        })
        summary.total_time_spent = msToTime(summary.total_duration_ms);
        summary.average_time_spent = msToTime(summary.total_duration_ms / summary.number_of_records);
        summary.percent_complete = Math.round(100 * (summary.count_completed / summary.number_of_records)) + '%';
        delete summary.total_duration_ms;
        for (var key in summary) {
            var value = summary[key];
            if (isArray(value)) {
                var new_value = '(';
                var first = true;
                value.forEach(function (el) {
                    if (!first) {
                        new_value += ', ';
                    }
                    first = false;
                    new_value += el;
                });
                new_value += ')';
                value = new_value;
            }
            out.summary.push({key: toTitleCase(key.replaceAll('_', ' ')), value: value});
        }
        return callback(out);
    });
}



function buildTryItReportQuery(req, res){
    var query = {
        widget_data_file:req.query.filePath,
        $and: []
    };

    //filter out test users
    if(config.test_user_filters && config.server_instance !== 'dev'){
        for(var val in config.test_user_filters){ //key/value is reversed in config
            var property = config.test_user_filters[val];
            var constraint = {};
            constraint[property] = {$ne: val};
            query.$and.push(constraint);
        }
    }

    ['roles', 'context_id', 'tool_consumer_instance_guid'].forEach(function(field){
        if(req.query[field]) {
            query[field] = req.query[field];
        }
    });

    if(req.query.start_date){
        query.$and.push(
            {
                last_updated:{$gt: new Date(req.query.start_date + ' GMT')}
            }
        );
    }
    if(req.query.end_date){
        query.$and.push(
            {
                last_updated:{$lt: new Date(req.query.end_date + ' GMT')}
            }
        );
    }

    if(req.query.custom_field && req.query.custom_value) {
        if(req.query.custom_field === 'complete'){
            req.query.custom_value = (req.query.custom_value === 'true');
        }
        query[req.query.custom_field] = req.query.custom_value;
    }

    if(query.$and.length === 0){
        delete query.$and;
    }

    return query;
}

function isArray(thing){
    return (Object.prototype.toString.call( thing ) === '[object Array]');
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
function msToTime(ms)
{
    var secs = Math.round(ms/1000);
    secs = Math.round(secs);
    var hours = Math.floor(secs / (60 * 60));

    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);

    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);

    var obj = {
        "h": hours,
        "m": minutes,
        "s": seconds
    };
    return '' + obj.h + 'h:' + obj.m + 'm:' + obj.s + 's';
    //return obj;
}


router.post('/record', record);
function record(req, res){
    if(!req.body) {
        return res.json({success: false, message: 'I ain\'t got nobody'});
    }

    var user = getUser(req);
    var user_id = user.user_id;
    var custom_source = user.custom_source;
    var short_user_id = user.short_user_id;
    var record = {
        user_id:user_id,
        short_user_id:short_user_id,
        program_id: getProgramIdFromUser(user),
        last_updated:new Date(),
        custom_source:custom_source,
        context_id:user.context_id,
        roles:user.roles,
        custom_JUICEgroup: user.custom_JUICEgroup,
        tool_consumer_instance_guid: user.tool_consumer_instance_guid,
        custom_source: user.custom_source //project id
    }

    for(var i = 0; i<record_fields.length; i++) {
        var field = record_fields[i];
        var value = req.body[field];
        if (!value) {
            continue;
            //return res.json({success: false, message: 'No ' + field + ' in post body'});
        }
        if(field == 'session_id'){
            field = '_id';
        }


        if(field=='complete'){
            if(value=='false'){
                value = false;
            }else{
                value = true;
            }
        }

        if(field=='data') {
            try {
                value = JSON.parse(req.body.data);
            } catch (e) {
                return res.json({success: false, message: 'Error parsing data'});
            }
        }

        if(field=='started') {
            value = new Date(req.body.started);
        }

        //all other fields just set (no parsing needed)
        record[field] = value;
    }

    record.duration_ms = record.last_updated.getTime() - record.started.getTime();
    db.collection('records').updateOne({_id:record._id}, record, {upsert:true}, function updateRecordCallback(err, result){
        if(!err){
            res.json({success:true, message:'Record saved', record:record});
            handleRecord(record);
        }else{
            res.status(500);
            res.json({success:false, err:err, result:result})
        }
    });
};

function handleRecord(record){
    updateUserProgress(record);
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function updateUserProgress(record){
    var path_fields = ['module_id', 'modulette_id', 'tab_id', 'track_id'];
    db.collection('progress').findOne({_id:record.user_id}, function(err, data){
        if(!data){
            data = {_id:record.user_id};
        }
        function drillDown(path_fields, obj_pointer){
            var key = path_fields.shift();
            if(!key){
                //we went through all of the fields, now set the progress values;
                var duration_record = {duration_ms:record.duration_ms, last_updated: new Date()};
                if(!obj_pointer.started){
                    //never saved before
                    obj_pointer.complete = record.complete ? true : false;
                    obj_pointer.durations = {};

                    obj_pointer.durations[record._id] = duration_record;
                }else{
                    //it was saved before;
                    if(record.complete){
                        //we never update to false. Only change if true.
                        obj_pointer.complete = true;
                    }
                    obj_pointer.durations[record._id] = duration_record;
                }
                obj_pointer.started = true;
                var duration = 0;
                for(var key in obj_pointer.durations){
                    var dur = obj_pointer.durations[key];
                    if(typeof(dur)==='number'){
                        duration += dur;
                    }else{//object
                        duration += dur.duration_ms;
                    }
                }
                obj_pointer.duration_ms = duration;
                obj_pointer.last_updated = new Date();
                return; // we drilled down through the object, set the values, and now we are done.
            }
            var obj_key = record[key].replaceAll('\.', '_');
            if(!obj_pointer[obj_key]){
                obj_pointer[obj_key] = {};
            }
            drillDown(path_fields, obj_pointer[obj_key]);
        }
        drillDown(path_fields, data);
        db.collection('progress').save(data, function(err){
            if(err){
                console.log('error saving progress', err);
            }
        });
    });

    //do something to update progress.
}

path = '/logout'
help[path] = {
    description: 'Log out current user and redirect to /juice/',
    method:'get',
    output:'redirect'
}
router.get(path, function logout(req, res){
    if(req.session.user) {
        var provider_name = (req.session.user.providerName + '').replace('+', '');
        var identifier = req.session.user.identifier;
        if (identifier) {
            identifier = identifier.split('.com')[0] + '.com';
        }
        if (provider_name && provider_name !== 'undefined') {
	    var expireTime = 10000
	    var expireDate = new Date(Number(new Date()) + (expireTime));
            res.cookie('connect_provider_name', provider_name);
            res.cookie('connect_identifier', identifier);
	    res.cookie('connect_expire_time', expireDate);//IE doesn't handle max age, so we are doing it ourselves
        }
    }
    req.session.destroy();

    if(isSocialLogin(req)) {
        return res.redirect('/juice/connect');
    }else{
        return res.redirect('/juice');
    }
});


path = '/progress'
help[path] = {
    description: 'Get current logged in user\'s progress',
    method:'get',
    output:'json',
}
router.get(path, function outputRecords(req, res){
    var user_id = getUserId(req);
    db.collection('progress').findOne({_id:user_id}, function(err, progress) {
        res.json({success:true, progress:progress});
    });
});

path = '/get_time'
help[path] = {
    description: 'Get the server\'s time',
    method:'get',
    output:'json',
}
router.get('/get_time', function(req, res){
    res.json({datetime:new Date()})
});



path = '/records/:limit?'
help[path] = {
    description: 'Get the n most recent widget session data records. /juice/records?$roles=Student,!Admin would return results with students, but no admins. '+outputFilteringHelp,
    method:'get',
    output:'json',
    admin_required:true,
    parameters:{limit:'Number of results to return. Default is 100'}
}
router.get(path, function outputRecords(req, res){
    outputTop100FromCollection(req, res, {collection:'records', sort_field:'last_updated'});
});


path = '/records/:field/:value/:limit?'
help[path] = {
    description: 'Get the n most recent widget session data records filtering to objects with a specific field/value',
    method:'get',
    output:'json',
    admin_required:true,
    parameters:{
        limit:'Number of results to return. Default is 100',
        field:'Field to search on (only top level object values)',
        value:'Value that field must match'
    }
}
router.get(path, function outputRecords(req, res){
    if(requireAdminRole(req, res)) return;
    var query = {};
    var value = req.params.value;
    value = value === 'true' ? true : value;
    value = value === 'false' ? false : value;
    query[req.params.field] = value;
    var limit = req.params.limit ? Number(req.params.limit) : 100;
    db.collection('records').find(query).sort({ last_updated: -1 }).limit(limit).toArray(function(err, records) {
        res.json({success:true, records:records});
    });
});

path = '/record'
help[path] = {
    description: 'Output a form for submitting a record manually',
    method:'get',
    output:'html',
    admin_required:true,
}
/* Output a form for submitting a record manually
 */
router.get(path, function recordForm(req, res){
    if(requireAdminRole(req, res)) return;
    var out = [
        '<html><head></head><body>',
        '<form method="post">',
    ];
    record_fields.forEach(function(field){
        if(field=='data') return;//continue
        out.push(field + ' <input type="text" name="' + field + '"><br>');
    })
    out.push('Data <textarea name="data"></textarea><br>');
    out.push('<input type="submit"></body></html>');
    out = out.join('\n');
    res.send(out);
});


path = '/social_login_access_codes'
help[path] = {
    description: 'Get social login access code data - admins only',
    method:'get',
    output:'json',
}
router.get(path, function social_login_access_codes(req, res){
    if(requireAdminRole(req, res)) return;
    return res.json({
        social_login_access_code_loaded_timestamp: social_login_access_code_loaded_timestamp,
        social_login_data_source: social_login_data_source,
        social_login_access_codes: config.social_login_access_codes
    });
});

function stringToBoolean(str){
    if(str==='true' || str==='1'){
        return true;
    }
    if(str==='false' || str==='0'){
        return false;
    }
}



path = '/my_records/:limit?'
help[path] = {
    description: 'Get the n most recent widget session data records filtering to objects with a specific field/value',
    method:'get',
    output:'json',
    admin_required:true,
    parameters:{
        limit:'Number of results to return. Default is 100',
    }
}
router.get(path, function getMyRecords(req, res){
    var possible_fields = ['widget_data_file', 'complete'];
    var booleans = ['complete'];
    var user_id = getUserId(req)
    var query = {user_id:user_id};
    for(var key in req.query){
        if(possible_fields.indexOf(key)!==-1){
            var value = req.query[key];
            if(booleans.indexOf(key)!==-1){
                value = stringToBoolean(value);
            }
            query[key] = value;
        }
    }
    var limit = 100;
    if(req.params.limit) req.query.limit = req.params.limit;
    if(req.query.limit){
        limit = Number(req.query.limit);
        if( !( (limit > 0) && (limit<100) ) ){
            limit = 100;
        }
    }
    db.collection('records').find(query).sort({ last_updated: -1 }).limit(limit).toArray(function(err, records) {
        if(records.length){
            return res.json({success:true, records:records})
        }else {
            res.json({success: false, records: records, err:err});
        }
    });
});


router.post('/s3save', s3Save);
router.get('/s3save', s3Save);
function s3Save(req, res) {
    //if(requireAdminRole(req, res)) return;
    if (!req.body || !req.body.data) {
        return res.json({success: false, message: 'No data in post body'});
    }
    var data = req.body.data;
    var fname = req.body.fname;
    fname = fname.replace(/\./g, "/");
    if (fname.indexOf('/json') !== -1) {
        fname = fname.replace('/json', '.json');
    } else {
        fname += '.txt';
    }
    var s3 = new AWS.S3({params: {Bucket: config.aws_dev_file_bucket, Key: fname}});
    s3.upload({Body: data}, function (err, result) {
        if (err == null) {
            //writeToQB(fname, refKey);
            var out = [
                '<html><body>',
                '<p>Successfully Published!</p>',
                '<p>S3 File link: <a href="' + result.Location + '">' + result.Location + '</a></p>'
            ];
            if (req.body.link) {
                out.push('<p>You can view the published content at <a href="' + req.body.link + '">' + req.body.link + '</a></p>');
            }
            out.push('</body></html>');
            out = out.join('');
            res.send(out);
        } else {
            console.log('s3 error', err);
            res.json({success: false, err: err});
        }
    });
}

//SEARCH POC pubsearch
//
router.post('/searchpub', searchpub);
router.get('/searchpub', searchpub);
function searchpub(req, res){
    if(!req.body || !req.body.data){
        return res.json({success:false, message:'No data in post body'});
    }
    var data = req.body.data;
    var dataObj = JSON.parse(data);
    var search_collections = ['modulettes', 'ancillary_files', 'modules'];
    search_collections.forEach(function(collection){
        var collection_name = 'search_'+collection;
        var program_id = req.body.program_id;
        if(collection_name === 'search_ancillary_files' && program_id==='juice'){
            program_id = 'global';
        }
        db.collection(collection_name).remove({$or : [{program_id:program_id}, {program_id: {$exists:false}}]}, function(){
            var items = dataObj[collection];
            if(items.length && items) {
                db.collection(collection_name).insertMany(items, function () {
                    reindex(collection);
                });
            }
        });
    });
    var program_id = req.body.program_id;
    res.json({success:true, program_id:program_id, weights:config.index_weights});
}

function reindex(collection_or_collections){
    var c = collection_or_collections;
    if(typeof(c)==='undefined'){
        c = ['modulettes', 'ancillary_files', 'modules'];
    }
    if(typeof(c)==='string'){
        c = [c];
    }
    c.forEach(function(collection){
        var collection_name = 'search_'+collection;
        db.collection(collection_name).dropIndexes(function dropIndexesCallback(){
            var index_name = "TextSearch";
            db.collection(collection_name).dropIndex(index_name, function dropIndexCB(){
                var options = {weights:config.index_weights[collection], name:index_name};
                var indexes = {};
                Object.keys(config.index_weights[collection]).forEach(function(key){
                    indexes[key] = "text";
                });
                db.collection(collection_name).createIndex(indexes, options);
            });
            /*
            var index2 = 'program_id';
            db.collection(collection_name).dropIndex(index2, function dropIndexCB(){
                var options = {name:index_name};
                db.collection(collection_name).createIndex({program_id:1}, options);
            });
            */
        });
    });
}

path = '/dosearch';
help[path] = {
    description: 'Search modules, modulettes & files. The results power the search page',
    method:'get',
    output:'json'
}
var last_search = new Date().getTime();
router.get(path, dosearch);
function dosearch(req, res){
    //return res.json(req.session.program_id);
    var query = req.query.q.replace(/,/g, " ");
    var out = {};
    var response_sent = false;
    function checkDone(){
        if(out.modules && out.modulettes && out.ancillary_files){
            if(response_sent){
                return;
            }
            response_sent = true;
            try{
                var counts = {};
                var total = 0;
                for(var key in out){
                    counts[key] = out[key].length;
                    total += out[key].length;
                }
                var user = getUser(req);
                var search = {
                    q:query,
                    program_id: getProgramIdFromUser(user),
                    user_id:getUser(req).user_id,
                    context_id: user.context_id,
                    date: new Date(),
                    counts:counts,
                    total:total
                };
                var now = new Date().getTime();
                if((now - last_search) > 1000){
                    db.collection('searches').insertOne(search);
                    last_search = now;
                }
                res.json(out);
            }catch(e){
                //possible failure if try to resend json - could happen if two results come in simultaniously.
                //just ignore and move on.
            }
        }
    };
    c = ['modulettes', 'ancillary_files', 'modules'];
    c.forEach(function(collection){
        db.collection('search_'+collection).find({$text: {$search: query}, program_id:{$in: [req.session.program_id, 'global']}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}}).toArray(function(err, docs){
            if(!docs){
                if(err){
                    docs = err;
                }else {
                    docs = [];
                }
            }
            out[collection] = docs;
            checkDone();
        });
    });
}

path = '/test_search';
help[path] = {
    description: 'Form for running /dosearch',
    method:'get',
    output:'html'
}
router.get(path, search);
function search(req, res){
  res.send('<form action="/juice/dosearch"> Query: <input type="text" name="q" maxlength="50"><p/><input type="submit" value="Search"></form>');
}


var admin_login_form = [
    '<html><body><form method="post" action="/juice/admin_login">',
    '<fieldset><label style="border:1px solid black;padding:4px;position:relative;background:white;top:-10px;">Admin login</label>',
    '',
    '<input type="hidden" name="redirect" value="__REDIRECT__">',
    '<p>Username <input type="text" name="username"></p>',
    '<p>Password <input type="password" name="password"></p>',
    '<p><input type="submit"></p>',
    '</fieldset></form></body></html>'
].join('');

var users = config.oauth_test_users;
router.post('/admin_login', function(req, res){
    var logged_in = null;

    users.forEach(function(user){
        if((req.body.username == user.username) && (req.body.password.replace(/\s+/g, '') == user.password.replace(/\s+/g, ''))){
            logged_in = user;
            user.success = true;
        }
    });
    req.session.admin_login = logged_in;
    var redirect = '/juice/oauth_test';
    if(req.body.redirect){
        redirect = req.body.redirect;
    }
    if(logged_in){
        req.session.oauth_tester = logged_in;
        res.redirect(redirect);
    }else{
        res.send(admin_login_form.replace('__REDIRECT__', redirect));
    }
});

//returns false if a user is not logged in. Outputs login form.
function adminAuth(req, res){
    var redirect = req._parsedOriginalUrl.path;
    if(!req.session.admin_login) {
        res.send(admin_login_form.replace('__REDIRECT__', redirect));
        return false;
    } else {
        return true;
    }
}


path = '/oauth_test';
help[path] = {
    description: 'Form to mock log in as a test user. Requires admin login first.',
    method:'get',
    output:'html'
}
var resolve = require('path').resolve;
router.get(path, oauth_test);

function oauth_test(req, res, options) {
    var pilot = false;
    var user_group = null;

    if(!pilot && !adminAuth(req, res)){
        return;
    }

    if(options && options.pilot){
        pilot = options.pilot;
        user_group = 'pilot';
    }else{
        user_group = req.session.oauth_tester.group
    }

    var oauth_form = fs.readFileSync(resolve(__dirname+'/../public/oauth_test/oauth_form.html')).toString();
    oauth_form = oauth_form
        .replace('USER_GROUP', user_group)
        .replace('CONSUMER_SECRET', config.oauth_consumer_key_mapping[config.oauth_test_consumer_key].oauth_consumer_secret);

    if(options && options.pilot){
        oauth_form = oauth_form.replace('PILOT', options.pilot);
    }
    res.send(oauth_form);
}


path = '/hes';
help[path] = {
    description: 'Form to login for hes.',
    method:'get',
    output:'html'
}
function hes(req, res){
    oauth_test(req, res, {pilot: 'HES'})
}
router.get('/HES', hes);
router.get('/hes', hes);



path = '/pilot/:pilot'
help[path] = {
    description: 'Form to login for a pilot.',
    method:'get',
    output:'html'
}
router.get(path, pilotForm);
function pilotForm(req, res){
    var pilot_name = req.params.pilot.toLowerCase();
    var pilot = pilots[pilot_name];
    if(!pilot){
        res.status(400);
        return res.send('Invalid pilot');
    }
    var form =[
        '<html>',
        '<head><style type="text/css">',
        'input{width:260px;} label{min-width:122px;  display:inline-block}',
        '</style><head><body>',
        '<form method="post">',
        '<fieldset><legend>'+pilot.form_label+'</legend>',
        '<p><label class="label">Username</label><input type="text" name="user_id" id="user_id" placeholder="Enter your username"></p>',
        '<p><label></label><input type="submit" value="Login"></p>',
        '</fieldset></form></body></html>'
    ].join('');
    res.send(form);
}

router.post(path, function pilotPost(req,res){
    var pilot = req.params.pilot.toLowerCase();
    var pilot_data = {//just the generic data that is the same for all pilots
        "roles": "Student",
        "context_label": "assignment",
        "context_title": "assignment",
        "custom_programid": "AAGS",
        "custom_juicestatus": "true",
        "lis_person_sourcedid": "S3294476",
        "lti_message_type": "basic-lti-launch-request",
        "lti_version": "LTI-1p0",
    }

    for(var key in pilots[pilot]){
        if(key==='form_label') continue;

        var value = pilots[pilot][key];
        pilot_data[key] = value;
    }
    if(!req.body.user_id){
        return pilotForm(req, res);
    }
    pilot_data.user_id = req.body.user_id;
    return loginAsUser(req, res, pilot_data, '/');
});

var pilots = {
    hes:{
        "form_label": "Log in to Juice via Harvard Extension",
        "custom_source": "harvardextension",
        "context_id": "harvardextension",
        "lis_person_contact_email_primary": "nobody@harvard.com",
        "lis_person_name_full": "HarvardEx Student",
        "lis_person_name_given": "HarvardEx",
        "lis_person_sourcedid": "S3294476",
        "tool_consumer_instance_guid": "harvardextension"
    },
    gsupc:{
        "form_label": "Log in to Juice via GSUPC",
        "context_id": "georgiapilot",
        "custom_source": "georgiapilot",
        "lis_person_contact_email_primary": "nobody@georgia.com",
        "lis_person_name_family": "Student",
        "lis_person_name_full": "Georgiapilot Student",
        "lis_person_name_given": "Georgiapilot",
        "tool_consumer_instance_guid": "georgiapilot"
    }
}


path = '/GSUPC';
help[path] = {
    description: 'Form to login for GSUPC.',
    method:'get',
    output:'html'
}
function GSUPCForm(req, res){
    res.redirect('/juice/pilot/gsupc');
}
router.get('/GSUPC', GSUPCForm);
router.get('/gsupc', GSUPCForm);


function hashString(val) {
    if(!val){
        return '';
    }
    var saltRounds = 5;//normally 10, but we aren't dealing with passwords
    var salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(val, salt);
//bcrypt creates some crazy hashes, so lets simplify
    hash = crypto.createHash('md5').update(hash).digest('hex').substr(0, 8);
    return hash;
}


path = '/hash_column';
help[path] = {
    description: 'Takes a csv file and hashes a column of it',
    method:'both',
    output:'html',
    admin_required:true
}

router.get(path,  function(req, res){
    if(requireAdminRole(req, res)) return;
    var out = '' +
        '<html><body><form method="post" enctype="multipart/form-data">' +
        '<p>' +
        '<label>Column number (first column is 1)</label><input type="text" name="column" size="3">' +
        '</p><p>' +
        '<label>CSV file</label><input type="file" name="file">' +
        '</p>' +
        '<p><input type="submit"></p>' +
        '</form></body></html>';
    res.send(out);
});



router.post(path, fileUpload(), function(req, res){

    if(requireAdminRole(req, res)) return;
    if(config.server_instance!=='dev'){
        return res.json({message:'You can only use this function on dev'})
    }
    if(req.files.file.name.indexOf('.csv') === -1){
        return res.json({message:'This only accepts csv files'});
    }
    var csv = require("fast-csv");
    if(!req.files || !req.files.file){
        return res.send("Error, no file uploaded")
    }
    if(!req.body.column){
        return res.send("Please provide a column number to hash encode");
    }
    var column = Number(req.body.column) - 1;

    var file = req.files.file;
    var name = req.files.file.name.replace('.csv', '.hashed.csv');
    var str = new Buffer(file.data).toString('ascii');
    var out = [];
    var first_run = true;
    var hash_column_key = null;
    var keys = [];
    var line = 0;
    try {
        csv
            .fromString(str, {headers: true})
            .on("data", function (data) {
                if (first_run) {
                    res.setHeader('Content-disposition', 'attachment; filename='+name);
                    for (var key in data) {
                        keys.push(key);
                    }
                }
                hash_column_key = keys[column];
                data[hash_column_key] = hashString(data[hash_column_key]);
                res.write(json2csv.convert(data, keys, !first_run)+'\n');
                first_run = false;
                line++;
            })
            .on("end", function () {
                res.end();
            });
    } catch (e){
        return res.json(e);
    }
});


path = '/report';
help[path] = {
    description: 'Form generate report',
    method:'get',
    output:'html',
    admin_required:true
}
router.get(path, function(req, res){
    if(requireAdminRole(req, res)) return;
    res.sendFile(resolve(__dirname + '/../public/report/form.html'));
});



path = '/report';
help[path] = {
    description: 'Form generate report',
    method:'get',
    output:'html',
    admin_required:true
}
router.get(path, function(req, res){
    if(requireAdminRole(req, res)) return;
    res.sendFile(resolve(__dirname + '/../public/report/form.html'));
});


router.post('/report', function(req, res){
    if(requireAdminRole(req, res)) return;
    //return res.json(req.body)
    var columns = [];
    var out = [];
    var lookupByUsernameDate = {};
    var startDate = new Date(req.body.start_date + ' GMT');
    var endDate = new Date(req.body.end_date + ' GMT');
    var query =
        {$and :
            [//we'll add some conditions below...
            ]
        };

    if((!req.body.start_date) && (!req.body.end_date)){
        return res.send("ERROR: No date provided!")
    }

    if(req.body.start_date){
        var d = startDate;
        query.$and.push(
            {
                started:{$gt:d}
            }
        );
    }
    if(req.body.end_date){
        var d = endDate;
        query.$and.push(
            {
                started:{$lt:d}
            }
        );
    }
    if(req.body.context_id){
        query.$and.push({context_id: req.body.context_id});
    }

    if(req.body.roles){
        var roles = req.body.roles.toLowerCase();
        roles = roles[0].toUpperCase() + roles.substr(1);//uppercase first letter
        query.$and.push({roles: roles});
    }

    if(req.body.tool_consumer_instance_guid){
        query.$and.push({tool_consumer_instance_guid: req.body.tool_consumer_instance_guid});
    }

    if(req.body.custom_JUICEgroup){
        var val = req.body.custom_JUICEgroup;
        var constraint = {custom_JUICEgroup: {$eq: val}}
        if(val.substr(0, 1)==='!'){
            val = val.substr(1);
            constraint = {custom_JUICEgroup: {$ne: val}};
        }
        query.$and.push(constraint);
    }

    for(var key in req.body){
        var prefix = 'custom-field-';
        var not = false;

        if(key.indexOf(prefix)!==-1){
            var or_constraint = {$or: []};
            val = req.body[key];
            var field = key.replace(prefix, '');
            if(req.body['not-'+field]){
                not = true;
            }
            vals = val.split(',');
            vals.forEach(function(val){
                val = val.trim();
                if(val !== '') {
                    if(not){
                        var not_constraint = {};
                        not_constraint[field] = {$ne: val};
                        query.$and.push(not_constraint);
                    }else{//and
                        var obj = {};
                        obj[field] = val;
                        or_constraint.$or.push(obj);
                    }
                }
            });
            if(!not) {
                query.$and.push(or_constraint);
            }
        }
    }
    //return res.json(query);
    var sort = {started:1, user_id:1};

    db.collection('records').find(query).sort(sort).toArray(function(err, records) {
        var errors = [];
        if(!records){
            return res.json({'ERROR:no results found in query:':query});
        }
        records.push(query); //for testing query values
        var output_fields = ['user_id', 'tool_consumer', 'custom_JUICEgroup', 'first_access_timestamp', 'total_duration_in_secs', 'project_id', 'module_id', 'mini_lesson_id', 'roles'];
        var widget_output_fields = [];//fields that are related to widgets will be added here
        var tab_map =
        {
            refresher: {output_label:'overview', num_tracks:1, is_started: function(record){}},
            guided_practice: {output_label:'try_it', num_tracks:3, is_started: function(record){}},
            challenge: {output_label:'mini_game', num_tracks:3, is_started: function(record){}},
            module: {output_label:'challenge_wheel', num_tracks:1, is_started: function(record){}}
        }

        var widget_output_field_suffexes = ['date_time_first_access', 'duration_in_secs', 'access_count', 'past_first_step', 'complete'];
        // add the three fields for each tab track, for example "mini_game_2_date_time"
        for(tab in tab_map){
            var tab_config = tab_map[tab];
            for(var i = 1; i<=tab_config.num_tracks; i++) {
                var track_label = tab_config.output_label + '_' + i;
                widget_output_field_suffexes.forEach(function (suffix) {
                    var field = track_label + '_' + suffix;
                    output_fields.push(field);
                    widget_output_fields.push(field)
                })
            }
        }

        var user_id_hash_mapping = {};//to reduce the amount of hashing that needs to be done with repeated ids
        var user_id_hash_mapping_length = 0;//don't want it to get too big.
        var output_config = {
            total_duration_in_secs:{
                process:function(){
                    return 0;
                }
            },
            tool_consumer:{
                source:'tool_consumer_instance_guid'
            },
            first_access_timestamp:{
                process:function(val, record, row){
                    return 'unknown';
                    /*
                    var out = record.started instanceof Date ? record.started : 'Not a date!' ;
                    for(var key in record){
                        if((key.indexOf('_date_time') > -1) && (record[key] instanceof Date) && (record[key] < out)){
                            out = record[key];
                        }
                    }
                    return out;
                    */
                }
            },
            project_id:{
                source:'custom_source'
            },
            mini_lesson_id:{
                source:'modulette_id'
            },
            user_id:{
                process:function(val){
                    if(req.body.hash_ids!=='1'){
                        return val;
                    }
                    if(user_id_hash_mapping[val]){
                        return user_id_hash_mapping[val];
                    }
                    var hash = hashString(val);
                    user_id_hash_mapping[val] = hash;
                    user_id_hash_mapping_length++;
                    if(user_id_hash_mapping_length > 1000){
                        user_id_hash_mapping = {};//lets not use up all the memory for this. If it gets to big, wipe it.
                    }
                    return hash;
                }
            }
        }

        records.forEach(function(record){
            if(record.$and) return; // ignore test query output
            var r = record;//shorthand
            if(r.track_id === 'no-track'){
                r.track_id = 1;
            }
            //create the lookup key
            var started = r.started;
            var month = started.getUTCMonth() + 1; //months from 1-12
            var day = started.getUTCDate();
            var year = started.getUTCFullYear();
            var user_id = record.user_id;
            var tool_consumer = record.tool_consumer_instance_guid;
            var lookup_key = user_id+':'+month+day+year+ r.modulette_id;


            //lookup record
            var row = lookupByUsernameDate[lookup_key];
            var already_exists = false;
            if(row) {
                already_exists = true;
            }else {
                row = {};
                //add the pointer to the row to the lookup table and output.
                lookupByUsernameDate[lookup_key] = row;
                out.push(row);// so we never have to push to output later
            }

            // get the values for each of the outputs
            output_fields.forEach(function(field){
                if(widget_output_fields.indexOf(field) === -1){
                    //regular non widget output field
                    if(!output_config[field]){
                        row[field] = r[field];//nothing to do just push right into output as in the record
                    }else{
                        //output needs to be processed using the output config
                        conf = output_config[field];
                        var source = conf.source ? conf.source : field;
                        var val = r[source];
                        val = conf.process ? conf.process(val, r, row) : val;
                        row[field] = val;
                    }
                }else{
                    // do nothing. This is a widget output field and these will be added to outside this loop
                }
                if(typeof(row[field]) == 'undefined') row[field] = '';
            });//output_fields as field

            ///begin adding widget output fields

            //field is a widget output field
            //row[field] = field;
            try {
                var output_label = tab_map[r.tab_id].output_label;
            }catch(e){
                errors.push = {message:'error assigning label for tab_id' + r.tab_id, record:record};
                return;
            }

            /*
            //not sure what this was to test...
            row.test = row.test ? row.test : [];
            row.test.push(output_label);

            if(!row.test) row.test = [];
            */

            output_label += '_' + r.track_id + '_';
            var field = ''; //this will be used for the 3 output fields for the widget


            //date time field
            field = output_label + 'date_time_first_access';
            row[field] = row[field] ? row[field] : r.started;

            field = output_label + 'duration_in_secs';
            row[field] = row[field] ? row[field] : 0;
            row[field] += Math.round(r.duration_ms / 1000);


            field = output_label + 'access_count';
            row[field] = row[field] ? row[field] : 0;
            row[field] += 1;

            //started field
            field = output_label + 'past_first_step';
            if((row[field] === '') || (typeof(row[field]) == 'undefined')){
                row[field] = 0;
            }
            if(r.data && r.data.steps && r.data.steps.length > 0){
                if(r.widget_name == 'guided_practice_widget') {
                    r.data.steps.forEach(function (step) {
                        if(step.questions && step.questions.length){
                            row[field] = 1;
                        }
                    });
                }else if(r.widget_name == 'refresher_widget'){
                    row[field] = 1;
                }else{
                    row[field] = 'Unknown widget type with steps. _id:' + r._id;
                }

            }
            if(r.data && r.data.attempts && r.data.attempts.length > 0){
                r.data.attempts.forEach(function(attempt){
                   if(attempt.rounds && attempt.rounds.length){
                       attempt.rounds.forEach(function(round){
                           if(round.tries && round.tries.length){
                               row[field] = 1;
                           }
                       });
                   }
                });
            }

            //complete field
            field = output_label + 'complete';
            if((row[field] === '') || (typeof(row[field]) == 'undefined')){
                row[field] = 0;
            }
            if(r.complete){
                row[field] = 1;
            }

            ////
            //Aggregate values

            row.first_access_timestamp = 'unknown';
            row.total_duration_in_secs = 0;
            //Go through each of the fields in the row, look at _first_access columns, and find the lowest
            // value to set as first_access_timestamp
            for(var key in row){
                var val = row[key];
                if(key.indexOf('_first_access')!==-1) {
                    if (val instanceof Date) {
                        if ((row.first_access_timestamp === 'unknown') || (val < row.first_access_timestamp)) {
                            row.first_access_timestamp = val;
                            continue;
                        }
                    }
                }

                if(key.indexOf('_duration_in_secs')!==-1){
                    var val = Number(val);
                    if(val>0) {
                        row.total_duration_in_secs = Number(row.total_duration_in_secs) + Number(val);
                    }
                }
            }

            ///end adding widget output fields

        });//records as record

        //convert all date cells into strings
        out.forEach(function(row){
            for(key in row){
                var val = row[key];
                if(val instanceof Date){
                    row[key] = val.toISOString();
                }
            }
        })
        if(errors.length){
            return res.json({'Tell A Developer About This!':true, 'ReportErrors':errors});
        }

        if(req.body.json_output){
            return res.json(out);
        }
        return res.csv(out, 'Report.csv', output_fields);
    });

})


path = '/server_info';
help[path] = {
    description: 'Get the info for the server',
    method:'get',
    output:'json',
}
router.get('/server_info', function(req, res){
    return res.json({
	server_instance:config.server_instance,
	fileResources:fileResources 
    });
});


path = '/git_hash';
help[path] = {
    description: 'return the code base\'s github hash version. This can be used on github to see if the server is up to date',
    method:'get',
    output:'json',
}
router.get('/git_hash', function(req, res){
    exec('git rev-parse HEAD', function(error, stdout, stderr) {
        res.send(stdout);
    });
});

var gitHash = '';
function setGitHash(){
    gitHash = (execSync('git rev-parse HEAD')).toString().trim();
}
setGitHash();


path = '/ip';
help[path] = {
    description: 'return the ip address that is being passed from nginx to the node application',
    method:'get',
    output:'json',
}
router.get('/ip', function(req, res){
    res.json([req.ip.split(':').slice(-1).join(''), req.header('x-real-ip')]);
});


var programIdMapping = null;
function setProgramIdMapping(callback){
    if(!callback){
        callback = function(){};
    }
    setTimeout(()=>{
	loadJsonFile('http:'+fileResources+'programs/program_id_mapping.json', function(obj){
            if(obj){
		programIdMapping = obj;
		return callback();
            }
            var msg = "ERROR: error loading setProgamIdMapping";
            callback(msg)
	});
    }, 500);

}
setProgramIdMapping();


var social_login_access_code_loaded_timestamp = 'Never';
var social_login_data_source = 'none';
function setSocialLoginAccessCodes(callback){
    if(!callback){
        callback = function(){};
    }
    social_login_data_source = 'http:' + fileResources + 'configs/social_login_access_codes.json';
    loadJsonFile(social_login_data_source, function(obj){
        if(obj){
            config.social_login_access_codes = obj;
            social_login_access_code_loaded_timestamp = new Date();
            return callback();
        }
        var msg = "ERROR: error loading setSocialLoginAccessCodes";
        callback(msg)
    });
}
setSocialLoginAccessCodes();

function getProgramFilePath(program_id){
    var url = 'http:' + fileResources + 'programs/' + program_id + '/';
    return url;
}

function getProgramData(program_id, callback){
    loadJsonFile(getProgramFilePath(program_id) + 'program.json', function(obj, err){
        callback(obj, err, getProgramFilePath(program_id) + 'program.json');
    });
}

path = '/reload';
help[path] = {
    description: 'Reload program id data from s3.',
    method:'get',
    output:'html'
}
router.get(path, function(req, res) {
    if(requireAdminRole(req, res)) return;
    var out = {success:true};
    setProgramIdMapping(function(err){
        if(err){
            out.success = false;
            out.err = err;
            return res.json(out);
        }
        setSocialLoginAccessCodes(function(err){
            if(err) {
                out.success = false;
                out.err = err;
            }
            return res.json(out);
        });
    });


});

function loadJsonFile(path, callback){
    var obj;
    http.get(path, function(resp) {
        // Buffer the body entirely for processing as a whole.
        var bodyChunks = [];
        resp.on('data', function(chunk) {
            bodyChunks.push(chunk);
        }).on('end', function() {
            var data = Buffer.concat(bodyChunks).toString();
            var content = data.replace(/\r/g, " ").replace(/\n/g, " ");
            try {
                obj = JSON.parse(content);
            } catch (e) {
                obj = null;
            }
            callback(obj);
        });
    }).on('error', function(err) {
        console.log("FAILED TO LOAD JSON: ", path, err);
        callback(null, {error:err, url: path});
    });
}

function getProgramIdFromUser(user){
    var program_key = user.custom_program_key;
    return getProgramIdFromKey(program_key);
}

function getProgramIdFromKey(program_key){
    if(!program_key){
        program_key = 'juice';
    }
    if(program_key.indexOf('TEST_')!==-1){
        return program_key.replace('TEST_', '');
    }
    var program_id = 'juice';
    for(var id in programIdMapping){
        var obj = programIdMapping[id];
        obj.custom_program_keys.forEach(function(key){
            if(key===program_key){
                program_id = id;
            }
        });
    }
    return program_id;
}


path = '/process_oauth';
help[path] = {
    description: 'Process oauth request from mock page or from provider',
    method:'get/post',
    output:'redirect',
}
var used_nonce = {};
router.get(path, processOauth);
router.post(path, processOauth);
var oauthSignature = require('oauth-signature');
function processOauth(req, res) {
    var data = req.query;
    if(!data) data = {};
    if (Object.keys(req.body).length) {
        for(var key in req.body){
            data[key] = req.body[key];
        }
    }

    /*skipped fields for validation parameters*/
    var parameters = {};
    for (key in data) {
        var skipped_fields = ['oauth_signature', 'url', 'method', 'debug']
        if (skipped_fields.indexOf(key) > -1) {
            continue;
        } else {
            parameters[key] = data[key];
        }
    }

    var consumerSecret = null;
    if(config.oauth_consumer_key_mapping){
        var secrets = config.oauth_consumer_key_mapping;
        var key_data =  secrets[data.oauth_consumer_key];
        if(key_data) {
            consumerSecret = key_data.oauth_consumer_secret;
        }
    }else{// use older style... to be removed
        var secrets = config.oauth_shared_secrets;
        consumerSecret = secrets[data.tool_consumer_instance_guid];
    }

    if(!consumerSecret){
        return res.send('No known consumer secret found on the server for guid: ' + data.tool_consumer_instance_guid + ', oauth_consumer_key:'+ data.oauth_consumer_key);
    }

    var o_url = req.protocol + '://' + req.hostname + '/juice/process_oauth';

    var httpMethod = 'POST';
    var signature = oauthSignature.generate(httpMethod, o_url, parameters, consumerSecret);

    signature_validated = data.oauth_signature == signature;
    if(!signature_validated){ //test for just uri encoding error
      console.log('SIGNATURE', signature, decodeURIComponent(signature), 'compare', data.oauth_signature )
      signature = decodeURIComponent(signature);
      signature_validated = data.oauth_signature == signature;
    }
    if(!signature_validated){//check for https error
        signature = oauthSignature.generate(httpMethod, o_url.replace('http:', 'https:'), parameters, consumerSecret);
        signature_validated = data.oauth_signature == signature;
        if(!signature_validated){//check for https error && url encoding error
          signature = decodeURIComponent(signature);
          signature_validated = data.oauth_signature == signature;
        }
    }

    if(req.query){
        for(var key in req.query){
            if(typeof(data[key]==='undefined')) {
                data[key] = req.query[key];
            }
        }
    }

    /* check if all required fields are provided */
    if(req.session.oauth_tester && req.session.oauth_tester.group ==='guest'){
        required_values = {
            context_id: 'juicetestaccount',
            roles:'Student'
        }
    }

    var required_values = {}; //prevent invalid entries from guest/test/special case users
    for(var key in required_values){
        if(data[key] != required_values[key]){
            return res.send('Invalid value for '+key+': '+data[key]);
        }
    }


    req.session.slim = false;
    if((parameters.custom_target_id + parameters.resource_link_id).indexOf('#slim') !== -1){
        req.session.slim = true;
    }



    var resource_target = data.resource_link_id;
    if(data.custom_target_id){
        resource_target = data.custom_target_id;
    }
    if(!resource_target){
        resource_target = '';
    }
    var url_to_redirect_to = '/juice/' + resource_target;
    if(resource_target.indexOf('module/')!==-1){
        url_to_redirect_to+='#auth';
    }



    if (used_nonce[data.oauth_nonce]) {
        res.send('ERROR: reused nonce '+ data.oauth_nonce);
    } else {
        used_nonce[data.oauth_nonce] = (new Date()).getTime();
    }

    if(data.custom_programid){
        data.custom_programid = data.custom_programid;
    }
    
    var user = {};
    var user_fields = [
        'context_id', 'context_label', 'context_title',
        'custom_programid', 'custom_program_key', 'custom_juicestatus', 'custom_source',
        'lis_person_contact_email_primary', 'lis_person_name_family',
        'lis_person_name_full', 'lis_person_name_given',
        'lis_person_sourcedid', 'roles', 'user_id', 'tool_consumer_instance_guid',
        'custom_target_id', 'custom_JUICEgroup', 'roles', 'tool_consumer_instance_guid', 'user_id', 'short_user_id',
        'oauth_consumer_key'
    ];

    data.short_user_id = data.user_id;
    req.session.studentId = data.custom_studentid;
    if(data.tool_consumer_instance_guid.indexOf('mycfa.force.com')===-1) {
        data.user_id = data.user_id + '@:@' + data.tool_consumer_instance_guid;
        if(req.session.studentId) {
            req.session.studentId = data.custom_studentid + '@:@' + data.tool_consumer_instance_guid;
        }
    }
    
    for(var key in data){
        if(user_fields.indexOf(key)>-1){
            user[key] = data[key];
        }
    }

    if(!user.custom_program_key){
        user.custom_program_key = user.custom_programid;
    }
    if(!user.custom_program_key){
        user.custom_program_key = 'juice';
    }
    req.session.program_id = getProgramIdFromUser(user);
    data.validated = signature_validated;
    if( (data.debug) || (!signature_validated) ) {
        res.json({
            signature_validated: signature_validated,
            httpMethod: httpMethod,
            url: o_url,
            parameters: parameters,
            consumerSecretStartsWith: consumerSecret.substr(0,2)+'...',
            submitted_url_from_client: data.oauth_signature,
            server_side_calculated_signature: signature,
            url_to_redirect_to: url_to_redirect_to
        });
    }else{
        return loginAsUser(req, res, user, url_to_redirect_to);
    }
}

function updateUser(user){
    db.collection('users').updateOne({_id:user.user_id}, user, {upsert:true});
}

function loginAsUser(req, res, user, url_to_redirect_to_or_function){
    user.updated = new Date();
    updateUser(user);
    req.session.user = user;
    var next = null;
    var url = null;
    if(typeof(url_to_redirect_to_or_function)==='function'){
        next = url_to_redirect_to_or_function;
    }else{
        url = url_to_redirect_to_or_function;
    }

    setSessionUserSettings(req, user, function() {
        if (next) {
            next()
        } else {
            return res.redirect(url);
        }
    });
    var login = {
        date: new Date(),
        url_to_redirect_to: url,
        user_id: user.user_id
    };
    for(var key in user){
        if(key!='_id'){
            login[key] = user[key];
        }
    }
    db.collection('logins').insertOne(login);
}


path = '/viewed_user';
help[path] = {
    description: 'See what student was passed via studentId into the site to be viewed by a coach',
    method:'get',
    output:'json',
}
router.get(path, function(req, res){
    var user_id = req.session.studentId;
    if(!user_id){
       return res.json({success:false, message_type:"no_student_id", error_message:'There was no studentId passed to the site.'});
    };
    db.collection('users').findOne({_id:user_id}, function(err, user){
        if(!user){
            return res.json({success:false, message_type:"no_user_found", error_message:'No user found with studentId '+ user_id});
        }
        var out = {
            success:true,
            user:user,
            progress:{}
        };
        db.collection('progress').findOne({_id:user_id}, function(err, progress) {
            if(progress){
                out.progress = progress;
            }else{
                out.message = 'No progress found for user';
            }
            out.message_type = "user_found";
            res.json(out);
        });

    });

});


path = '/users';
help[path] = {
    description: 'Get a list of all users on the site',
    method:'get',
    output:'json',
    admin_required:true
}
router.get(path, function(req, res){
    if(requireAdminRole(req, res)) return;
    return outputTop100FromCollection(req, res, {collection:'users', sort_field: 'updated'});
   db.collection('users').find({}).toArray(function(err, users) {
      res.json(users);
   });
});

path = '/user';
help[path] = {
    description: 'Get current user',
    method:'get',
    output:'json',
    admin_required:true
}
router.get(path, function(req, res){
    return res.json(getUser(req));
});

path = '/session';
help[path] = {
    description: 'Get current session',
    method:'get',
    output:'json',
    admin_required:true
}
router.get(path, function(req, res){
    if(!req.session.tester) {
        if (requireAdminRole(req, res)) return;
    }
    return res.json(req.session);
});


path = '/user_settings';
help[path] = {
    description: 'Gets a list of user setting key/value pairs for the current logged in user or submits a new pair via a post.' +
    'Currently just used to record walkthrough status for pages (walkthrough_completed_modulette, walkthrough_completed_module)' +
    'If KEY=remove, you will remove this user setting. Variables that start with _ are not setable by users. NOTE: you can also use ?' +
    'user_id=USER_ID to look up another users settings. You must be an admin to do this.',
    method:'get/post',
    output:'json',
    admin_required:true
}
router.get(path, userSettings);
router.post(path, userSettings);
function userSettings(req, res){
    if(req.query.$user_id){
        req.query.user_id = req.query.$user_id;
    }

    if(req.query.user_id){
        if(requireAdminRole(req, res, 'You must be an admin to view other user\'s settings')){
            return;
        }
        var query = {
            $or : [
                {_id: req.query.user_id},
                {_id: {$regex:req.query.user_id+'*'}}
            ]
        }
        db.collection('user_settings').find(query).toArray(function(err, results) {
            if (!results) {
                return res.json(['No matches', query, err])
            }
            return res.json(results);
        });
        return;//stop further execution
    }
    var user = getUser(req);
    if(typeof(req.body.key)!='undefined') req.query.key = req.body.key;
    if(typeof(req.body.value)!='undefined') req.query.value = req.body.value;
    if(req.query.key) {
        if (req.query.key === '_id') {
            return res.json('Error, unsettable value');
        }
        if ((req.query.value !== 'remove') && (req.query.key.substr(0, 1) === '_')) {
            return res.json('Error, unsettable value');
        }
    }
    setUserSetting(user, req.query.key, req.query.value, function(settings){
        for(var key in settings){
            settings[key] = fixBooleanString(settings[key]);
        }
        req.session.user_settings = settings;
        return res.json(settings);
    })
}
function fixBooleanString(str){
    if(str==='true') return true;
    if(str==='false') return false;
    return str;
}

function setUserSetting(user, key, value, callback){
    value = fixBooleanString(value);

    getUserSettingsFromUser(user, function(settings){
        if(!settings){
            var settings = {_id:user.user_id};
        }
        if(key){
            settings[key] = value;
        }
        if(value==='remove'){
            delete settings[key];
        }
        console.log('here', settings, value);
        db.collection('user_settings').updateOne({_id:user.user_id}, settings, {upsert:true});
        return callback(settings);
    });
}

function getUserSettingsFromUser(user, callback){
    var query = {};
    query = {_id:user.user_id};


    db.collection('user_settings').findOne(query, function(err, settings) {
        return callback(settings);
    });
}


function setSessionUserSettings(req, user, callback){
    getUserSettingsFromUser(user, function(settings){
        req.session.user_settings = settings;
        callback(settings);
    });
}


router.post('/s3copy', s3Copy);
function s3Copy(req, res){
  res.header("Access-Control-Allow-Origin", "*");
  var file = req.body.file;
  var ftype = req.body.ftype;  // ftype is NOT defined for content files (for widgets)
  if (!ftype ) file = file + ".txt"; 
  var sourceBucket = req.body.sourcebucket;
  var destBucket = req.body.destbucket;
  var table = req.body.table;
  //console.log("s3copy", file, s3Buckets[sourceBucket], s3Buckets[destBucket]);
  //var s3 = new AWS.S3({params: {Bucket: s3Buckets[destBucket], CopySource:  s3Buckets[sourceBucket]+"/"+file+".txt" , Key: file+".txt"}});
  var s3 = new AWS.S3({params: {Bucket: s3Buckets[destBucket], CopySource:  s3Buckets[sourceBucket]+"/"+file , Key: file}});
   s3.copyObject(function(err) {
      if (err == null) {
         //writeToQB(fname, refKey);
         //res.send("<p>Your file was successfully copied</p><input type='button' value='Close' onclick='window.history.go(-2)'/>");
         //if (!table) table = "bjzkkwhqj";
		 res.send("<p>Your file " + file + " was successfully copied</p>"); //<input type='button' value='Close' onclick='window.location.replace(\"https://QUICKBASE_INSTANCE.quickbase.com/db/" + table + "?a=td\")'/>
      } else {
		 res.send("<p>ERROR copying file " + file + "</p>");
      }
   });
}

var client_js_files = require('../client_js_files.json');
var uncompiled_scripts = client_js_files.uncompiled
var compiled_scripts = client_js_files.compiled;
var author_scripts = client_js_files.author;
var leave_uncompiled = false;
process.argv.forEach(function (val, index, array) {
    console.log('ARGUMENT ' + index + ': ' + val);
    if((val=='--uncompiled-js') || config.no_compile_js){
        leave_uncompiled = true;
    }
});



var delayed_script_paths = [];
if(leave_uncompiled){
    uncompiled_scripts = uncompiled_scripts.concat(compiled_scripts).concat(client_js_files.delayed);
    compiled_scripts = [];
}else{
    //no delayed scripts when not compiled
    client_js_files.delayed.forEach(function(file){
        delayed_script_paths.push('public'+file);
    })
}

console.log('leave uncompiled', leave_uncompiled);


var compiled_script_paths = [];

compiled_scripts.forEach(function(file){
    compiled_script_paths.push('public'+file);
})


var uncompiled_script_tags = '<script src="' + (uncompiled_scripts.join('?hash='+gitHash+'"></script>\n<script src="')) + '?hash='+gitHash+'"></script>';
var author_script_tags = '<script src="' + (author_scripts.join('?hash='+gitHash+'"></script>\n<script src="')) + '?hash='+gitHash+'"></script>';
function compileJs(filename, paths){
    var output_filename = '/'+filename;
    var output_file_path = '/public' + output_filename;
    var fs = require('fs');
    console.log(paths);
    var compressor = require('node-minify');
    console.log('start compiling '+filename);
    var result = new compressor.minify({
        compressor: 'no-compress',
        input: paths,
        output: 'public/'+filename,
        tempPath: '/tmp/',
        callback: function(err, min){
            console.log('finished compiling ' + filename);
        }
    });
}
setTimeout(function(){compileJs('compiled.js', compiled_script_paths)}, 100);//start it async so it doesn't hold up system startup
setTimeout(function(){compileJs('compiled_delayed.js', delayed_script_paths)}, 100);//start it async so it doesn't hold up system startup

function assembleScriptTags(page) {
    if((page=='author')||(page=='preview')){
        return author_script_tags;
    }
    var out = uncompiled_script_tags;
    if (!leave_uncompiled) {
        out += '<script src="/compiled.js?hash=' + gitHash + '"></script>';
    }
    return out;
}



var programValueDefaults = require('../public/components/program-value/program-value-defaults.json');
var setProgramDefaults = 'var programValues = ' + JSON.stringify(programValueDefaults);
router.post('*', catchAll);
router.get('*', catchAll);
function catchAll(req, res) {
  var paramsFromServer = JSON.parse(assembleServerParams(req)); 
  var program = req.query.program;  // to handle preview of modulete and modules with programs
  if (!paramsFromServer.user) {
          paramsFromServer["user"] = {};
  }
   if (program && program != "-")  {
	   program = "TEST_" + program;
	   paramsFromServer["user"]["custom_programid"] = program;
   } else if (program == "-"){
       paramsFromServer["user"]["custom_programid"] = "";
   }
  paramsFromServer.gitHash = (''+gitHash).trim();
  res.render('main', { htmlApp:'mainApp', gitHash: paramsFromServer.gitHash, htmlCtrl:"MainAppCtrl", overviewHeader: "Catch All", overviewSubHeader: "Overview subheader",  paramsFromServer: JSON.stringify(paramsFromServer), scriptTags:assembleScriptTags(), loadDelayed:true, setProgramDefaults: setProgramDefaults});
}




router.get('/:overview/:mod/:tab?/:widget?', function(req, res) {
  //
  // get modulette structure file
  //
  var moduletteName = req.params.mod;
  //var path = 'local';  
  var path = 'S3';
  getFileAndRender(path, moduletteName, res);
});





module.exports = router;
