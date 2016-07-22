'use strict';
var express = require('express');
var AV = require('leanengine');
var router = express.Router();
var util = require('./util');
var https = require('https');
var User = AV.Object.extend('_User');

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
    var userNickname = user.get('userNickname');
    //encode userid
    var encodeUserId = Base64.encode(user_id);
    //login succeed,response cookie to browser
    //cookie 30天有效期
    res.cookie('username', user.get('username'));
    res.cookie('userIdCookie',encodeUserId, { maxAge: 1000*60*60*24*30,httpOnly:true, path:'/'});
    if (userNickname != undefined && userNickname != ''){
      res.cookie('username', userNickname)
    }

    res.json({'errorId':0, 'errorMsg':''});

  }, function(error) {
    // 失败
    res.json({'errorId':error.code, 'errorMsg':error.message});
  });

});

router.get('/', function(req, res, next) {
  res.render('userCenter');
});


//个人中心
router.get('/userCenter',function(req, res, next){
  var userId = util.useridInReq(req);
  var userNickname = req.body.userNickname;
  var userQQ = req.body.userQQ;

  var query = new AV.Query(User);
  query.get(userId).then(function(results){
    var PhoneNumber = results.get('mobilePhoneNumber');
    var userNickname = results.get('userNickname');
    var userQQ = results.get('userQQ');
    var balance = results.get('remainMoney');


    res.json({'personAPP':PhoneNumber, 'userNickname':userNickname, 'userQQ':userQQ, 'balance': balance});
  }), function(error){
    //失败
    res.json({'errorId':error.code, 'errorMsg':error.message});
  }
});

//个人中心用户保存信息
router.post('/userCenter',function(req, res, next){
  var userId = util.useridInReq(req);
  var userNickname = req.body.userNickname;
  var userQQ = req.body.userQQ;

  var user = AV.Object.createWithoutData('User', userId);
  user.set('userNickname', userNickname);
  user.set('userQQ',userQQ);
  user.save().then(function(){
    //保存成功

    //cookie 30天有效期
    res.cookie('username', user.get('username'), { maxAge: 1000*60*60*24*30, path:'/'});
    if (userNickname != undefined && userNickname != ''){
      res.cookie('username',userNickname);
    }

    res.json({'errorId':0, 'errorMsg':''});
  },function(error){
    res.json({'errorId':-1, 'errorMsg':error.message});
  })

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
    var userNickname = user.get('userNickname');
    //login succeed,response cookie to browser
    //cookie 30天有效期
    res.cookie('username', user.get('username'), { maxAge: 1000*60*60*24*30, path:'/'});
    //res.cookie('wjwtest', 'wujiangweiLucy');
    res.cookie('userIdCookie',encodeUserId, { maxAge: 1000*60*60*24*30, path:'/'});
    //res.cookie['username'] = user.username;
    if (userNickname != undefined && userNickname != ''){
      res.cookie('username',userNickname);
    }

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
