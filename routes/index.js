var express = require('express');
var AV = require('leanengine');
var router = express.Router();
var https = require('https');
var util = require('./util');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var messageLogger = AV.Object.extend('messageLogger'); // 消息库

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('./views/index.html');
});

// 首页导航栏api
router.get('/index', function(req, res){
  var userid = util.useridInReq(req);
  var user = new AV.User();
  user.id = userid;

  //TODO:
  //1.获取需要审核的数据条数
  //(根据用户查询,发布的哪些任务——未关闭,根据发布了哪些任务查询,有哪些人接受了我的任务,然后relation计算accepted和systemAccepted的个数)
  //2.获取我做的任务被拒绝的条数
  //(根据用户查询,做了哪些任务——未关闭,根据发布了哪些任务查询,有哪些人拒绝了我的任务,然后relation计算refused的个数)

  //TODO:
  res.json({'errorId':0, 'errorMsg':'no date for nav', 'userObjectId':Base64.encode(userid)});
});

// 未读消息显示
router.get('/unreadMsg', function(req, res){
  var userid = util.useridInReq(req);
  var date = new Date().getTime();
  var dateStr = date - 1000*60*60*24;
  var myDate = new Date(dateStr);
  //var myDate = new Date();
  //var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth()) + 1) + '-' + myDate.getDate();

  var user = new AV.User();
  user.id = userid;

  var query = new AV.Query(messageLogger);
  query.equalTo('receiverObjectId', user);
  query.notEqualTo('read', true);
  query.greaterThan('createdAt', myDate);
  query.limit(1000);
  query.count().then(function(count){
    var msgCount = count;

    res.json({'unreadMsgCount':msgCount})
  })
})

module.exports = router;
