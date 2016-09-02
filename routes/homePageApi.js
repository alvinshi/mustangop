/**
 * Created by cailong on 16/8/29.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

// 声明
var User = AV.Object.extend('_User');
var releaseTaskObjectSql = AV.Object.extend('releaseTaskObject'); // 发布任务库
var receiveTaskObjectSql = AV.Object.extend('receiveTaskObject'); // 领取任务库
var checkInsObjectSql = AV.Object.extend('checkInsObject');
var inviteUserObjectSql = AV.Object.extend('inviteUserObject');  // 邀请好友奖励库
var everydayTaskObjectSql = AV.Object.extend('everydayTaskObject'); // 每日任务库

router.get('/', function(req, res) {
    res.render('homePage');
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


var giftYB = 1;

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
    query.first().then(function(checkInsOb){
        if (checkInsOb == undefined || checkInsOb.length <=0){
            res.json({'isCheckIns': 0, 'todayYB': giftYB, 'tomorrowYB': giftYB + 1, 'continueCheck': 0})
        }else {
            var todayGiftYb = 0;
            var tomorrowGiftYb = 0;

            var todayYb = checkInsOb.get('checkInsCount');
            if (todayYb <= 4){
                todayGiftYb = todayYb;
                tomorrowGiftYb = todayYb + 1;
            }else {
                todayGiftYb = 5;
                tomorrowGiftYb = 5;
            }

            var checkTime = checkInsOb.get('checkInsTime');
            if (checkTime == myDateStr){
                res.json({'isCheckIns': 1, 'todayYB': todayGiftYb, 'tomorrowYB': tomorrowGiftYb, 'continueCheck': todayYb})
            }
            else if (checkTime == yesterdayDateStr){
                res.json({'isCheckIns': 0, 'todayYB': todayGiftYb, 'tomorrowYB': tomorrowGiftYb, 'continueCheck': todayYb})
            }
            else {
                res.json({'isCheckIns': 0, 'todayYB': giftYB, 'tomorrowYB': giftYB + 1, 'continueCheck': 0})
            }
        }
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

});

// 点击签到接口
router.post('/checkIns', function(req, res){
    var userId = util.useridInReq(req);
    var todayYB = req.body.todayYB;

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
    query.first().then(function(checkInsObj){
        if (checkInsObj == undefined || checkInsObj.length <= 0){
            // 一次都没签到
            var checkInsObject = new checkInsObjectSql();
            checkInsObject.set('checkInsUserObject', userObject);
            checkInsObject.set('checkInsCount', 1);
            checkInsObject.set('checkInsTime', myDateStr);
            checkInsObject.set('checkPerCapita', todayYB);
            checkInsObject.save().then(function(userCheckIns){
                var userObjectT = userCheckIns.get('checkInsUserObject');
                userObjectT.increment('totalMoney', todayYB);
                userObjectT.increment('feedingMoney', todayYB);
                userObjectT.save().then(function(){
                    res.json({'errorId': 0, 'errorMsg': ''})
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                });
            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }
        else if(checkInsObj.get('checkInsTime') == yesterdayDateStr){
            // 属于连续签到
            checkInsObj.increment('checkInsCount', 1);
            checkInsObj.increment('checkPerCapita', todayYB);
            checkInsObj.set('checkInsTime', myDateStr);
            checkInsObj.save().then(function(){
                var userObjectT = checkInsObj.get('checkInsUserObject');
                userObjectT.increment('totalMoney', todayYB);
                userObjectT.increment('feedingMoney', todayYB);
                userObjectT.save().then(function(){
                    res.json({'errorId': 0, 'errorMsg': '签到成功'})
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                });
            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }
        else {
            // 有一天没有签到就从新计数
            checkInsObj.set('checkInsCount', 1);
            checkInsObj.increment('checkPerCapita', todayYB);
            checkInsObj.set('checkInsTime', myDateStr);
            checkInsObj.save().then(function(){
                var userObjectT = checkInsObj.get('checkInsUserObject');
                userObjectT.increment('totalMoney', todayYB);
                userObjectT.increment('feedingMoney', todayYB);
                userObjectT.save().then(function(){
                    res.json({'errorId': 0, 'errorMsg': '签到成功'})
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                });
            },function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }

    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
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
        if (registerBonus == undefined || registerBonus == '' || registerBonus != 'register_new'){
            noviceObject.noviceReward = 0;  // 领取了任务并上传了
            noviceObject.noviceTaskAcceptReward = 0;  // 任务审核通过
            noviceObject.canReceive = -1;  // 邀请新手注册
            noviceObject.successCanReceive = -1; // 新手完成任务
        }

        var query = new AV.Query(inviteUserObjectSql);
        query.equalTo('inviteUserObject', userObject);
        query.include('inviteUserObject');
        query.first().then(function(userInfoObject){
            if (userInfoObject == undefined || userInfoObject.length == 0){
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
            }
            else {
                var inviteUserReward = userInfoObject.get('inviteUserReward'); // 邀请用户奖励
                var guideUserRewardYB = userInfoObject.get('guideUserRewardYB'); // 引导新人奖励
                var userObjectIn = userInfoObject.get('inviteUserObject');
                var uploadHaveReceive = userInfoObject.get('noviceTaskType');

                // 新手任务
                var isnovice = userObjectIn.get('registerBonus');
                if (isnovice == 'register_upload_task' && uploadHaveReceive != 'uploadHaveReceive'){
                    noviceObject.noviceReward = 20;  // 新手领取并上传了任务
                    noviceObject.noviceTaskAcceptReward = 0; // 新手任务被审核通过
                }
                else if (isnovice == 'register_accept_task' && uploadHaveReceive != 'finishNoviceTask'){
                    noviceObject.noviceReward = -1;
                    noviceObject.noviceTaskAcceptReward = 30;
                }
                else if (isnovice == 'register_new'){
                    noviceObject.noviceReward = 0; // 0 未满足条件
                    noviceObject.noviceTaskAcceptReward = 0;
                }
                else {
                    noviceObject.noviceReward = -1; // -1 已经领取
                    noviceObject.noviceTaskAcceptReward = -1;
                }

                // 邀请注册奖励
                var inviteCount = userObjectIn.get('inviteCount');  // 邀请总人数
                var inviteYb = inviteCount * 20;
                if (inviteCount == undefined || inviteCount == 0){
                    noviceObject.canReceive = -1;
                }else if(inviteYb == inviteUserReward){
                    noviceObject.canReceive = 0;
                }
                else {
                    noviceObject.canReceive = inviteYb - inviteUserReward
                }

                // 引导新手奖励
                var inviteUserSuccessCount = userObjectIn.get('inviteSucceedCount');
                var inviteUserYb = inviteUserSuccessCount * 30;
                if (inviteUserSuccessCount == undefined || inviteUserSuccessCount == 0){
                    noviceObject.successCanReceive = -1;
                }else if(inviteUserYb == guideUserRewardYB){
                    noviceObject.successCanReceive = 0;
                }
                else {
                    noviceObject.successCanReceive = inviteUserYb - guideUserRewardYB
                }
                res.json({'noviceTaskObject': noviceObject})
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
                    increaseYB += 20
                }
                else if (actionId == 'finishNoviceTask'){
                    inviteUserObject.set('noviceTaskType', 'finishNoviceTask');
                    inviteUserObject.set('totalReceiveMoney', 30);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += 30
                }
                else if (actionId == 'inviteUserReward'){
                    inviteUserObject.set('inviteUserReward', inviteUserCount * 20);
                    inviteUserObject.set('totalReceiveMoney', inviteUserCount * 20);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += inviteUserCount * 20
                }
                else {
                    inviteUserObject.set('guideUserRewardYB', inviteUserSucceedCount * 30);
                    inviteUserObject.set('totalReceiveMoney', inviteUserSucceedCount * 30);
                    inviteUserObject.set('inviteUserObject', userObject);
                    increaseYB += inviteUserSucceedCount * 30
                }

                inviteUserObject.save().then(function(){
                    userObject.increment('totalMoney', increaseYB);
                    userObject.increment('feedingMoney', increaseYB);
                    userObject.save().then(function(){
                        res.json({'errorId': 0, 'errorMsg': '已经领完'})
                    },function(error){
                        res.json({'errorMsg':error.message, 'errorId': error.code});
                    })
                },function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                })

            }else {
                var inviterReward = receiveObject.get('inviteUserReward');
                var guideRewardYB = receiveObject.get('guideUserRewardYB');
                var increaseUserYB = 0;
                if (actionId == 'uploadHaveReceive'){
                    receiveObject.set('noviceTaskType', 'uploadHaveReceive');
                    increaseUserYB += 20
                }
                else if (actionId == 'finishNoviceTask'){
                    receiveObject.set('noviceTaskType', 'finishNoviceTask');
                    increaseUserYB += 30
                }
                else if (actionId == 'inviteUserReward'){
                    receiveObject.increment('inviteUserReward', inviteUserCount * 20 - inviterReward);
                    receiveObject.increment('totalReceiveMoney', inviteUserCount * 20 - inviterReward);
                    increaseUserYB += inviteUserCount * 20 - inviterReward
                }
                else {
                    receiveObject.increment('guideUserRewardYB', inviteUserSucceedCount * 30 - guideRewardYB);
                    receiveObject.increment('totalReceiveMoney', inviteUserSucceedCount * 30 - guideRewardYB);
                    increaseUserYB += inviteUserSucceedCount * 30 - guideRewardYB
                }
                receiveObject.save().then(function(){
                    userObject.increment('totalMoney', increaseUserYB);
                    userObject.increment('feedingMoney', increaseUserYB);
                    userObject.save().then(function(){
                        res.json({'errorId': 0, 'errorMsg': '已经领完'})
                    },function(error){
                        res.json({'errorMsg':error.message, 'errorId': error.code});
                    })
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