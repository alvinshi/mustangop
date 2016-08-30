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
var IOSAppInfoSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinderSql = AV.Object.extend('IOSAppBinder');
var IOSAppExcLoggerSql = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObjectSql = AV.Object.extend('releaseTaskObject'); // 发布任务库
var receiveTaskObjectSql = AV.Object.extend('receiveTaskObject'); // 领取任务库
var checkInsObjectSql = AV.Object.extend('checkInsObject');

router.get('/', function(req, res) {
    res.render('homePage');
});

// banner
router.get('/banner', function(req, res){
    var query = new AV.Query('bannerObject');
    query.equalTo('close', true);
    query.equalTo('bannerType', 'doTask');
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
            res.json({'isCheckIns': 1, 'todayYB': giftYB, 'tomorrowYB': giftYB + 1})
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
                res.json({'isCheckIns': 0, 'todayYB': todayGiftYb, 'tomorrowYB': tomorrowGiftYb})
            }
            else if (checkTime == yesterdayDateStr){
                res.json({'isCheckIns': 1, 'todayYB': todayGiftYb, 'tomorrowYB': tomorrowGiftYb})
            }
            else {
                res.json({'isCheckIns': 1, 'todayYB': giftYB, 'tomorrowYB': giftYB + 1})
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
                    res.json({'errorId': 0, 'errorMsg': '签到成功'})
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
    query.find().then(function(relObjects){
        var retApps = Array();
        for (var i = 0; i < relObjects.length; i++){
            // 任务详情
            var releaseObject = Object();
            releaseObject.taskType = relObjects[i].get('taskType');
            releaseObject.excCount = relObjects[i].get('excCount');
            releaseObject.remainCount = relObjects[i].get('remainCount');
            releaseObject.taskObjectId = relObjects[i].id;

            // app详情
            var userRelApp = relObjects[i].get('appObject');
            releaseObject.artworkUrl100 = userRelApp.get('artworkUrl100');
            releaseObject.trackName = userRelApp.get('trackName');
            retApps.push(releaseObject);
        }
        res.json({'myReleaseTaskInfo':retApps})
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});
module.exports = router;