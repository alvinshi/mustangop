var express = require('express');
var AV = require('leanengine');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('./views/index.html');
});

module.exports = router;
