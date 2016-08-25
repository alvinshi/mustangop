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

router.get('/index', function(req, res){
    var userId = util.useridInReq(req);
    //还没有做的条数
    var toDoCount = 0;
    //被拒绝的条数
    var refusedCount = 0;

    var userObject = new AV.User();
    userObject.id = userId;

    //1.获取我做的任务被拒绝的条数
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
                    var canDoTaskCount = receTaskObject.get('receiveCount') - receTaskObject.get('expiredCount');

                    var countQuery = relation.query();
                    countQuery.limit(1000);
                    //超时的任务数目已经计算
                    countQuery.notEqualTo('taskStatus', 'expired');
                    countQuery.count().then(function(totalDoTaskCount){
                        toDoCount = toDoCount + (canDoTaskCount - totalDoTaskCount);

                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length * 2){
                            resposeBack();
                        }
                    },function(error){
                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length * 2){
                            resposeBack();
                        }
                    });

                    var queryUpload = relation.query();
                    queryUpload.equalTo('taskStatus', 'refused');
                    queryUpload.limit(1000);
                    queryUpload.count().then(function(subRefusedCount){
                        refusedCount = refusedCount + subRefusedCount;

                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length * 2){
                            resposeBack();
                        }
                    },function(error){
                        refusedPromiseIndex++;
                        if (refusedPromiseIndex == userReceiveObjects.length * 2){
                            resposeBack();
                        }
                    });
                })(userReceiveObjects[i])
            }
        }
    }, function(error){
        resposeBack();
    });

    function resposeBack(){
        res.json({'toDoCount':toDoCount, 'refusedCount':refusedCount, 'userObjectId':Base64.encode(userId), 'errorId':0, 'errorMsg':''})
    }
});

// 首页导航栏api
router.get('/index/unCheckTaskCount', function(req, res){
    var pendingCount = 0;

    var userId = util.useridInReq(req);
    var userObject = new AV.User();
    userObject.id = userId;

    //1.获取需要审核的数据条数
    //(根据用户查询,发布的哪些任务——未关闭,根据发布了哪些任务查询,有哪些人接受了我的任务,然后relation计算accepted和systemAccepted的个数)
    var queryMyRelease = new AV.Query(releaseTaskObject);
    queryMyRelease.equalTo('userObject', userObject);
    queryMyRelease.equalTo('close', false);
    function dealReceTaskUplaod(receTaskObjectList){
        var acceptedPromiseIndex = 0;
        if(receTaskObjectList == undefined || receTaskObjectList.length == 0){
            refusedResposeBack();
        }else{
            for (var reIndex = 0; reIndex < receTaskObjectList.length; reIndex++){
                (function(receiveTaskObject){
                    var relation = receiveTaskObject.relation('mackTask');
                    var queryUpload = relation.query();
                    queryUpload.limit(1000);
                    queryUpload.containedIn('taskStatus', ['uploaded', 'reUploaded']);
                    queryUpload.count().then(function(uploadTaskCount){
                        pendingCount = pendingCount + uploadTaskCount;

                        acceptedPromiseIndex++;
                        if (acceptedPromiseIndex == receTaskObjectList.length){
                            refusedResposeBack();
                        }
                    },function(error){
                        acceptedPromiseIndex++;
                        if (acceptedPromiseIndex == receTaskObjectList.length){
                            refusedResposeBack();
                        }
                    })

                })(receTaskObjectList[reIndex])
            }
        }
    }

    queryMyRelease.find().then(function(userReleaseTaskObjects){
        if(userReleaseTaskObjects == undefined || userReleaseTaskObjects.length == 0){
            refusedResposeBack();
        }else {

            var releaseCPromiseIndex = 0;
            var receTaskObjectList = [];
            for (var u = 0; u < userReleaseTaskObjects.length; u++){
                (function(userReleaseTask){
                    var queryWhoReveiveTask = new AV.Query(receiveTaskObject);
                    queryWhoReveiveTask.equalTo('taskObject', userReleaseTask);
                    queryWhoReveiveTask.equalTo('close', false);    //忽略关闭的接受任务
                    queryWhoReveiveTask.find().then(function(receiveMyTaskObjects){
                        if(receiveMyTaskObjects == undefined || receiveMyTaskObjects.length == 0){
                            releaseCPromiseIndex++;
                            if(releaseCPromiseIndex == userReleaseTaskObjects.length){
                                //集合所有的接受任务,然后再统一处理
                                dealReceTaskUplaod(receTaskObjectList);
                            }
                        }else {
                            releaseCPromiseIndex++;
                            receTaskObjectList = receTaskObjectList.concat(receiveMyTaskObjects);
                            if(releaseCPromiseIndex == userReleaseTaskObjects.length){
                                //集合所有的接受任务,然后再统一处理
                                dealReceTaskUplaod(receTaskObjectList);
                            }
                        }

                    }, function(error){
                        releaseCPromiseIndex++;
                        if(releaseCPromiseIndex == userReleaseTaskObjects.length){
                            //集合所有的接受任务,然后再统一处理
                            dealReceTaskUplaod(receTaskObjectList);
                        }
                    })
                })(userReleaseTaskObjects[u])
            }
        }
    }, function(error){
        refusedResposeBack();
    });

    function refusedResposeBack(){
        res.json({'pendingCount':pendingCount, 'errorId':0, 'errorMsg':''})
    }
});

// 未读消息显示
router.get('/index/unreadMsg', function(req, res){
    var userId = util.useridInReq(req);

    var userObject = new AV.User();
    userObject.id = userId;

    var query = new AV.Query(messageLogger);
    query.equalTo('receiverObjectId', userObject);
    query.notEqualTo('read', true);
    query.count().then(function(count){

        res.json({'unreadMsgCount':count})
    },function(error){
        res.json({'errorId': error.code, 'errorMsg': error.message});
    })
});

module.exports = router;
