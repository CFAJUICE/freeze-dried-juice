var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  fs = require('fs')
  fs.readFile('files/showme_widget_test.html', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    res.send(data);
  });
  
});

module.exports = router;
