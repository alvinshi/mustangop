
var express = require('express');
var router = express.Router();

var Base64 = require('../public/javascripts/vendor/base64').Base64;

router.get('/', function(req, res, next) {
  res.send('user xxxxx');
});

router.get('/register', function(req, res, next) {

  user_id = 'aaaaa'

  //encode userid
  encodeUserId = Base64.encode(user_id);

  //login succeed,response cookie to browser
  //cookie 30天有效期
  res.cookie('userIdCookie',encodeUserId,{ maxAge: 1000*60*60*24*30,httpOnly:true, path:'/'});

  res.send('user register :' + encodeUserId);
});

router.get('/login', function(req, res, next) {
  res.send('user login');
});

router.get('/forget', function(req, res, next) {

  //获取cookie的值
  var encodeUserId = req.cookies.userIdCookie;

  //鉴别cookie是否存在
  if ('undefined' === (typeof req.cookies.userIdCookie)){
    res.send('cookie not exist,need relogin');
  }

  user_id = Base64.decode(encodeUserId);

  //do the case

  res.send('user id =' + user_id);
});

module.exports = router;
