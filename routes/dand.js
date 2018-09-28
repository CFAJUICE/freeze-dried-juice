var express = require('express');
var router = express.Router();


router.get('/:name?', function(req, res) {
  var filename = req.params.name;
  fs = require('fs');
  fs.readFile('files/'+filename+'.txt', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var rawText = data;
	var feedback = {correctFeedback:"Great job!", incorrectFeedback:"Sorry, this is not correct (placeholder--will be answer-specific)."};
	var interactiveString = JSON.stringify({content: {text : rawText}, feedback : feedback});
	res.render('dd_main',
		{ interactive: interactiveString, templateName : "Drag and Drop Activity", rawText : rawText});
  });
});


router.post('/', function(req, res) {
   var data = req.body.data;
   fs = require('fs')
   fs.writeFileSync('files/temp.txt', data);
   res.send("done");
});

module.exports = router;
