/**
 * Created by tanghui on 16/7/14.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var messager = require('../utils/messager');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');

var tempUserSQL = AV.Object.extend('tempUser');

var YCoinToRMBRate = 0.45;
var masterRMBRate = 0.2; //师徒获取Y币比率

router.get('/', function(req, res) {
    res.render('taskCheck');
});

function userReceTaskDetail(tempSubmission, tempAppInfoObject, receTaskObject, data){
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
}

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
    query.descending('createdAt');
    query.find().then(function(results){
        if (results == undefined || results.length == 0){
            res.json({'errorId': 0, 'errorMsg': '', 'taskAudit': []});
            return;
        }

        var retApps = Array();

        //第一个异步准备
        var promiseForReceive = results.length;
        var counterForReceive = 0;

        function tryReturn(errorId, errorMsg){
            if (counterForReceive == promiseForReceive){
                retApps.sort(function(a, b){return (a.createdAt < b.createdAt)?1:-1});
                res.json({'taskAudit':retApps, 'errorId': errorId, 'errorMsg': errorMsg});
            }
        }

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
                //小马
                query.include('tempUserObject');
                query.include('tempMackTask');

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

                    if(results.length == 0){
                        retApps.push(tempAppInfoObject);
                        counterForReceive++;
                        tryReturn(0, '');
                        return;
                    }

                    for (var i = 0; i < results.length; i++) {
                        //receive task object
                        var submission = Object();
                        submission.id = results[i].id;
                        submission.receiveCount = results[i].get('receiveCount');
                        tempAppInfoObject.totalGetTask += submission.receiveCount;
                        submission.createdAt = results[i].createdAt;

                        var user = results[i].get('userObject');
                        var tempUser = results[i].get('tempUserObject');

                        if(user != undefined){
                            //换评系统里领取任务基本信息
                            submission.userId = user.id;
                            submission.receivePrice = results[i].get('receivePrice');

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

                            //具体做的任务信息
                            (function(receTaskObject, tempSubmission){
                                var relation = receTaskObject.relation('mackTask');
                                var query = relation.query();
                                query.descending('createdAt');
                                query.find().then(function (data) {

                                    userReceTaskDetail(tempSubmission, tempAppInfoObject, receTaskObject, data);

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
                        }else if(tempUser != undefined){
                            //小马系统领取的任务
                            //DEBUYDEBUG
                            var tempMackTask = results[i].get('tempMackTask');
                            if(tempMackTask != undefined){
                                userReceTaskDetail(submission, tempAppInfoObject, results[i], [tempMackTask]);
                            }else {
                                userReceTaskDetail(submission, tempAppInfoObject, results[i], []);
                            }

                            counter++;
                            tempAppInfoObject.submissions.push(submission);
                            if (counter == promise){
                                retApps.push(tempAppInfoObject);
                                counterForReceive++;
                                tryReturn(0, '');
                            }
                        }else {
                            //except
                            console.error('check task error: not user and no tempUser');
                        }
                    }
                    //没有上传,返回空值
                    if (promise == 0){
                        tryReturn(0, '');
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
    query.include('appObject');
    query.get(taskId).then(function(taskObject){
        var remainCount = taskObject.get('remainCount');
        var taskPrice = taskObject.get('excUnitPrice');
        var userObject = taskObject.get('userObject');
        var excCount = taskObject.get('excCount');
        var appObject = taskObject.get('appObject');

        userObject.increment('freezingMoney', -(taskPrice * remainCount));
        userObject.increment('totalMoney', (taskPrice * remainCount));
        taskObject.set('cancelled', true);

        if(remainCount == taskObject.get('excCount')){
            taskObject.set('close', true);
        }

        taskObject.set('excCount', excCount - remainCount);
        taskObject.set('remainCount', 0);

        userObject.save().then(function(){
            messager.unfreezeMsg('您成功撤销了（' + appObject.get('trackName') + '）的剩余任务', taskPrice * remainCount, userObject.id, 1);
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

//*************接收逻辑******************************
router.post('/accept/:entryId', function(req, res) {
    var entryId = req.params.entryId;

    var userId = util.useridInReq(req);

    var query = new AV.Query(mackTaskInfo);
    //2个用户
    query.include('doTaskUser');
    query.include('releaseTaskUser');
    query.include('releaseTaskObject');

    query.include('receiveTaskObject');
    query.include('receiveTaskObject.taskObject');
    //消息
    query.include('receiveTaskObject.appObject');

    //小马试客
    query.include('tempUserObject');

    query.get(entryId).then(function(doTaskObject) {
        doTaskObject.set("taskStatus", 'accepted');
        doTaskObject.save().then(function () {
            //野马用户
            var receUserObject = doTaskObject.get('doTaskUser');
            var senderUserObject = doTaskObject.get('releaseTaskUser');

            //小马试客用户
            var tempUserObject = doTaskObject.get('tempUserObject');

            //接受的任务
            var receiveTaskObject = doTaskObject.get('receiveTaskObject');

            var appObject = receiveTaskObject.get('appObject');
            //消息产生所需数据
            var trackName = appObject.get('trackName');

            //发布任务Object
            var task = doTaskObject.get('releaseTaskObject');
            if(task == undefined){
                //兼容s
                task = receiveTaskObject.get('taskObject');
            }
            var rateUnitPrice = task.get('rateUnitPrice');
            var tempUserPrice = task.get('tempUserPrice');
            var excUnitPrice = task.get('excUnitPrice');

            if(receUserObject != undefined || tempUserObject != undefined){
                var needSaveUserObject;

                var userName;
                if(receUserObject != undefined){
                    needSaveUserObject = receUserObject;
                    userName = receUserObject.get('username');

                    //user new task status
                    if(receUserObject.get('registerBonus') == 'register_upload_task'){
                        receUserObject.set('registerBonus', 'register_accept_task');
                    }
                    // 接收任务后 把钱打给用户记录流水
                    receUserObject.increment('totalMoney', rateUnitPrice);
                    //Y币流水
                    messager.earnMsg('您提交的任务(' + trackName + ')被审核通过', rateUnitPrice, receUserObject.id, receUserObject);

                    //邀请任务
                    var inviteUserId = receUserObject.get('inviteUserId');
                    if(inviteUserId != undefined && inviteUserId.length > 0 && inviteUserId != 'invite_done'){
                        var inviteUserObject = new AV.User();
                        inviteUserObject.id = receUserObject.get('inviteUserId');
                        inviteUserObject.increment('inviteSucceedCount', 1);

                        receUserObject.set('inviteUserId', 'invite_done');

                        AV.Object.saveAll([inviteUserObject, receUserObject]).then(function(){
                            console.log('invite user do task succeed');
                        }, function(error){
                            console.error('---- accept task: invite user do task succeed, bounds failed', + error.message);
                        });
                    }
                }else if(tempUserObject != undefined) {
                    needSaveUserObject = tempUserObject;
                    userName = tempUserObject.get('userCodeId');

                    var isToday = true;
                    var myDate = new Date();
                    var month = (myDate.getMonth() + 1).toString();
                    var day = myDate.getDate().toString();
                    var yearStr = myDate.getFullYear().toString();
                    var todayStr = yearStr + '-' + month + '-' + day;
                    var todayMoneyDate = tempUserObject.get('todayMoneyDate');
                    if (todayMoneyDate != todayStr) {
                        //非当天赚到的钱
                        isToday = false;
                    }

                    var tempUserGetRMB = 0;
                    if (tempUserPrice > 0) {
                        tempUserGetRMB = tempUserPrice;
                    } else {
                        tempUserGetRMB = (rateUnitPrice / 10) * YCoinToRMBRate;
                    }

                    //增加用户的钱(总额,可用,今日)
                    tempUserObject.increment('totalMoney', tempUserGetRMB);
                    tempUserObject.increment('currentMoney', tempUserGetRMB);
                    if (isToday == true) {
                        tempUserObject.increment('todayMoney', tempUserGetRMB);
                    } else {
                        //更新日期到最新
                        tempUserObject.set('todayMoneyDate', todayStr);
                        tempUserObject.set('todayMoney', tempUserGetRMB);
                    }

                    //TODO:师徒系统
                    var masterCode = tempUserObject.get('inviteCode');
                    if (masterCode != undefined && masterCode.length > 0) {
                        var tempUserQuery = new AV.Query(tempUserSQL);
                        tempUserQuery.equalTo('userCodeId', masterCode);
                        tempUserQuery.find().then(function (datas) {

                            if (datas.length == 1) {

                                var masterUserObject = datas[0];
                                var isToday = true;
                                var masterRewards = tempUserGetRMB * masterRMBRate;

                                var todayMoneyDate = masterUserObject.get('todayMoneyDate');
                                if (todayMoneyDate != todayStr) {
                                    //非当天赚到的钱
                                    isToday = false;
                                }

                                //增加用户的钱(总额,可用,今日)
                                masterUserObject.increment('totalMoney', masterRewards);
                                masterUserObject.increment('currentMoney', masterRewards);
                                masterUserObject.increment('apprenticeMoney', masterRewards);
                                if (isToday == true) {
                                    masterUserObject.increment('todayMoney', masterRewards);
                                } else {
                                    //更新日期到最新
                                    masterUserObject.set('todayMoneyDate', todayStr);
                                    masterUserObject.set('todayMoney', masterRewards);
                                }

                                masterUserObject.save().then(function () {

                                }, function (error) {

                                });

                                //TODO RMB Logger
                            }
                        });

                        //TODO RMB Logger
                    }
                }

                // 发布任务的人冻结钱变少
                senderUserObject.increment('freezingMoney', -excUnitPrice);
                messager.payMsg('您接受了(' + userName + ')提交的任务(' + trackName + ')结果', excUnitPrice, senderUserObject.id, senderUserObject);

                //保存2份流水
                needSaveUserObject.save().then(function(){
                    senderUserObject.save().then(function(){
                        res.json({'errorMsg':'', 'errorId': 0});
                    }, function (error) {
                        res.json({'errorMsg':error.message, 'errorId': error.code});
                    });
                }, function (error) {
                    res.json({'errorMsg': error.message, 'errorId': error.code});
                });

                //任务系统
                //每日任务(5:30前审核完所有的任务)
                var myDate = new Date();
                var taskDate = doTaskObject.createdAt;
                //需要当天的任务才可以
                if(myDate.getDay() == taskDate.getDay()){
                    if(myDate.getHours() < 17 || (myDate.getHours() == 17 && myDate.getMinutes() < 31)){
                        util.dayTaskIncrement(userId, 'checkTaskY', 1);
                    }
                }
            }else {
                console.error('accept task error: not user and no tempUser');
            }

        }, function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

//*************拒绝逻辑******************************

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
            res.json({'errorMsg':'', 'errorId': 0});
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

// banner
router.get('/banner', function(req, res){
    var query = new AV.Query('bannerObject');
    query.equalTo('close', true);
    query.equalTo('bannerType', 'taskCheck');
    query.find().then(function(bannerObject){
        var bannerList = Array();
        for (var i = 0; i < bannerObject.length; i++){
            var bannerUrl = bannerObject[i].get('bannerURL');
            bannerList.push(bannerUrl)
        }
        res.json({'bannerUrl': bannerList, 'errorId': 0, 'errorMsg':''})
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

module.exports = router;