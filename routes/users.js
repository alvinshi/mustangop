
'use strict';
var express = require('express');
var AV = require('leanengine');
var router = express.Router();

/* GET users listing. */
router.get('/register', function(req, res, next) {
  res.render('register');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/findpassword', function(req, res, next) {
  res.send('user findpassword');
});

// 用户注册
router.post('/register', function(req) {
  var userphone = req.body.mobile;
  var password = req.body.password;
  var user = new AV.User();
  user.set('username', userphone);
  user.set('password', password);
  user.set('phone', userphone);
  user.setMobilePhoneNumber(userphone);

  user.signUp().then(function(user) {

    console.log(user);
  }, function(err) {

    console.log('Error: ' + error.code + ' ' + error.message);
  });

});



module.exports = router;
