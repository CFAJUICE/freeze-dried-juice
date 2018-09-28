var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  return res.redirect('/juice/');
  //res.render('index', { title: 'Welcome to JUICE: Year One!' });
});

module.exports = router;
