/**
 * Created by tanghui on 16/7/14.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var messageLogger = AV.Object.extend('messageLogger');
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表

router.get('/', function(req, res) {
    res.render('taskCheck');
});

//*************页面左侧控制器条目*************************
router.get('/taskAudit', function(req, res){
    var userId = util.useridInReq(req);
    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.equalTo('close', false);
    query.include('appObject');
    query.ascending('createdAt');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appInfoObject = Object();

            //基本信息
            var appObject = results[i].get('appObject');
            appInfoObject.taskId = results[i].id;
            appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
            appInfoObject.trackName = appObject.get('trackName');
            appInfoObject.appId = appObject.get('appleId');
            appInfoObject.sellerName = appObject.get('sellerName');
            appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');

            //任务需求
            appInfoObject.taskType = results[i].get('taskType');
            appInfoObject.excCount = results[i].get('excCount');
            appInfoObject.detailRem = results[i].get('detailRem');
            appInfoObject.ranking = results[i].get('ranKing');
            appInfoObject.score = results[i].get('Score');
            appInfoObject.searchKeyword = results[i].get('searchKeyword');
            appInfoObject.screenshotCount = results[i].get('screenshotCount');
            appInfoObject.titleKeyword = results[i].get('titleKeyword');
            appInfoObject.commentKeyword = results[i].get('commentKeyword');

            //实时数据
            appInfoObject.remainCount = results[i].get('remainCount');
            appInfoObject.pending = results[i].get('pending');
            appInfoObject.submitted = results[i].get('submitted');
            appInfoObject.rejected = results[i].get('rejected');
            appInfoObject.accepted = results[i].get('accepted');
            appInfoObject.abandoned = results[i].get('abandoned');

            appInfoObject.completed = results[i].get('completed');
            appInfoObject.cancelled = results[i].get('cancelled');
            retApps.push(appInfoObject);
        }
        res.json({'taskAudit':retApps, 'taskInfo':appInfoObject})
    })
});

//***********************撤销任务***************************
router.get('/cancelTask/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(releaseTaskObject);
    query.include('userObject');
    query.get(taskId).then(function(taskObject){
        var reaminCount = taskObject.get('remainCount');
        var taskPrice = taskObject.get('excUnitPrice');
        var userObject = taskObject.get('userObject');

        userObject.increment('freezingMoney', -(taskPrice * reaminCount));
        userObject.increment('totalMoney', (taskPrice * reaminCount));
        taskObject.set('cancelled', true);

        if(reaminCount == taskObject.get('excCount')){
            taskObject.set('close', true);
        }

        userObject.save().then(function(){
            //返回冻结的Y币数量
            taskObject.save().then(function(){
                res.json({'errorMsg':'succeed', 'errorId': 0});
            }, function(error){
                res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
            });
        }, function(error){
            res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
    });
});

//******************点击控制器条目后触发***********************
router.get('/specTaskCheck/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(receiveTaskObject);
    var taskObject = AV.Object.createWithoutData('releaseTaskObject', taskId);
    query.equalTo('taskObject', taskObject);
    query.include('userObject');
    query.ascending('createdAt');
    query.limit(1000);
    query.find().then(function(results){
        var rtnResults = new Array();
        var promise = 0;
        var counter = 0;

        var totalGetTask = 0,  totalAccepted = 0, totalSubmited = 0;
        var totalUndo = 0, totalRejected = 0, totalTimeout = 0;

        function retJsonFunc(errorId, errorMsg){
            if (counter == promise){
                //排序;
                rtnResults.sort(function(a, b){return a.createdAt - b.createdAt});
                res.json({
                    'rtnResults':rtnResults,
                    'errorId': errorId, 'errorMsg': errorMsg,
                    'totalGetTask' : totalGetTask, 'totalAccepted': totalAccepted,
                    'totalSubmited': totalSubmited, 'totalUndo': totalUndo,
                    'totalRejected' : totalRejected, 'totalTimeout': totalTimeout
                });
            }
        }

        for (var i = 0; i < results.length; i++) {
            //receive task object
            promise++;
            var submission = Object();
            var user = results[i].get('userObject');
            //领取任务基本信息
            submission.id = results[i].id;
            submission.receiveCount = results[i].get('receiveCount');
            totalGetTask += submission.receiveCount;
            submission.receivePrice = results[i].get('receivePrice');
            submission.createdAt = results[i].createdAt;
            var username = user.get('userNickname');
            if (username == undefined){
                submission.username = user.get('username').substring(0, 7) + '****';
            }else if (username == ''){
                submission.username = user.get('username').substring(0, 7) + '****';
            }
            else {
                submission.username = username;
            }
            submission.userId = user.id;

            //获取各个上传信息
            (function(receTaskObject, tempSubmission){
                var relation = receTaskObject.relation('mackTask');
                var query = relation.query();
                query.descending('createdAt');
                query.find().then(function (data) {
                    var submitted = 0, accepted = 0, rejected = 0;
                    tempSubmission.entries = new Array();
                    for (var j = 0; j < data.length; j++) {
                        //已做任务的信息状态
                        var taskStatus = data[j].get('taskStatus');
                        if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                            submitted++;
                        }else if(taskStatus == 'systemAccepted' || taskStatus == 'accepted'){
                            accepted++;
                        }else if(taskStatus == 'refused'){
                            rejected++;
                        }

                        //已做任务详情
                        var entry = Object();
                        entry.id = data[j].id;
                        entry.uploadName = data[j].get('uploadName');
                        entry.imgs = data[j].get('requirementImgs');
                        entry.status = data[j].get('taskStatus');
                        entry.detail = data[j].get('detail');
                        tempSubmission.entries.push(entry);
                    }

                    tempSubmission.submitted = submitted;//待审核
                    totalSubmited += submitted;
                    tempSubmission.rejected = rejected;//已拒绝
                    totalRejected += rejected;
                    tempSubmission.accepted = accepted;//已完成
                    totalAccepted += accepted;
                    //未提交/已过期
                    if (receTaskObject.get('expiredCount') != undefined && receTaskObject.get('expiredCount') > 0){
                        //过期(定时器走过了)
                        tempSubmission.abandoned = receTaskObject.get('expiredCount');
                        tempSubmission.pending = 0;
                        totalTimeout += tempSubmission.abandoned;
                    }else {
                        //未提交
                        var undoTask = receTaskObject.get('receiveCount') - data.length;
                        tempSubmission.pending = undoTask;
                        tempSubmission.abandoned = 0;
                        totalUndo += undoTask;
                    }

                    rtnResults.push(tempSubmission);
                    counter++;
                    retJsonFunc(0, '');
                }, function(error){
                    counter++;
                    retJsonFunc(error.code, error.errorMsg);
                });
            })(results[i], submission);

        }
        //没有上传,返回空值
        if (promise == 0){
            retJsonFunc(0, '');
        }
    });
});

//*************接收逻辑******************************
var updateReceiveTaskDatabase = function(doTaskObject, uploaderName, res){
    var receiveTaskObject = doTaskObject.get('receiveTaskObject');

    var query = new AV.Query('receiveTaskObject');
    query.include('receiveTaskObject');
    query.include('appObject');
    query.include('userObject');
    query.include('taskObject');
    query.get(receiveTaskObject.id).then(function(receiveTaskObject) {

        //发布任务Object
        var task = receiveTaskObject.get('taskObject');
        var userObject = receiveTaskObject.get('userObject');
        var senderUserObject = task.get('userObject');
        var appObject = receiveTaskObject.get('appObject');
        //消息产生所需数据
        var userId = userObject.id;
        var senderId = task.get('userObject').id;
        var trackName = appObject.get('trackName');
        var rateUnitPrice = task.get('rateUnitPrice');

        // 接收任务后 把钱打给用户记录流水
        userObject.increment('totalMoney', rateUnitPrice);
        // 发布任务的人冻结钱变少
        senderUserObject.increment('freezingMoney', -rateUnitPrice);
        //保存2份流水
        userObject.save().then(function(){
            senderUserObject.save().then(function(){
                res.json({'errorMsg':'', 'errorId': 0});
            }, function (error) {
                res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
            });
        }, function (error) {
            res.json({'errorMsg': error.errorMsg, 'errorId': error.code});
        });

        //流水模块
        //var query = new AV.Query(accountJournal);
        //query.equalTo('incomeYCoinUser', userObject);
        //query.equalTo('taskObject', task);
        //query.find().then(function(results){
        //    for (var i = 0; i < results.length; i++){
        //        var register = results[0];
        //        var payYB = results[i].get('payYCoin'); // 支付的YB
        //        var incomeYB = results[i].get('incomeYCoin'); // 得到的YB
        //        var systemYB = payYB - incomeYB;  // 系统得到的
        //        register.set('payYCoinStatus', 'payed');
        //        register.set('incomeYCoinStatus', 'incomed');
        //        register.set('systemYCoin', systemYB);
        //        register.save().then(function(){
        //            //
        //        });
        //    }
        //});

        //消息模块
        acceptMessage(userId, senderId, trackName, uploaderName, rateUnitPrice);

    }, function(error){
        res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
    });
};

var acceptMessage = function(receiverId, senderId, trackName, uploaderName, rateUnitPrice){
    var message = new messageLogger();
    var receiver = new AV.User();
    receiver.id = receiverId;
    var sender = new AV.User();
    sender.id = senderId;
    message.set('receiverObjectId', receiver);
    message.set('senderObjectId', sender);
    message.set('category', '任务');
    message.set('type', '接受');
    message.set('firstPara', trackName);
    message.set('secondPara', uploaderName);
    message.set('thirdPara', rateUnitPrice);
    message.save();
};

router.post('/accept/:entryId', function(req, res) {
    var entryId = req.params.entryId;
    var query = new AV.Query(mackTaskInfo);
    query.include('receiveTaskObject');
    query.include('receiveTaskObject.taskObject');
    query.get(entryId).then(function(doTaskObject) {
        var uploaderName = doTaskObject.get('uploadName');
        doTaskObject.set("taskStatus", 'accepted');
        doTaskObject.save().then(function () {
            updateReceiveTaskDatabase(doTaskObject, uploaderName, res);
        }, function(error){
            res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
    });
});

//*************拒绝逻辑******************************
var rejectMessage = function(res, doTaskObject, uploaderName){
    var receiveTaskObject = doTaskObject.get('receiveTaskObject');

    var query = new AV.Query('receiveTaskObject');
    query.include('receiveTaskObject');
    query.include('appObject');
    query.include('userObject');
    query.include('taskObject');
    query.get(doTaskObject.get('receiveTaskObject').id).then(function(receiveTaskObject) {

        //发布任务Object
        var task = receiveTaskObject.get('taskObject');
        var userObject = receiveTaskObject.get('userObject');
        var appObject = receiveTaskObject.get('appObject');
        //消息产生所需数据
        var trackName = appObject.get('trackName');
        var rateUnitPrice = task.get('rateUnitPrice');

        var userId = userObject.id;
        var senderId = task.get('userObject').id;

        var message = new messageLogger();
        message.set('receiverObjectId', userId);
        message.set('senderObjectId', senderId);
        message.set('category', '任务');
        message.set('type', '拒绝');
        message.set('firstPara', '你有一条任务被拒绝');
        message.set('secondPara', uploaderName);

        //add by wujiangwei
        //谁谁做的任务被拒绝,点击查看任务
        message.set('receiveTaskObject', receiveTaskObject);
        message.set('uploaderName', uploaderName);
        message.save();

        res.json({'errorMsg':'', 'errorId': 0});
    }, function(error){
        res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
    });
};

router.post('/reject/:entryId', function(req, res) {

    var rejectReason = req.body.rejectReason;
    var entryId = req.params.entryId;
    var query = new AV.Query(mackTaskInfo);
    query.include('receiveTaskObject');
    query.include('receiveTaskObject.taskObject');
    query.get(entryId).then(function(doTaskObject) {
        var uploaderName = doTaskObject.get('uploadName');
        doTaskObject.set("taskStatus", 'refused');
        doTaskObject.set('detail', rejectReason);
        doTaskObject.save().then(function () {
            rejectMessage(res, doTaskObject, uploaderName);
        }, function(error){
            res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.errorMsg, 'errorId': error.code});
    });
});

module.exports = router;