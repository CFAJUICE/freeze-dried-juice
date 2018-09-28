var process = require('process');
var fs = require('fs');
process.title = 'node_git';
var http = require('http');
var child_process = require('child_process');
http.createServer(function (req, res) {
    child_process.exec('./update_git.sh', function(err, out, stderr){
	  res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.write('request successfully proxied!' + '\n' + JSON.stringify({err:err, out:out, stderr:stderr}, true, 2));
	res.end();
    });
}).listen(9003);
