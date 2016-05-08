

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/register', function(req, res, next) {
  res.send('user register');
});

router.get('/login', function(req, res, next) {
  res.send('user login');
});

router.get('/findpassword', function(req, res, next) {
  res.send('user findpassword');
});

module.exports = router;
