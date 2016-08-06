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
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务库

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('./views/index.html');
});

// 首页导航栏api
router.get('/index', function(req, res){
  var userId = util.useridInReq(req);

  var flag = 0;
  var refusedCount = 0;
  var flagCount = 2;
  var pendingCount = 0;

  var userObject = new AV.User();
  userObject.id = userId;


  var query = new AV.Query(receiveTaskObject);
  query.equalTo('userObject', userObject);
  query.equalTo('close', false);
  query.descending('createdAt');

  var refusedcounting = 0;
  query.find().then(function(userReceiveObject){
    for (var i = 0; i < userReceiveObject.length; i++){

      (function(receiveTaskObject){
        var relation = receiveTaskObject.relation('mackTask');
        var queryUpload = relation.query();
        queryUpload.limit(1000);
        queryUpload.find().then(function(uploadTaskObject){
          var refused = 0;
          for (var e = 0; e < uploadTaskObject.length; e++){
            var taskStatus = uploadTaskObject[e].get('taskStatus');
            if (taskStatus == 'refused'){
              refused++
            }
            refusedCount = refusedCount + refused;
          }
          refusedcounting++;
          if (refusedcounting == userReceiveObject.length){
            resposeBack();
          }
        },function(){
          refusedcounting++;
          if (refusedcounting == userReceiveObject.length){
            resposeBack();
          }
        })

      })(userReceiveObject[i])
    }

  });

  var queryMyRelease = new AV.Query(releaseTaskObject);
  queryMyRelease.equalTo('userObject', userObject);
  queryMyRelease.equalTo('close', false);
  var acceptedcounting = 0;
  queryMyRelease.find().then(function(userReleaseTaskObject){
    for (var u = 0; u < userReleaseTaskObject.length; u++){

      (function(userReleaseTask){
        var queryWhoReveiveTask = new AV.Query(receiveTaskObject);
        queryWhoReveiveTask.equalTo('taskObject', userReleaseTask);
        queryWhoReveiveTask.find().then(function(receiveMyTaskObject){
          for (var j = 0; j < receiveMyTaskObject.length; j++){

            (function(receiveTaskObject){
              var relation = receiveTaskObject.relation('mackTask');
              var queryUpload = relation.query();
              queryUpload.limit(1000);
              queryUpload.find().then(function(uploadTaskObject){
                var uploaded = 0;
                for (var e = 0; e < uploadTaskObject.length; e++){
                  var taskStatus = uploadTaskObject[e].get('taskStatus');
                  if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                    uploaded++
                  }
                  pendingCount = pendingCount + uploaded;
                }
                acceptedcounting++;
                if (acceptedcounting == receiveMyTaskObject.length){
                  resposeBack()
                }
              },function(){
                acceptedcounting++;
                if (acceptedcounting == receiveMyTaskObject.length){
                  resposeBack();
                }
              })

            })(receiveMyTaskObject[j])
          }
        })
      })(userReleaseTaskObject[u])
    }
  });

  function resposeBack(){
    flag = flag + 1;
    if (flag == flagCount){
        res.json({'refusedCount':refusedCount, 'pendingCount':pendingCount, 'userObjectId':Base64.encode(userId), 'errorId':0, 'errorMsg':''})
    }
  }

  //TODO:
  //1.获取需要审核的数据条数
  //(根据用户查询,发布的哪些任务——未关闭,根据发布了哪些任务查询,有哪些人接受了我的任务,然后relation计算accepted和systemAccepted的个数)
  //2.获取我做的任务被拒绝的条数
  //(根据用户查询,做了哪些任务——未关闭,根据领取了哪些任务查询,有哪些人拒绝了我的任务,然后relation计算refused的个数)

});

module.exports = router;
