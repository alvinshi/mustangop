/**
 * Created by cailong on 16/8/29.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');
var messager = require('../utils/messager');

// 声明
var User = AV.Object.extend('_User');
var releaseTaskObjectSql = AV.Object.extend('releaseTaskObject'); // 发布任务库
var checkInsObjectSql = AV.Object.extend('checkInsObject');
var inviteUserObjectSql = AV.Object.extend('inviteUserObject');  // 邀请好友奖励库

var everydayTaskObjectSql = AV.Object.extend('everydayTaskObject'); // 每日任务库

var maxCheckIn = 10;

router.get('/', function(req, res) {
    res.render('homePageSx');
});

// banner
router.get('/banner', function(req, res){
    var query = new AV.Query('bannerObject');
    query.equalTo('close', true);
    query.equalTo('bannerType', 'homePage');
    query.find().then(function(bannerObject){
        var bannerList = Array();
        for (var i = 0; i < bannerObject.length; i++){
            var bannerObjects = Object();
            bannerObjects.bannerUrl = bannerObject[i].get('bannerURL');
            bannerObjects.clickBanner = bannerObject[i].get('clickBanner');
            bannerList.push(bannerObjects)
        }
        res.json({'bannerUrl': bannerList, 'errorId': 0, 'errorMsg':''})
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});


// 签到
router.get('/ischeckins', function(req, res){
    var userId = util.useridInReq(req);

    var userObject = new User();
    userObject.id = userId;

    // 今日日期
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    // 昨天日期
    var nowTimestamp = new Date().getTime();
    var yesterdayTimestamp = nowTimestamp - 1000*60*60*24;
    var yesterdayDate = new Date(yesterdayTimestamp);
    var yesterdayDateStr = yesterdayDate.getFullYear() + '-' + (parseInt(yesterdayDate.getMonth())+1) + '-' + yesterdayDate.getDate();

    var query = new AV.Query(checkInsObjectSql);
    query.equalTo('checkInsUserObject', userObject);
    query.descending('createdAt');
    query.first().then(function(checkInsOb){
        if (checkInsOb == undefined || checkInsOb.length <=0){
            res.json({'errorId':0, 'isCheckIns': 0, 'todayYB': 1, 'continueCheck': 2})
        }else {
            var todayGiftYb = 0;
            var tomorrowGiftYb = 0;

            var checkInYCoin = checkInsOb.get('checkInsCount');
            var latestDays = checkInsOb.get('latestDays');
            if (checkInYCoin < maxCheckIn){
                todayGiftYb = checkInYCoin;
                tomorrowGiftYb = checkInYCoin + 1;
            }else {
                todayGiftYb = maxCheckIn;
                tomorrowGiftYb = maxCheckIn;
            }

            var checkTime = checkInsOb.get('checkInsTime');
            if (checkTime == myDateStr){
                //已经签到
                res.json({'errorId':0, 'isCheckIns': 1, 'todayYB': todayGiftYb, 'latestDays':latestDays, 'continueCheck': tomorrowGiftYb})
            }
            else if (checkTime == yesterdayDateStr){
                //连续签到
                res.json({'errorId':0, 'isCheckIns': 0, 'todayYB': tomorrowGiftYb, 'latestDays':latestDays, 'continueCheck': (tomorrowGiftYb+1>maxCheckIn) ? maxCheckIn : tomorrowGiftYb+1})
            }
            else {
                res.json({'errorId':0, 'isCheckIns': 0, 'todayYB': 1, 'latestDays':latestDays,  'continueCheck': 2})
            }
        }
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

});

// 每日任务
router.get('/dayTask', function(req, res){
    var userId = util.useridInReq(req);
    var userObject = new User();
    userObject.id = userId;

    // 今日日期
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(everydayTaskObjectSql);
    query.equalTo('userObject', userObject);
    query.equalTo('taskDateStr', myDateStr);
    query.include('userObject');
    query.descending('createdAt');
    query.first().then(function(dayTaskObject){
        if (dayTaskObject == undefined){
            // 无今日任务
            res.json({'errorId': -1, 'errorMsg': 'none'});
        }
        else {
            // 有了今日任务
            res.json({
                'releaseTaskY':dayTaskObject.get('releaseTaskY'),
                'doTaskY':dayTaskObject.get('doTaskY'),
                'checkTaskY':dayTaskObject.get('checkTaskY'),
                'errorId': 0, 'errorMsg': ''});
        }

    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

router.post('/dayTask', function(req, res){
    var userId = util.useridInReq(req);
    var userObject = new User();
    userObject.id = userId;

    var actionId = req.body.actionId;

    // 今日日期
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(everydayTaskObjectSql);
    query.equalTo('userObject', userObject);
    query.equalTo('taskDateStr', myDateStr);
    query.include('userObject');
    query.descending('createdAt');
    query.first().then(function(dayTaskObject){
        if (dayTaskObject == undefined){
            // 无今日任务
            res.json({'errorId': -1, 'errorMsg': '未满足条件'});
        }
        else {
            // 有了今日任务
            userObject.increment('totalMoney', dayTaskObject.get(actionId));
            userObject.increment('feedingMoney', dayTaskObject.get(actionId));

            var bonusYCoin = dayTaskObject.get(actionId);
            dayTaskObject.set(actionId, 0);

            AV.Object.saveAll([userObject, dayTaskObject]).then(function(){

                //Y币流水
                if(actionId == 'releaseTaskY'){
                    messager.bonusMsg('每日任务(' + myDateStr + '),10点前发布任务', bonusYCoin, userId);
                }else if(actionId == 'doTaskY'){
                    messager.bonusMsg('每日任务(' + myDateStr + '),4:30前完成任务', bonusYCoin, userId);
                }else if(actionId == 'checkTaskY'){
                    messager.bonusMsg('每日任务(' + myDateStr + '),5:30前审核任务', bonusYCoin, userId);
                }

                //succeed
                res.json({'errorId': 0, 'releaseTaskY':dayTaskObject.get('releaseTaskY'),
                    'doTaskY':dayTaskObject.get('doTaskY'),
                    'checkTaskY':dayTaskObject.get('checkTaskY')});
            }, function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }

    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 点击签到接口
router.post('/checkIns', function(req, res){
    var userId = util.useridInReq(req);

    // 今日日期
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    // 昨天日期
    var nowTimestamp = new Date().getTime();
    var yesterdayTimestamp = nowTimestamp - 1000*60*60*24;
    var yesterdayDate = new Date(yesterdayTimestamp);
    var yesterdayDateStr = yesterdayDate.getFullYear() + '-' + (parseInt(yesterdayDate.getMonth())+1) + '-' + yesterdayDate.getDate();

    var userObject = new User();
    userObject.id = userId;

    var query = new AV.Query(checkInsObjectSql);
    query.equalTo('checkInsUserObject', userObject);
    query.include('checkInsUserObject');
    query.descending('createdAt');
    query.first().then(function(checkInsObj){
        if (checkInsObj == undefined || checkInsObj.get('checkInsTime') != yesterdayDateStr){
            // 一次都没签到,断了签到
            var checkInsObject = new checkInsObjectSql();
            checkInsObject.set('checkInsUserObject', userObject);
            checkInsObject.set('checkInsCount', 1);
            checkInsObject.set('latestDays', 1);
            checkInsObject.set('checkInsTime', myDateStr);

            userObject.increment('totalMoney', 1);
            userObject.increment('feedingMoney', 1);

            AV.Object.saveAll([checkInsObject, userObject]).then(function(){

                messager.bonusMsg(myDateStr + '日签到', 1, userId);
                res.json({'errorId': 0, 'errorMsg': ''})
            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }
        else if(checkInsObj.get('checkInsTime') == yesterdayDateStr){
            // 属于连续签到
            var lastCheckInYCoin = checkInsObj.get('checkInsCount');
            if (lastCheckInYCoin < maxCheckIn){
                lastCheckInYCoin = lastCheckInYCoin + 1;
            }else {
                lastCheckInYCoin = maxCheckIn;
            }

            checkInsObj.set('checkInsCount', lastCheckInYCoin);
            checkInsObj.set('checkInsTime', myDateStr);
            checkInsObj.increment('latestDays', 1);

            userObject.increment('totalMoney', lastCheckInYCoin);
            userObject.increment('feedingMoney', lastCheckInYCoin);
            AV.Object.saveAll([checkInsObj, userObject]).then(function(){

                messager.bonusMsg(myDateStr + '日连续签到', lastCheckInYCoin, userId);
                res.json({'errorId': 0, 'errorMsg': '签到成功'})
            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }
        else {
            //
        }

    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});


// 我发布的任务
router.get('/myReleaseTask', function(req, res){
    var userId = util.useridInReq(req);

    var userObject = new User();
    userObject.id = userId;

    var query = new AV.Query(releaseTaskObjectSql);
    query.equalTo('userObject', userObject);
    query.equalTo('close', false);
    query.include('appObject');
    query.descending('createdAt');
    query.descending('remainCount');
    query.limit(5);
    query.find().then(function(relObjects){
        var retApps = Array();
        for (var i = 0; i < relObjects.length; i++){
            // 任务详情
            var releaseObject = Object();
            releaseObject.taskType = relObjects[i].get('taskType');
            releaseObject.excCount = relObjects[i].get('excCount');
            releaseObject.remainCount = relObjects[i].get('remainCount');
            var progressStr =  parseFloat(releaseObject.excCount - releaseObject.remainCount) / parseFloat(releaseObject.excCount) * 100 + '%';
            releaseObject.progressStyle = {"width":progressStr};
            releaseObject.taskObjectId = relObjects[i].id;

            // app详情
            var userRelApp = relObjects[i].get('appObject');
            releaseObject.artworkUrl100 = userRelApp.get('artworkUrl100');
            releaseObject.trackName = userRelApp.get('trackName');
            releaseObject.appleId = userRelApp.get('appleId');

            if(i != relObjects.length - 1){
                releaseObject.bottom = {"border-bottom":"1px solid #cccccc"}
            }

            retApps.push(releaseObject);
        }
        res.json({'myReleaseTaskInfo':retApps})
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

// 获取邀请好友奖励
router.get('/noviceTask', function(req, res){
    var userId = util.useridInReq(req);

    var priorityQuery = new AV.Query(User);
    priorityQuery.get(userId).then(function(userObject){
        var noviceObject = Object();
        var registerBonus = userObject.get('registerBonus');

        var inviteUserCount = userObject.get('inviteCount'); // 邀请的人数
        var inviteUserSucceedCount = userObject.get('inviteSucceedCount'); // 邀请成功做任务的人

        var query = new AV.Query(inviteUserObjectSql);
        query.equalTo('inviteUserObject', userObject);
        query.include('inviteUserObject');
        query.first().then(function(userInfoObject){

            if (userInfoObject == undefined || userInfoObject.length == 0){
                //新手任务
                if (registerBonus == 'register_upload_task'){
                    noviceObject.noviceReward = 20;
                    noviceObject.noviceTaskAcceptReward = 0;
                }
                else if (registerBonus == 'register_accept_task'){
                    noviceObject.noviceReward = -1;
                    noviceObject.noviceTaskAcceptReward = 30;
                }
                else {
                    noviceObject.noviceReward = 0;
                    noviceObject.noviceTaskAcceptReward = 0;
                }

                //邀请
                noviceObject.canReceive = inviteUserCount * 20;
                noviceObject.successCanReceive = inviteUserSucceedCount * 30;
                res.json({'noviceTaskObject': noviceObject})
            }else {
                var inviteUserReward = userInfoObject.get('inviteUserReward'); // 邀请用户奖励
                var guideUserRewardYB = userInfoObject.get('guideUserRewardYB'); // 引导新人奖励
                var uploadHaveReceive = userInfoObject.get('noviceTaskType');

                // 新手任务
                if (registerBonus == 'register_upload_task'){
                    noviceObject.noviceTaskAcceptReward = 0;
                    if(uploadHaveReceive == 'uploadHaveReceive'){
                        noviceObject.noviceReward = -1; // 新手任务被审核通过
                    }else {
                        noviceObject.noviceReward = 20;  // 新手领取并上传了任务
                    }
                }
                else if (registerBonus == 'register_accept_task'){
                    noviceObject.noviceReward = -1;
                    if(uploadHaveReceive == 'finishNoviceTask'){
                        noviceObject.noviceTaskAcceptReward = -1;
                    }else {
                        noviceObject.noviceTaskAcceptReward = 30;
                    }
                }
                else if (registerBonus == 'register_new'){
                    noviceObject.noviceReward = 0; // 0 未满足条件
                    noviceObject.noviceTaskAcceptReward = 0;
                }
                else {
                    noviceObject.noviceReward = -1; // -1 已经领取
                    noviceObject.noviceTaskAcceptReward = -1;
                }

                // 邀请注册奖励
                var inviteYb = inviteUserCount * 20;
                if (inviteUserCount == undefined || inviteUserCount == 0){
                    noviceObject.canReceive = -1;
                }else if(inviteYb == inviteUserReward){
                    noviceObject.canReceive = 0;
                }
                else {
                    noviceObject.canReceive = inviteYb - inviteUserReward;
                }

                // 引导新手奖励
                var inviteUserYb = inviteUserSucceedCount * 30;
                if (inviteUserSucceedCount == undefined || inviteUserSucceedCount == 0){
                    noviceObject.successCanReceive = -1;
                }else if(inviteUserYb == guideUserRewardYB){
                    noviceObject.successCanReceive = 0;
                }
                else {
                    noviceObject.successCanReceive = inviteUserYb - guideUserRewardYB;
                }
                res.json({'noviceTaskObject': noviceObject});
            }

        },function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        })

    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });

});

// 领取奖励post
router.post('/userReceiveAward', function(req, res){
    var userId = util.useridInReq(req);
    var actionId = req.body.actionId;

    var userQuery = new AV.Query(User);
    userQuery.get(userId).then(function(userObject){
        var inviteUserCount = userObject.get('inviteCount');
        var inviteUserSucceedCount = userObject.get('inviteSucceedCount');
        var query = new AV.Query(inviteUserObjectSql);
        query.equalTo('inviteUserObject', userObject);
        query.include('inviteUserObject');
        query.first().then(function(receiveObject){
            if (receiveObject == undefined || receiveObject.length == 0){
                var inviteUserObject = new inviteUserObjectSql();
                var increaseYB = 0;
                if (actionId == 'uploadHaveReceive'){
                    inviteUserObject.set('noviceTaskType', 'uploadHaveReceive');
                    inviteUserObject.set('totalReceiveMoney', 20);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += 20;

                    messager.bonusMsg('完成新手任务(第一步)', 20, userId);
                }
                else if (actionId == 'finishNoviceTask'){
                    inviteUserObject.set('noviceTaskType', 'finishNoviceTask');
                    inviteUserObject.set('totalReceiveMoney', 30);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += 30;

                    messager.bonusMsg('完成新手任务(第二步)', 30, userId);
                }
                else if (actionId == 'inviteUserReward'){
                    inviteUserObject.set('inviteUserReward', inviteUserCount * 20);
                    inviteUserObject.set('totalReceiveMoney', inviteUserCount * 20);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += inviteUserCount * 20;

                    messager.bonusMsg('邀请' + inviteUserCount +'名用户注册', increaseYB, userId);
                }
                else {
                    inviteUserObject.set('guideUserRewardYB', inviteUserSucceedCount * 30);
                    inviteUserObject.set('totalReceiveMoney', inviteUserSucceedCount * 30);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += inviteUserSucceedCount * 30;

                    messager.bonusMsg('引导' + inviteUserSucceedCount +'名用户完成新手任务', increaseYB, userId);
                }

                userObject.increment('totalMoney', increaseYB);
                userObject.increment('feedingMoney', increaseYB);
                AV.Object.saveAll([inviteUserObject, userObject]).then(function(){
                    res.json({'errorId': 0, 'errorMsg': '已经领完'});
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                })

            }else {
                var inviterReward = receiveObject.get('inviteUserReward');
                var guideRewardYB = receiveObject.get('guideUserRewardYB');
                var increaseUserYB = 0;
                if (actionId == 'uploadHaveReceive'){
                    receiveObject.set('noviceTaskType', 'uploadHaveReceive');
                    increaseUserYB += 20;

                    messager.bonusMsg('完成新手任务(第一步)', 20, userId);
                }
                else if (actionId == 'finishNoviceTask'){
                    receiveObject.set('noviceTaskType', 'finishNoviceTask');
                    increaseUserYB += 30;

                    messager.bonusMsg('完成新手任务(第二步)', 30, userId);
                }
                else if (actionId == 'inviteUserReward'){
                    receiveObject.increment('inviteUserReward', inviteUserCount * 20 - inviterReward);
                    receiveObject.increment('totalReceiveMoney', inviteUserCount * 20 - inviterReward);
                    increaseUserYB += inviteUserCount * 20 - inviterReward;

                    messager.bonusMsg('邀请' + increaseUserYB/20 +'名用户注册', increaseUserYB, userId);
                }
                else {
                    receiveObject.increment('guideUserRewardYB', inviteUserSucceedCount * 30 - guideRewardYB);
                    receiveObject.increment('totalReceiveMoney', inviteUserSucceedCount * 30 - guideRewardYB);
                    increaseUserYB += inviteUserSucceedCount * 30 - guideRewardYB;

                    messager.bonusMsg('引导' + increaseUserYB/30 +'名用户完成新手任务', increaseUserYB, userId);
                }

                userObject.increment('totalMoney', increaseUserYB);
                userObject.increment('feedingMoney', increaseUserYB);

                AV.Object.saveAll([receiveObject, userObject]).then(function(){
                    res.json({'errorId': 0, 'errorMsg': '已经领完'});
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                })
            }

        },function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    })
});

module.exports = router;