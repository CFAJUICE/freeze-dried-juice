#!/usr/bin/env node

/*
Unless otherwise noted, this project is licensed under a Creative Commons 
Attribution-ShareAlike 4.0 International License:

https://creativecommons.org/licenses/by-sa/4.0/
*/

console.log(new Date());
require('./compile_sass')
var process = require('process');
var debug = require('debug')('juice:server');
var http = require('http');
var fs = require('fs');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var json2csv = require('nice-json2csv');
var MongoStore = require('connect-mongo')(session);
var MongoClient = require('mongodb').MongoClient, assert = require('assert');


var config = require('./configs/default.json');
try{
    var local_config = require('./configs/local.json');
    //override config with locals
    console.log(local_config, 'local');
    for(var key in local_config){
        config[key] = local_config[key];
    }
}catch(e){
    console.log('INFO: local.json file does not exist. Just using config/default.json', e)
    //local doesn't exist, do nothing
}

var base_url = config.base_url;
config.base_file_resources = config.base_file_resources.replace('$BASE_URL', base_url);
config.narration_file_resources = config.narration_file_resources.replace('$BASE_URL', base_url);

config.deployed_scaleable_games.forEach(function(game){
    config.scaleable_games.push(game);
})

global.app_config = config;


var fileResources = config.base_file_resources+'/';
if(global.app_config.server_instance === 'prod'){
    fileResources = config.base_file_resources+'.prod/';
}
if(global.app_config.server_instance === 'test'){
    fileResources = config.base_file_resources+'.qa/';
}
global.app_config.fileResources = fileResources;
config.fileResources = fileResources;

function setPublicConfigs(){
    var configs_to_set = ['ga_tracking_code', 'test_user_filters', 'fileResources', 'scaleable_games', 'narration_file_resources'];
    var public_configs = {};
    
    configs_to_set.forEach(function(param){
        public_configs[param] = global.app_config[param];
    });

    public_configs = 'var public_configs = ' + JSON.stringify(public_configs) + ';';
    fs.writeFile('public/public_configs.js', public_configs, function(err){
	if(err){
	    console.log('error writing public configs: ', err);
	}
    });
}

setPublicConfigs();
console.log('config=', config);

var routes = require('./routes/index');
var users = require('./routes/users');
var dand = require('./routes/dand');  //!PM add /dand route
var juice = require('./routes/juice');  //!PM add /juice route


// Connect to mongodb
var url = 'mongodb://localhost:27017/' + config.db_name;
MongoClient.connect(url, function(err, db) {
    juice.setDb(db);
    if(err){
        console.log('ERROR with db connection', err);
    }
    db.collection('records').listIndexes().toArray(function(err, indexes) {
        db.collection('records').createIndex({user_id : 1}, function(){});
        db.collection('records').createIndex({started : 1}, function(){});
        db.collection('records').createIndex({last_updated:1}, function(){});
    });
});

var app = express();
app.use(json2csv.expressDecorator); // makes it so you can do res.csv([{ "hello": "world" }], "myFile.csv");

//var multer = require('multer');  //failed test to use multer to upload files... !PM 12-13-15 
//app.use(multer({dest:'./'}).single('filedata'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'})); //allows things like base64 encoded images without rejecting the request
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());
app.use(session({
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    secret: config.secret,
    store: new MongoStore({url: 'mongodb://localhost:27017/' + config.db_name})
}));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', routes);
app.use('/users', users);
app.use('/dand', dand);   //!PM add /dand route
app.use('/juice', juice);   //!PM add /juice route



// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/*
 Initialize server connection
 */
var port = config.port;
var ssl_port = config.ssl_port;
var server_instance = config.server_instance;
for(var instance_name in config.port_instances){
    if(config.port_instances[instance_name]===port){
        server_instance = instance_name;
    }
}

process.title = 'node_'+server_instance + '_' + port;


console.log('SERVER INSTANCE', server_instance);
if(server_instance==='prod'){
    //the prod server manages the subdomain proxy
    //require('./proxy');
}

/*
 var port = parseInt(process.env.PORT, 10);
 var ssl_port = parseInt(process.env.SSLPORT, 10);
 if (isNaN(port)) {
 port = config.port;
 }
 if (isNaN(ssl_port)) {
 ssl_port = config.ssl_port;
 }
 */

console.log('setting app port '+ port);
app.set('port', port);

var server = http.createServer(app);
server.listen(port);
server.on('error', onError);

/* Set up ssl server... not quite working right.
 var ssl_server = https.createServer(app, options);
 ssl_server.listen(ssl_port);
 ssl_server.on('error', onError);
 */


/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error('Port ' + port + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error('Port ' + port + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}


console.log('done');
