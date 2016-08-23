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
//************* 全新合并,一次性请求全部的数据 *************
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
        if (results == undefined || results.length == 0){
            res.json({'errorId': 0, 'errorMsg': '', 'taskAudit': []});
            return;
        }

        var retApps = Array();

        //第一个异步准备
        var promiseForReceive = results.length;
        var counterForReceive = 0;

        for (var i = 0; i < results.length; i++){
            var taskInfoObject = Object();

            //基本信息
            var appObject = results[i].get('appObject');
            taskInfoObject.taskId = results[i].id;
            taskInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
            taskInfoObject.trackName = appObject.get('trackName');
            if (taskInfoObject.trackName.length > 20){
                taskInfoObject.trackName = taskInfoObject.trackName.substring(0,19) + '...';
            }
            taskInfoObject.appId = appObject.get('appleId');
            taskInfoObject.sellerName = appObject.get('sellerName');
            taskInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');
            taskInfoObject.excUniqueCode = appObject.get('excUniqueCode');
            taskInfoObject.createdAt = results[i].createdAt;

            //任务需求
            taskInfoObject.taskType = results[i].get('taskType');
            taskInfoObject.excCount = results[i].get('excCount');
            taskInfoObject.detailRem = results[i].get('detailRem');
            taskInfoObject.ranking = results[i].get('ranKing');
            taskInfoObject.score = results[i].get('Score');
            taskInfoObject.searchKeyword = results[i].get('searchKeyword');
            taskInfoObject.screenshotCount = results[i].get('screenshotCount');
            taskInfoObject.titleKeyword = results[i].get('titleKeyword');
            taskInfoObject.commentKeyword = results[i].get('commentKeyword');

            //实时数据
            taskInfoObject.remainCount = results[i].get('remainCount');
            taskInfoObject.cancelled = results[i].get('cancelled');

            //查询领取任务数据库
            (function(tempAppInfoObject, taskObject){
                tempAppInfoObject.submissions = Array();
                var query = new AV.Query(receiveTaskObject);
                query.equalTo('taskObject', taskObject);
                query.exists('receiveCount');
                query.include('userObject');
                query.ascending('createdAt');
                query.limit(1000);
                query.find().then(function(results){
                    var promise = results.length;
                    var counter = 0;

                    tempAppInfoObject.totalGetTask = 0;
                    tempAppInfoObject.totalAccepted = 0;
                    tempAppInfoObject.totalSubmited = 0;
                    tempAppInfoObject.totalUndo = 0;
                    tempAppInfoObject.totalRejected = 0;
                    tempAppInfoObject.totalTimeout = 0;

                    function tryReturn(errorId, errorMsg){
                        if (counterForReceive == promiseForReceive){
                            retApps.sort(function(a, b){return (a.createdAt > b.createdAt)?1:-1});
                            res.json({'taskAudit':retApps, 'errorId': errorId, 'errorMsg': errorMsg});
                        }
                    }

                    if(results.length == 0){
                        retApps.push(tempAppInfoObject);
                        counterForReceive++;
                        tryReturn(0, '');
                        return;
                    }

                    for (var i = 0; i < results.length; i++) {
                        //receive task object
                        var submission = Object();
                        var user = results[i].get('userObject');
                        //领取任务基本信息
                        submission.id = results[i].id;
                        submission.receiveCount = results[i].get('receiveCount');
                        tempAppInfoObject.totalGetTask += submission.receiveCount;
                        submission.receivePrice = results[i].get('receivePrice');
                        submission.createdAt = results[i].createdAt;
                        var userNickname = user.get('userNickname');
                        var userQQ = user.get('userQQ');
                        //优先QQ,其次昵称,其次手机号(有码)
                        if(userQQ != undefined && userQQ.length > 0){
                            submission.username = 'QQ: ' + userQQ;
                        }else {
                            if (userNickname == undefined || userNickname.length == 0){
                                submission.username = user.get('username').substring(0, 7) + '****';
                            }else{
                                submission.username = userNickname;
                            }
                        }

                        submission.userId = user.id;

                        //获取各个上传信息
                        (function(receTaskObject, tempSubmission){
                            var relation = receTaskObject.relation('mackTask');
                            var query = relation.query();
                            query.descending('createdAt');
                            query.find().then(function (data) {
                                var submitted = 0, accepted = 0, rejected = 0;
                                tempSubmission.entries = Array();
                                for (var j = 0; j < data.length; j++) {
                                    //已做任务的信息状态
                                    var taskStatus = data[j].get('taskStatus');
                                    if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                                        submitted++;
                                    }else if(taskStatus == 'systemAccepted' || taskStatus == 'accepted'){
                                        accepted++;
                                    }else if(taskStatus == 'refused'){
                                        rejected++;
                                    }else if(taskStatus == 'expired'){
                                        //已经在定时器里增加过期数据,无需在这边计算 —— 唉
                                    }

                                    //已做任务详情
                                    var entry = Object();
                                    entry.id = data[j].id;
                                    entry.uploadName = data[j].get('uploadName');
                                    entry.imgs = data[j].get('requirementImgs');
                                    entry.status = data[j].get('taskStatus');
                                    entry.detail = data[j].get('detail');
                                    entry.updatedAt = data[j].updatedAt;
                                    tempSubmission.entries.push(entry);
                                }

                                tempSubmission.submitted = submitted;//待审核
                                tempAppInfoObject.totalSubmited += submitted;
                                tempSubmission.rejected = rejected;//已拒绝
                                tempAppInfoObject.totalRejected += rejected;
                                tempSubmission.accepted = accepted;//已完成
                                tempAppInfoObject.totalAccepted += accepted;
                                //未提交/已过期
                                if (receTaskObject.get('expiredCount') != undefined && receTaskObject.get('expiredCount') > 0){
                                    //过期(定时器走过了)
                                    tempSubmission.abandoned = receTaskObject.get('expiredCount');
                                    tempSubmission.pending = 0;
                                    tempAppInfoObject.totalTimeout += tempSubmission.abandoned;
                                }else {
                                    //未提交
                                    var undoTask = receTaskObject.get('receiveCount') - data.length;
                                    tempSubmission.pending = undoTask;
                                    tempSubmission.abandoned = 0;
                                    tempAppInfoObject.totalUndo += undoTask;
                                }

                                counter++;
                                tempAppInfoObject.submissions.push(tempSubmission);

                                if (counter == promise){
                                    retApps.push(tempAppInfoObject);
                                    counterForReceive++;
                                    tryReturn(0, '');
                                }
                            }, function(error){
                                counter++;
                                if (counter == promise){
                                    retApps.push(tempAppInfoObject);
                                    counterForReceive++;
                                    tryReturn(0, '');
                                }
                            });
                        })(results[i], submission);

                    }
                    //没有上传,返回空值
                    if (promise == 0){
                        retJsonFunc(0, '');
                    }
                }, function(error){
                    counterForReceive++;
                    tryReturn(0, '');
                });
            })(taskInfoObject, results[i]);
        }
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

