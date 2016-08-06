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
    console.log('nav count request');
    var flag = 0;
    var refusedCount = 0;
    var flagCount = 2;
    var pendingCount = 0;

    var userObject = new AV.User();
    userObject.id = userId;

    //2.获取我做的任务被拒绝的条数
    //(根据用户查询,做了哪些任务——未关闭,根据领取了哪些任务查询,有哪些人拒绝了我的任务,然后relation计算refused的个数)
    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', userObject);
    query.equalTo('close', false);
    query.descending('createdAt');

    query.find().then(function(userReceiveObjects){
        if(userReceiveObjects == undefined || userReceiveObjects.length == 0){
            resposeBack();
        }else {
            var refusedPromiseIndex = 0;
            for (var i = 0; i < userReceiveObjects.length; i++){

                (function(receTaskObject){
                    var relation = receTaskObject.relation('mackTask');
                    var queryUpload = relation.query();
                    queryUpload.equalTo('taskStatus', 'refused');
                    queryUpload.limit(1000);
                    queryUpload.count().then(function(subRefusedCount){
                        refusedCount = refusedCount + subRefusedCount;

                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length){
                            resposeBack();
                        }
                    },function(error){
                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length){
                            resposeBack();
                        }
                    })

                })(userReceiveObjects[i])
            }
        }
    }, function(error){
        resposeBack();
    });

    var queryMyRelease = new AV.Query(releaseTaskObject);
    queryMyRelease.equalTo('userObject', userObject);
    queryMyRelease.equalTo('close', false);

    queryMyRelease.find().then(function(userReleaseTaskObjects){
        if(userReleaseTaskObjects == undefined || userReleaseTaskObjects.length == 0){
            resposeBack();
        }else {
            var acceptedPromiseIndex = 0;
            for (var u = 0; u < userReleaseTaskObjects.length; u++){

                (function(userReleaseTask){
                    var queryWhoReveiveTask = new AV.Query(receiveTaskObject);
                    queryWhoReveiveTask.equalTo('taskObject', userReleaseTask);
                    queryWhoReveiveTask.equalTo('close', false);    //忽略关闭的接受任务
                    queryWhoReveiveTask.find().then(function(receiveMyTaskObjects){
                        if(receiveMyTaskObjects == undefined || receiveMyTaskObjects.length == 0){
                            resposeBack();
                        }else {
                            for (var j = 0; j < receiveMyTaskObjects.length; j++){

                                (function(receiveTaskObject){
                                    var relation = receiveTaskObject.relation('mackTask');
                                    var queryUpload = relation.query();
                                    queryUpload.limit(1000);
                                    queryUpload.containedIn('taskStatus', ['uploaded', 'reUploaded']);
                                    queryUpload.count().then(function(uploadTaskCount){
                                        pendingCount = pendingCount + uploadTaskCount;
                                        acceptedPromiseIndex++;
                                        if (acceptedPromiseIndex == receiveMyTaskObjects.length){
                                            resposeBack()
                                        }
                                    },function(error){
                                        acceptedPromiseIndex++;
                                        if (acceptedPromiseIndex == receiveMyTaskObjects.length){
                                            resposeBack();
                                        }
                                    })

                                })(receiveMyTaskObjects[j])
                            }
                        }

                    }, function(error){
                        resposeBack();
                    })
                })(userReleaseTaskObjects[u])
            }
        }

    }, function(error){
        resposeBack();
    });

    function resposeBack(){
        console.log('nav count');
        flag = flag + 1;
        if (flag == flagCount){
            console.log('nav count response');
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
