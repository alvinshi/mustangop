var express = require('express');
var AV = require('leanengine');
var router = express.Router();
var https = require('https');
var util = require('./util');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('./views/index.html');
});

// 首页导航栏api
router.get('/index', function(req, res){
  var userid = util.useridInReq(req);

  var user = new AV.User();
  user.id = userid;

  var query =new AV.Query(IOSAppBinder);
  query.equalTo('userObject', user);
  query.include('appObject');
  query.find({
    success:function(results){
      var retApps = new Array();
      for (var i= 0; i < results.length; i++){
        var appNameObject = new Object();
        var hisappObject = results[i].get('appObject');
        var userobject = results[i].get('userObject');
        appNameObject.trackName = hisappObject.get('trackName').substring(0, 8) + '...';
        appNameObject.appid = hisappObject.get('appleId');
        retApps.push(appNameObject);
        appNameObject.userObjectId = Base64.encode(userobject.id);
      }
      res.json({'tracknameAPPs':retApps, 'userObjectId':appNameObject});
    }
  }),function (error){
    res.json({'errorId':error.code, 'errorMsg':error.message})
  }

});

module.exports = router;
