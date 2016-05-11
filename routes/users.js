'use strict';
var express = require('express');
var AV = require('leanengine');
var router = express.Router();

var Base64 = require('../public/javascripts/vendor/base64').Base64;

router.get('/', function(req, res, next) {
  res.send('user xxxxx');
});

router.get('/register', function(req, res, next) {

  var user_id = 'aaaaa';

  //encode userid
  var encodeUserId = Base64.encode(user_id);

  //login succeed,response cookie to browser
  //cookie 30天有效期
  res.cookie('userIdCookie',encodeUserId,{ maxAge: 1000*60*60*24*30,httpOnly:true, path:'/'});

  res.send('user register :' + encodeUserId);

  res.render('register');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/forget', function(req, res, next) {

  //获取cookie的值
  var encodeUserId = req.cookies.userIdCookie;

  //鉴别cookie是否存在
  if ('undefined' === (typeof req.cookies.userIdCookie)){
    res.send('cookie not exist,need relogin');
  }

  var user_id = Base64.decode(encodeUserId);

  //do the case

  res.send('user id =' + user_id);
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
