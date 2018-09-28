/*
Set up sub domain mapping. This proxy service is run in the prod server instance only.
It provides routing to all other instances, and it also receives github push notifications
that will then call the execution of a pull request from github.
 */

var http = require('http'),
    httpProxy = require('http-proxy'),
    proxy = httpProxy.createProxyServer({}),
    url = require('url');

proxy.on('error', function(e) {
    console.log('ERROR', e);
});

http.createServer(function(req, res) {
    var hostname = req.headers.host.split(":")[0];
    var pathname = url.parse(req.url).pathname;

    console.log(hostname);
    console.log(pathname);

    var domain_mapping = {
        'default': 'http://localhost:9000',
        'dev.localhost': 'http://localhost:9001',
        'dev.juiceyourskills.com': 'http://localhost:9001',
        'test.localhost': 'http://localhost:9002',
        'test.juiceyourskills.com': 'http://localhost:9002',
        'git.localhost': 'http://localhost:9003',
        'git.juiceyourskills.com': 'http://localhost:9003'
    };

    var target = domain_mapping[hostname] ? domain_mapping[hostname] : domain_mapping['default'];
    proxy.web(req, res, {target: target});
}).listen(80, function() {
    console.log('proxy listening on port 80');
});

//create git response server
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('request successfully proxied!' + '\n' + JSON.stringify(req.headers, true, 2));
    res.end();
}).listen(9003);