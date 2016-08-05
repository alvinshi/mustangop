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
  var myDate = new Date();
  var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth()) + 1) + '-' + myDate.getDate();

  var user = new AV.User();
  user.id = userid;

  var query = new AV.Query(releaseTaskObject);
  query.equalTo('userObject', user);
  query.equalTo('releaseDate', myDateStr);
  query.limit(1000);
  query.find({
    success:function(results){
      var retApps = new Array();
      for (var i= 0; i < results.length; i++){
        var pengding = results[i].get('submitted');
        retApps.push(pengding);
      }
      if (retApps.length > 0){
          res.json({'Count':eval(retApps.join('+')), 'userObjectId':Base64.encode(userid)});
      }else {
          res.json({'errorId':0, 'errorMsg':'no date for nav', 'userObjectId':Base64.encode(userid)})
      }
    }
  }),function (error){
    res.json({'errorId':error.code, 'errorMsg':error.message, 'userObjectId':Base64.encode(userid)})
  }

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