//***********************撤销任务***************************
router.get('/cancelTask/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(releaseTaskObject);
    query.include('userObject');
    query.get(taskId).then(function(taskObject){
        var remainCount = taskObject.get('remainCount');
        var taskPrice = taskObject.get('excUnitPrice');
        var userObject = taskObject.get('userObject');
        var excCount = taskObject.get('excCount');

        userObject.increment('freezingMoney', -(taskPrice * remainCount));
        userObject.increment('totalMoney', (taskPrice * remainCount));
        taskObject.set('cancelled', true);

        if(remainCount == taskObject.get('excCount')){
            taskObject.set('close', true);
        }

        taskObject.set('excCount', excCount - remainCount);
        taskObject.set('remainCount', 0);

        userObject.save().then(function(){
            //返回冻结的Y币数量
            taskObject.save().then(function(){
                res.json({'errorMsg':'succeed', 'errorId': 0});
            }, function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }, function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

////******************点击控制器条目后触发***********************
//router.get('/specTaskCheck/:taskId', function(req, res){
//    var taskId = req.params.taskId;
//    var query = new AV.Query(receiveTaskObject);
//    var taskObject = AV.Object.createWithoutData('releaseTaskObject', taskId);
//    query.equalTo('taskObject', taskObject);
//    query.exists('receiveCount');
//    query.include('userObject');
//    query.ascending('createdAt');
//    query.limit(1000);
//    query.find().then(function(results){
//        var rtnResults = new Array();
//        var promise = 0;
//        var counter = 0;
//
//        var totalGetTask = 0,  totalAccepted = 0, totalSubmited = 0;
//        var totalUndo = 0, totalRejected = 0, totalTimeout = 0;
//
//        if(results.length == 0){
//            retJsonFunc(0, '');
//            return;
//        }
//
//        function retJsonFunc(errorId, errorMsg){
//            if (counter == promise){
//                //排序;
//                rtnResults.sort(function(a, b){return a.createdAt - b.createdAt});
//                res.json({
//                    'rtnResults':rtnResults,
//                    'errorId': errorId, 'errorMsg': errorMsg,
//                    'totalGetTask' : totalGetTask, 'totalAccepted': totalAccepted,
//                    'totalSubmited': totalSubmited, 'totalUndo': totalUndo,
//                    'totalRejected' : totalRejected, 'totalTimeout': totalTimeout
//                });
//            }
//        }
//
//        for (var i = 0; i < results.length; i++) {
//            //receive task object
//            promise++;
//            var submission = Object();
//            var user = results[i].get('userObject');
//            //领取任务基本信息
//            submission.id = results[i].id;
//            submission.receiveCount = results[i].get('receiveCount');
//            totalGetTask += submission.receiveCount;
//            submission.receivePrice = results[i].get('receivePrice');
//            submission.createdAt = results[i].createdAt;
//            var username = user.get('userNickname');
//            if (username == undefined){
//                submission.username = user.get('username').substring(0, 7) + '****';
//            }else if (username == ''){
//                submission.username = user.get('username').substring(0, 7) + '****';
//            }
//            else {
//                submission.username = username;
//            }
//            submission.userId = user.id;
//
//            //获取各个上传信息
//            (function(receTaskObject, tempSubmission){
//                var relation = receTaskObject.relation('mackTask');
//                var query = relation.query();
//                query.descending('createdAt');
//                query.find().then(function (data) {
//                    var submitted = 0, accepted = 0, rejected = 0;
//                    tempSubmission.entries = new Array();
//                    for (var j = 0; j < data.length; j++) {
//                        //已做任务的信息状态
//                        var taskStatus = data[j].get('taskStatus');
//                        if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
//                            submitted++;
//                        }else if(taskStatus == 'systemAccepted' || taskStatus == 'accepted'){
//                            accepted++;
//                        }else if(taskStatus == 'refused'){
//                            rejected++;
//                        }else if(taskStatus == 'expired'){
//                            //已经在定时器里增加过期数据,无需在这边计算 —— 唉
//                        }
//
//                        //已做任务详情
//                        var entry = Object();
//                        entry.id = data[j].id;
//                        entry.uploadName = data[j].get('uploadName');
//                        entry.imgs = data[j].get('requirementImgs');
//                        entry.status = data[j].get('taskStatus');
//                        entry.detail = data[j].get('detail');
//                        tempSubmission.entries.push(entry);
//                    }
//
//                    tempSubmission.submitted = submitted;//待审核
//                    totalSubmited += submitted;
//                    tempSubmission.rejected = rejected;//已拒绝
//                    totalRejected += rejected;
//                    tempSubmission.accepted = accepted;//已完成
//                    totalAccepted += accepted;
//                    //未提交/已过期
//                    if (receTaskObject.get('expiredCount') != undefined && receTaskObject.get('expiredCount') > 0){
//                        //过期(定时器走过了)
//                        tempSubmission.abandoned = receTaskObject.get('expiredCount');
//                        tempSubmission.pending = 0;
//                        totalTimeout += tempSubmission.abandoned;
//                    }else {
//                        //未提交
//                        var undoTask = receTaskObject.get('receiveCount') - data.length;
//                        tempSubmission.pending = undoTask;
//                        tempSubmission.abandoned = 0;
//                        totalUndo += undoTask;
//                    }
//
//                    rtnResults.push(tempSubmission);
//                    counter++;
//                    retJsonFunc(0, '');
//                }, function(error){
//                    counter++;
//                    retJsonFunc(error.code, error.message);
//                });
//            })(results[i], submission);
//
//        }
//        //没有上传,返回空值
//        if (promise == 0){
//            retJsonFunc(0, '');
//        }
//    });
//});

//*************接收逻辑******************************
var updateReceiveTaskDatabase = function(doTaskObject, uploaderName, res){
    var receiveTaskObject = doTaskObject.get('receiveTaskObject');

    var query = new AV.Query('receiveTaskObject');
    query.include('receiveTaskObject');
    query.include('appObject');
    query.include('userObject');
    query.include('taskObject');
    query.include('taskObject.userObject');
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

        //第一次提交任务被接受赠送50YB(仅对新用户有效)
        if(userObject.get('registerBonus') == 'register_upload_task' && userObject.get('feedingMoney') == 0){
            userObject.increment('totalMoney', 50);
            userObject.increment('feedingMoney', 50);
            userObject.increment('freezingMoney', -50);
            userObject.set('registerBonus', 'register_accept_task');
            //新手任务奖励消息(50YB)
        }else {
            // 接收任务后 把钱打给用户记录流水
            userObject.increment('totalMoney', rateUnitPrice);
            //消息模块
            acceptMessage(userId, senderId, trackName, uploaderName, rateUnitPrice);
        }

        // 发布任务的人冻结钱变少
        senderUserObject.increment('freezingMoney', -rateUnitPrice);
        //保存2份流水
        userObject.save().then(function(){
            senderUserObject.save().then(function(){
                res.json({'errorMsg':'', 'errorId': 0});
            }, function (error) {
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }, function (error) {
            res.json({'errorMsg': error.message, 'errorId': error.code});
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
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
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
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
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
        res.json({'errorMsg':error.message, 'errorId': error.code});
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
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 我的审核 一键关闭 完成的 过期的
router.post('/turnOff', function(req, res){
    var userId = util.useridInReq(req);

    var userObject = new AV.User();
    userObject.id = userId;

    var dealReceObjects = Array();

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', userObject);
    query.equalTo('close', false);
    query.equalTo('remainCount', 0);
    query.limit(1000);
    query.descending('createdAt');
    query.find().then(function(releaseTaskObjects){
        var queryIndex = 0;
        if (releaseTaskObjects == undefined || releaseTaskObjects.length == 0){
            sendRes('没有任务可以关闭哦', 0)
        }else {
            for (var i = 0; i < releaseTaskObjects.length; i++){
                var releaseCount = releaseTaskObjects[i].get('excCount');

                (function(temReceiveTaskObject){
                    var receiveQuery = new AV.Query(receiveTaskObject);
                    receiveQuery.equalTo('taskObject', temReceiveTaskObject);
                    receiveQuery.limit(1000);
                    receiveQuery.descending('createdAt');
                    receiveQuery.find().then(function(recTaskObjects){

                        queryIndex++;
                        dealReceObjects = dealReceObjects.concat(recTaskObjects);
                        if (queryIndex == releaseTaskObjects.length){
                            dealAllReceObjectList(dealReceObjects);
                        }
                    }, function(error){
                        queryIndex++;
                        if (queryIndex == releaseTaskObjects.length){
                            dealAllReceObjectList(dealReceObjects);
                        }
                    });
                })(releaseTaskObjects[i], releaseCount)
            }
        }
    },function(error){
        sendRes(error.message, error.code);
    });

    var needSaveReleaseTaskList = [];
    //function just can call once!!!
    function dealAllReceObjectList(receList){
        var receQueryIndex = 0;
        for (var e = 0; e < receList.length; e++){

            (function(receTaskObject){
                var expiredCount = receList[e].get('expiredCount');
                var relation = receTaskObject.relation('mackTask');
                var queryUpload = relation.query();
                queryUpload.containedIn('taskStatus', ['accepted', 'systemAccepted']);
                queryUpload.count().then(function(finishCount){
                    var taskObject = receTaskObject.get('taskObject');
                    if (receTaskObject.get('receiveCount') <= expiredCount + finishCount){
                        taskObject.set('close', true);
                    }else {
                        taskObject.set('close', false);
                    }

                    util.addLeanObject(taskObject, needSaveReleaseTaskList);
                    receQueryIndex++;
                    if (receQueryIndex == receList.length){
                        allSave();
                    }
                },function(error){
                    receQueryIndex++;
                    if (receQueryIndex == receList.length){
                        allSave();
                    }
                });
            })(receList[e]);
        }
    }

    function allSave(){
        if (needSaveReleaseTaskList.length == 0 || needSaveReleaseTaskList == undefined){
            sendRes('没有任务可以关闭', 0)
        }else {
            AV.Object.saveAll(needSaveReleaseTaskList).then(function(){
                sendRes("一键关闭成功", 0);
            },function(error){
                sendRes(error.message, error.code);
            })
        }
    }

    function sendRes(errorMsg, errorId){
        res.json({'errorMsg':errorMsg, 'errorId': errorId});
    }

});

// 我的审核 单个关闭 已经完成和已经过期的任务
router.post('/turnOffOneTask', function(req, res){
    var taskId = req.body.taskId;

    var receiveTaskList = Array();

    var query = new AV.Query(releaseTaskObject);
    query.get(taskId).then(function(taskObject){
        if(taskObject.length == 0 || taskObject == undefined){
            sendRes('任务不存在', -1);
        }else {
            (function(temTaskObject){
                var receiveQuery = new AV.Query(receiveTaskObject);
                receiveQuery.equalTo('taskObject', temTaskObject);
                receiveQuery.limit(1000);
                receiveQuery.descending('createdAt');
                receiveQuery.find().then(function(recTaskObjects){
                    receiveTaskList = receiveTaskList.concat(recTaskObjects);
                    dealAllReceObjectList(receiveTaskList);

                }, function(error){
                    dealAllReceObjectList(receiveTaskList);
                });
            })(taskObject)
        }

    },function(error){
        sendRes(error.message, error.code)
    });

    var needSaveReleaseTaskList = [];
    //function just can call once!!!
    function dealAllReceObjectList(receiveList){
        var receQueryIndex = 0;
        for (var e = 0; e < receiveList.length; e++){

            (function(receTaskObject){
                var expiredCount = receiveList[e].get('expiredCount');
                var relation = receTaskObject.relation('mackTask');
                var queryUpload = relation.query();
                queryUpload.containedIn('taskStatus', ['accepted', 'systemAccepted']);
                queryUpload.count().then(function(finishCount){
                    var enTaskObject = receTaskObject.get('taskObject');
                    if (receTaskObject.get('receiveCount') <= expiredCount + finishCount){
                        enTaskObject.set('close', true);
                    }else {
                        enTaskObject.set('close', false);
                    }

                    util.addLeanObject(enTaskObject, needSaveReleaseTaskList);
                    receQueryIndex++;
                    if (receQueryIndex == receiveList.length){
                        allSave();
                    }
                },function(error){
                    receQueryIndex++;
                    if (receQueryIndex == receiveList.length){
                        allSave();
                    }
                });
            })(receiveList[e]);
        }
    }

    function allSave(){
        if (needSaveReleaseTaskList == undefined || needSaveReleaseTaskList.length == 0 ){
            sendRes('没有任务可以关闭', 0)
        }else {
            AV.Object.saveAll(needSaveReleaseTaskList).then(function(){
                sendRes("关闭成功", 0);
            },function(error){
                sendRes(error.message, error.code);
            })
        }
    }

    function sendRes(errorMsg,errorId){
        res.json({'errorMsg':errorMsg, 'errorId': errorId});
    }
});

module.exports = router;