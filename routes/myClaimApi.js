/**
 * Created by cailong on 16/7/20.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var taskDemandObject = AV.Object.extend('taskDemandObject');
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布的库
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库


router.get('/', function(req, res) {
    res.render('login');
});

router.get('/:userObjectId', function(req, res) {
    res.render('myClaim');
});

router.post('/claim/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);
    var uploadName = req.body.uploadName;//TODO

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', user);
    query.notEqualTo('close', true);
    query.include('taskObject');
    query.include('appObject');
    query.descending('createdAt');

    var calNumber = 0;
    query.find().then(function(results){

        if(results.length == 0){
            res.json({'myClaimApps':[], 'errorId': 0});
            return;
        }

        var retApps = new Array();
        for (var i = 0; i< results.length; i++){
            var appHisObject = new Object();
            var appExcHisObject = results[i].get('taskObject');
            var appobject = results[i].get('appObject');

            if (appExcHisObject == undefined){
                calNumber++;
                continue;
            }
            appHisObject.taskObjectId = results[i].id;
            appHisObject.createdAt = results[i].createdAt;
            appHisObject.excKinds = appExcHisObject.get('taskType');
            //total count
            appHisObject.detailRem = results[i].get('detailRem');
            appHisObject.totalExcCount = results[i].get('receiveCount');
            //过期
            appHisObject.abandoned = results[i].get('expiredCount');

            //base info
            appHisObject.trackName = appobject.get('trackName');
            appHisObject.artworkUrl100 = appobject.get('artworkUrl100');
            appHisObject.artworkUrl512 = appobject.get('artworkUrl512');
            appHisObject.appleId = appobject.get('appleId');
            //appHisObject.appleKind = appobject.get('appleKind');
            //appHisObject.formattedPrice = appobject.get('formattedPrice');
            //appHisObject.sellerName = appobject.get('sellerName');
            appHisObject.latestReleaseDate = appobject.get('latestReleaseDate');

            //计算截至时间,下午6点前接受的任务,第二天早上8点,6点后接受的任务,第三天早上8点
            var createDate = results[i].createdAt;
            var expireTimeStamp = 0;
            var createHours = createDate.getHours();
            //早10点审核 前天下午6点前接受的任务
            if (createHours < 18){
                expireTimeStamp = createDate.getTime() + 1000*60*60*24;
            }else {
                expireTimeStamp = createDate.getTime() + 1000*60*60*48;
            }
            var expireDate = new Date(expireTimeStamp);
            appHisObject.deadlineStr = '截止:' +
                (expireDate.getMonth() + 1).toString() + '月' + expireDate.getDate().toString() + '日 9:50am';

            //未完成 审核中 被拒绝 已通过
            (function (receTaskObject, inAppHisObject){
                var relation = receTaskObject.relation('mackTask');
                var query = relation.query();
                query.limit(1000);
                query.find().then(function(doTaskObjects){
                    var submitted = 0, accepted = 0, rejected = 0;
                    for (var r = 0; r < doTaskObjects.length; r++){
                        var taskStatus = doTaskObjects[r].get('taskStatus');
                        if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                            submitted++;
                        }else if(taskStatus == 'systemAccepted' || taskStatus == 'accepted'){
                            accepted++;
                        }else if(taskStatus == 'refused'){
                            rejected++;
                        }else if(taskStatus == 'expired'){
                            //已经在定时器里增加过期数据,无需在这边计算 —— 唉
                        }
                    }

                    var undoTask = receTaskObject.get('receiveCount') - inAppHisObject.abandoned - doTaskObjects.length;
                    inAppHisObject.surplusCount = undoTask;

                    inAppHisObject.submitted = submitted;
                    inAppHisObject.accepted = accepted;
                    inAppHisObject.rejected = rejected;

                    inAppHisObject.noticeNumber = undoTask + rejected;

                    //accepted + abandoned == receiveCount
                    //暂时不做,需要手动关闭
                    //任务已经结束
                    if(accepted + inAppHisObject.abandoned >= receTaskObject.get('receiveCount')){
                        inAppHisObject.canClose = true;
                        //不自动关
                        //inAppHisObject.set('close', true);
                    }

                    retApps.push(inAppHisObject);

                    calNumber++;
                    if (calNumber == results.length){
                        retApps.sort(function(b, a){return a.createdAt - b.createdAt});
                        res.json({'myClaimApps':retApps, 'errorId': 0});
                    }
                }, function (error) {
                    calNumber++;
                    if (calNumber == results.length){
                        retApps.sort(function(b, a){return a.createdAt - b.createdAt});
                        res.json({'myClaimApps':retApps, 'errorId': 0});
                    }
                });
            }(results[i], appHisObject));
        }
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 修改分配备注
router.post('/saveRemark/:userObjectId', function(req, res){
    var userdetaRem = req.body.remark;
    var taskid = req.body.taskObjectId;

    var query = new AV.Query(receiveTaskObject);
    query.get(taskid).then(function(results){
        results.set('detailRem', userdetaRem);
        results.save().then(function(){
            res.json({'errorId':0, 'errorMsg':''});
        }, function(error){
            res.json({'errorId':error.code, 'errorMsg':error.message});
        });

    }, function(error){
        res.json({'errorId':error.code, 'errorMsg':error.message});
    })

});

// 一键关闭已经过期或者被成功接收的任务
router.post('/closeTask/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);

    var userObject = new AV.User();
    userObject.id = userId;

    var userFinishTaskList = Array();
    // 查询用户领取的任务 已经过期或者被成功接收的任务
    var query = new AV.Query(receiveTaskObject);

    query.equalTo('userObject', userObject);
    query.equalTo('close', false); // 忽略关闭的任务
    query.find().then(function(userReceiveObjects){
        var queryIndex = 0;
        //var successNub = 0;
        if (userReceiveObjects == undefined || userReceiveObjects.length == 0){
            res.json({'errorId': 1, 'errorMsg':'数据异常,没有任务可关闭'})
        }else {
            for (var i = 0; i < userReceiveObjects.length; i++){
                var userReceiveCount = userReceiveObjects[i].get('receiveCount');

                (function(userUploadTaskObject, userRecCount){
                    var relation = userUploadTaskObject.relation('mackTask');
                    var queryUpload = relation.query();
                    queryUpload.containedIn('taskStatus', ['accepted', 'systemAccepted']);
                    queryUpload.count().then(function(doTaskCount){

                        var userDoneTask = doTaskCount + userUploadTaskObject.get('expiredCount'); // 做完的 加 过期的
                        if (userDoneTask >= userRecCount){
                            userUploadTaskObject.set('close', true);
                            userFinishTaskList.push(userUploadTaskObject);
                            // 判断过期和做完的任务 等不等于总数 等于总数就set
                        }
                        queryIndex = queryIndex + 1;
                        //successNub = successNub + 1;

                        // 相当于一个计数 和查出来的总数比较 如果相等 就返回
                        if (queryIndex == userReceiveObjects.length){
                            saveAll();
                        }
                    },function(error){
                        //
                        queryIndex = queryIndex + 1;
                        if (queryIndex == userReceiveObjects.length){
                            saveAll();
                        }
                    })
                })(userReceiveObjects[i], userReceiveCount)

            }
        }
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });

    function saveAll(){
        // 最后统一保存
        if (userFinishTaskList.length == 0 || userFinishTaskList == undefined){
            res.json({'errorId': 1, 'errorMsg':'没有任务可关闭'})
        }else {
            AV.Object.saveAll(userFinishTaskList).then(function(){
                res.json({'errorId': 0, 'errorMsg':'一键关闭成功'})

            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }
    }
});


module.exports = router;