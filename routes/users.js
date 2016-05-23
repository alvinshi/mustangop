'use strict';
var express = require('express');
var AV = require('leanengine');
var router = express.Router();

var Base64 = require('../public/javascripts/vendor/base64').Base64;

// 用户注册
router.post('/getSmsCode', function(req, res) {
  var userphone = req.body.mobile;

  AV.Cloud.requestSmsCode(userphone).then(function() {
    //发送成功
    res.json({'errorId':0, 'errorMsg':''});
  }, function(error) {
    //发送失败
    res.json({'errorId':error.code, 'errorMsg':error.message});
  });
});

router.post('/register', function(req, res, next) {
  var userphone = req.body.mobile;
  var password = req.body.password;
  var smsCode = req.body.smsCode;

  var user = new AV.User();
  user.signUpOrlogInWithMobilePhone({
    mobilePhoneNumber: userphone,
    smsCode: smsCode,
    password:password,
    username:userphone
  }).then(function(user) {
    //注册或者登录成功

    var user_id = user.id;
    //encode userid
    var encodeUserId = Base64.encode(user_id);
    //login succeed,response cookie to browser
    //cookie 30天有效期
    res.cookie('userIdCookie',encodeUserId,{ maxAge: 1000*60*60*24*30,httpOnly:true, path:'/'});

    res.json({'errorId':0, 'errorMsg':''});

  }, function(error) {
    // 失败
    res.json({'errorId':error.code, 'errorMsg':error.message});
  });

});

//test code
router.get('/', function(req, res, next) {
  res.render('personalCenter');
});

//个人中心
router.get('/user',function(req, res, next){
  var userId = util.useridInReq(req);
  var user = new AV.User();
  user.id = userId;

  var query = new AV.Query(user);
  query.equalTo('userId', userId);
  query.first().then(function(results){
    var retApps = new Array();
    var userInfo = new Object();
    userInfo.PhoneNumber = results.get('mobilePhoneNumber');
    userInfo.password = results.get('password');
    retApps.push(userInfo);
    res.json({'personAPP':retApps});
  },function(error){
    console.log({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]})
  });
});

router.get('/register', function(req, res, next) {
  //res.send('user register :' + encodeUserId);
  res.render('register');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/login', function(req, res, next) {
  var userPhone = req.body.mobile;
  var password = req.body.password;

  AV.User.logIn(userPhone, password).then(function(user) {
    // 成功了，现在可以做其他事情了
    var user_id = user.id;
    //encode userid
    var encodeUserId = Base64.encode(user_id);
    //login succeed,response cookie to browser
    //cookie 30天有效期
    res.cookie('userIdCookie',encodeUserId,{ maxAge: 1000*60*60*24*30,httpOnly:true, path:'/'});

    res.json({'errorId':0, 'errorMsg':''});
  }, function(error) {
    // 失败了
    res.json({'errorId':error.code, 'errorMsg':error.message});
  });
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

router.get('/forgetSecret', function(req, res, next) {
  res.render('forgetSecret');
});

router.post('/getNewSmsCode', function(req, res, next) {
  var userphone = req.body.mobile;
  AV.User.requestPasswordResetBySmsCode(userphone).then(function() {
    // 密码重置请求已成功发送
    res.json({'errorId':0, 'errorMsg':''});
  }, function(error) {
    // 记录失败信息
    console.log('Error: ' + error.code + ' ' + error.message);
  });

});

// 重置密码
router.post('/forgetSecret', function(req, res, next) {
  var smsCode = req.body.smsCode;
  var newSecret = req.body.newPassword;
  AV.User.resetPasswordBySmsCode(smsCode, newSecret, {
    success: function() {
      // 密码被成功更新
      res.json({'errorId':0, 'errorMsg':''});
    },
    error: function(error) {
      // 记录失败信息
      console.log('Error: ' + error.code + ' ' + error.message);
    }
  });
});

module.exports = router;
