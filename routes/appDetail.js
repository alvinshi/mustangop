/**
 * Created by cailong on 16/5/31.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var File = AV.Object.extend('_File');
var taskDemandObject = AV.Object.extend('taskDemandObject');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');

router.get('/:appid', function(req, res, next) {
    res.render('appDetail')
});

// 头部单个app内容获取
router.get('/baseinfo/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var appid = req.params.appid;

    var user = new AV.User();
    user.id = userId;

    var query =new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.find({
        success:function(results){
            for (var i = 0; i< results.length; i++){
                var hisappObject = results[i].get('appObject');
                var appleId = hisappObject.get('appleId');
                if (appid == appleId){
                    var retObject = Object();
                    retObject.appObjectId = hisappObject.id;
                    retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
                    retObject.trackName = hisappObject.get('trackName');
                    retObject.sellerName = hisappObject.get('sellerName');
                    retObject.appleKind = hisappObject.get('appleKind');
                    retObject.appleId = hisappObject.get('appleId');
                    retObject.formattedPrice = hisappObject.get('formattedPrice');
                    retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
                    retObject.version = hisappObject.get('version')
                }
            }
            res.json({'appBaseInfo':retObject});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    })
});

// 保存任务需求编辑内容
router.post('/taskneed/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appid;
    var task_type = req.body.taskType;
    var exc_count = parseInt(req.body.excCount);
    var screenshot_count = parseInt(req.body.screenshotCount);
    var search_Keywords = req.body.searchKeyword;
    var ranking = parseInt(req.body.ranKing);
    var score = req.body.Score;
    var title_keywords = req.body.titleKeyword;
    var comment_keywords = req.body.commentKeyword;
    var detail_rem = req.body.detailRem;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.include('taskDemand');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            var appObjectId = appObject.get('appleId');
            var taskdemand = results[i].get('taskDemand');
            if (appObjectId == myappId){
                if (taskdemand == undefined){
                    var taskObject = new taskDemandObject();
                    taskObject.set('taskType', task_type);
                    taskObject.set('excCount', exc_count);
                    taskObject.set('screenshotCount', screenshot_count);
                    taskObject.set('searchKeyword', search_Keywords);
                    taskObject.set('ranKing', ranking);
                    taskObject.set('Score', score);
                    taskObject.set('titleKeyword', title_keywords);
                    taskObject.set('commentKeyword', comment_keywords);
                    taskObject.set('detailRem', detail_rem);
                    taskObject.save().then(function(){
                        //
                    });
                    results[i].set('taskDemand', taskObject);
                    results[i].save().then(function(){

                    })
                }else {
                    taskdemand.set('taskType', task_type);
                    taskdemand.set('excCount', exc_count);
                    taskdemand.set('screenshotCount', screenshot_count);
                    taskdemand.set('searchKeyword', search_Keywords);
                    taskdemand.set('ranKing', ranking);
                    taskdemand.set('Score', score);
                    taskdemand.set('titleKeyword', title_keywords);
                    taskdemand.set('commentKeyword', comment_keywords);
                    taskdemand.set('detailRem', detail_rem);
                    taskdemand.save().then(function(){
                        //
                    });
                }
            }
        }
        res.json({'errorId':0, 'errorMsg':''});
    })
});

//获取需求编辑信息
router.get('/getNeed/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appid;

    var user = new AV.User();
    user.id = userId;
    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.include('taskDemand');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            var appObjectId = appObject.get('appleId');
            var taskdemand = results[i].get('taskDemand');
            if (taskdemand != undefined){
                if (appObjectId == myappId){
                    var retApps = Object();
                    retApps.taskType = taskdemand.get('taskType');
                    retApps.excCount = taskdemand.get('excCount');
                    retApps.screenshotCount = taskdemand.get('screenshotCount');
                    retApps.searchKeyword = taskdemand.get('searchKeyword');
                    retApps.ranKing = taskdemand.get('ranKing');

                    retApps.Score = taskdemand.get('Score');
                    retApps.titleKeyword = taskdemand.get('titleKeyword');
                    retApps.commentKeyword = taskdemand.get('commentKeyword');
                    retApps.detailRem = taskdemand.get('detailRem');
                }
            }
        }
        res.json({'appNeedInfo':retApps})
    }),function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }

})

// 获取我的交换历史
router.get('/myAppExcHistory/:appid/:version', function(req, res) {
    var userId = util.useridInReq(req);
    var appId = parseInt(req.params.appid);
    var version = req.params.version;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    var query_version = new AV.Query(IOSAppExcLogger);
    query_version.equalTo('myAppVersion', version);

    if (appId != undefined){
        var query_ex = new AV.Query(IOSAppExcLogger);
        query_ex.equalTo('myAppId', appId);
        query = AV.Query.and(query, query_ex, query_version);
    }else {
        query = AV.Query.and(query, query_version);
    }

    query.limit(500);
    query.notEqualTo('excHistoryAdd', 'excHistoryadd');
    query.include('myAppObject');
    query.include('hisAppObject');
    query.descending('createdAt');
    query.find({
        success: function(results) {

            //has blinded
            var retApps = new Array();
            //date merge by excDateStr for more group
            for (var i = 0; i < results.length; i++){
                var appHisObject = new Object();
                var appExcHisObject = results[i].get('hisAppObject');
                appHisObject.trackName = appExcHisObject.get('trackName');
                appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
                appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
                appHisObject.appleId = appExcHisObject.get('appleId');
                appHisObject.appleKind = appExcHisObject.get('appleKind');
                appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
                appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate').substr(0, 10);
                appHisObject.sellerName = appExcHisObject.get('sellerName');

                appHisObject.myAppVersion = results[i].get('myAppVersion');
                appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                appHisObject.excHisDate = results[i].get('excDateStr');

                appHisObject.appExcTaskObjectID = results[i].id;
                appHisObject.totalExcCount = results[i].get('totalExcCount');
                appHisObject.excKinds = results[i].get('excKinds');
                appHisObject.requirementImg = results[i].get('requirementImg');
                appHisObject.addTaskPer = results[i].get('addTaskPer');

                retApps.push(appHisObject);

            }
            res.json({'myExcAllApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

// 上传修改添加交换记录
router.post('/excTaskId/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var excKinds = req.body.excKinds;
    var totalExcCount = parseInt(req.body.totalExcCount);
    var requirementImg = req.body.requirementImg;
    var addTaskPer = req.body.addTaskPer;

    var query = new AV.Query(IOSAppExcLogger);
    query.get(excTaskId).then(function(taskObject){
        var oldImg = taskObject.get('requirementImg');
        if (oldImg == undefined){
            taskObject.set('excKinds', excKinds);
            taskObject.set('totalExcCount', totalExcCount);
            taskObject.set('requirementImg', requirementImg);
            taskObject.set('remainCount', totalExcCount);
            taskObject.set('addTaskPer', addTaskPer);
            taskObject.save().then(function(excObject){
                //成功
                res.json({'errorId':0, 'errorMsg':'', 'addObject' : taskObject});
            }),function(error){
                //失败
                res.json({'errorId':-1, 'errorMsg':error.message});
            };
        }else {
            var queryFile = new AV.Query(File);
            queryFile.equalTo('url', oldImg);
            queryFile.find().then(function(fileObject){
                for (var i = 0; i < fileObject.length; i++){
                    fileObject[i].destroy().then(function(){
                        //删除图片成功
                    })
                }
                taskObject.set('excKinds', excKinds);
                taskObject.set('totalExcCount', totalExcCount);
                taskObject.set('requirementImg', requirementImg);
                taskObject.set('remainCount', totalExcCount);
                taskObject.set('addTaskPer', addTaskPer);
                taskObject.save().then(function(excObject){
                    //成功
                    res.json({'errorId':0, 'errorMsg':'', 'addObject' : taskObject});
                }),function(error){
                    //失败
                    res.json({'errorId':-1, 'errorMsg':error.message});
                };
            })
        }
    });
});

 // 搜索本地添加的历史记录
router.get('/historySearch/angular/:version/:searchkey', function(req, res) {
    var userId = util.useridInReq(req);
    var search = req.params.searchkey;
    var myAppversion = req.params.version;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);
    query.equalTo('myAppVersion', myAppversion);

    var innerQuery = new AV.Query(IOSAppSql);
    innerQuery.contains('trackName', search);
    innerQuery.limit(1000);
    query.matchesQuery('hisAppObject', innerQuery);

    query.include('myAppObject');
    query.include('hisAppObject');

    query.find({
        success: function(results) {
            var retApps = new Array();

            for (var i = 0; i < results.length; i++){
                var appHisObject = new Object();
                var appExcHisObject = results[i].get('hisAppObject');
                appHisObject.trackName = appExcHisObject.get('trackName');
                appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
                appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
                appHisObject.appleId = appExcHisObject.get('appleId');
                appHisObject.appleKind = appExcHisObject.get('appleKind');
                appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
                appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate').substr(0, 10);
                appHisObject.sellerName = appExcHisObject.get('sellerName');

                appHisObject.myAppVersion = results[i].get('myAppVersion');
                appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                appHisObject.excHisDate = results[i].get('excDateStr');

                var totalExcCount = results[i].get('totalExcCount');
                var excKinds = results[i].get('excKinds');
                var swapMode = results[i].get('excHistoryAdd');

                if (excKinds == undefined){
                    appHisObject.excKinds = ''
                }else if (excKinds == 1){
                    appHisObject.excKinds = '评论'
                }else {
                    appHisObject.excKinds = '下载';
                }

                if (totalExcCount == undefined){
                    appHisObject.totalExcCount = 0;
                }else {
                    appHisObject.totalExcCount = totalExcCount;
                }

                if (swapMode == 'excHistoryadd'){
                    appHisObject.swapMode = '手动添加'
                }else if (swapMode == 'FXS'){
                    appHisObject.swapMode = '外部交换'
                }else if (swapMode == 'intEcx'){
                    appHisObject.swapMode = '内部交换'
                }else {
                    appHisObject.swapMode = '手动添加'
                }

                retApps.push(appHisObject);

            }
            res.json({'myTotalApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });

});

var myRate = 1;
var totalmoney = 2000;

router.post('/task/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappid = req.params.appid;
    var appObjectid = req.body.appObjectId;
    var taskType = req.body.taskType;
    var excCount = parseInt(req.body.excCount);
    var excUnitPrice = parseInt(req.body.excUnitPrice);
    var screenshotCount = parseInt(req.body.screenshotCount);
    var searchKeyword = req.body.searchKeyword;
    var ranKing = parseInt(req.body.ranKing);
    var Score = req.body.Score;
    var titleKeyword = req.body.titleKeyword;
    var commentKeyword = req.body.commentKeyword;
    var detailRem = req.body.detailRem;


    var user = new AV.User();
    user.id = userId;

    var app = AV.Object.createWithoutData('IOSAppInfo', appObjectid);

    var rateunitPrice = excUnitPrice * myRate;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.include('userObject');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var userObject = results[i].get('userObject');
            var userfreezingMoney = userObject.get('freezingMoney');
        }
        if (results <= 0){
            var releasetaskObject = new releaseTaskObject();
            releasetaskObject.set('userObject', user);  //和用户表关联
            releasetaskObject.set('appObject', app);  //和app表关联
            releasetaskObject.set('taskType', taskType);  // 任务类型
            releasetaskObject.set('excCount', excCount);  // 任务条数
            releasetaskObject.set('excUnitPrice', excUnitPrice);  //任务单价
            releasetaskObject.set('screenshotCount', screenshotCount);  // 截图数
            releasetaskObject.set('searchKeyword', searchKeyword);  // 搜索关键词
            releasetaskObject.set('ranKing', ranKing);  // 排名
            releasetaskObject.set('Score', Score);  // 评分
            releasetaskObject.set('titleKeyword', titleKeyword); // 标题关键字
            releasetaskObject.set('commentKeyword', commentKeyword); // 评论关键字
            releasetaskObject.set('detailRem', detailRem);  // 备注详情
            releasetaskObject.set('remainCount', excCount); // 剩余条数
            releasetaskObject.set('myRate', myRate); // 汇率
            releasetaskObject.set('rateUnitPrice', rateunitPrice); // 汇率后价格,实际显示价格
            releasetaskObject.set('pending', 0);  // 未提交
            releasetaskObject.set('submitted', 0); // 待审
            releasetaskObject.set('rejected', 0);  // 拒绝
            releasetaskObject.set('accepted', 0);  // 接收
            releasetaskObject.set('completed', 0);  // 完成
            releasetaskObject.save().then(function() {
                // 实例已经成功保存.
                var moratoriumMon = excCount * excUnitPrice;  // 冻结的YB
                var query = new AV.Query('_User');
                query.get(userId).then(function(userInfo){
                    userInfo.set('totalMoney', totalmoney);
                    userInfo.set('freezingMoney', moratoriumMon);
                    userInfo.save().then(function(){
                        //
                    })

                })

            }, function(err) {
                // 失败了.

            });
        }else {
            // 如果有创建新的,因为同一个用户可以发布多条,但要扣除YB
            var releaseObject = new releaseTaskObject();
            releaseObject.set('userObject', user);  //和用户表关联
            releaseObject.set('appObject', app);  //和app表关联
            releaseObject.set('taskType', taskType);  // 任务类型
            releaseObject.set('excCount', excCount);  // 任务条数
            releaseObject.set('excUnitPrice', excUnitPrice);  //任务单价
            releaseObject.set('screenshotCount', screenshotCount);  // 截图数
            releaseObject.set('searchKeyword', searchKeyword);  // 搜索关键词
            releaseObject.set('ranKing', ranKing);  // 排名
            releaseObject.set('Score', Score);  // 评分
            releaseObject.set('titleKeyword', titleKeyword); // 标题关键字
            releaseObject.set('commentKeyword', commentKeyword); // 评论关键字
            releaseObject.set('detailRem', detailRem);  // 备注详情
            releaseObject.set('remainCount', excCount); // 剩余条数
            releaseObject.set('myRate', myRate); // 汇率
            releaseObject.set('rateUnitPrice', rateunitPrice); // 汇率后价格,实际显示价格
            releaseObject.set('pending', 0);  // 未提交
            releaseObject.set('submitted', 0); // 待审
            releaseObject.set('rejected', 0);  // 拒绝
            releaseObject.set('accepted', 0);  // 接收
            releaseObject.set('completed', 0);  // 完成
            releaseObject.save().then(function() {
                // 实例已经成功保存.
                var moratorium = excCount * excUnitPrice;  // 冻结的YB
                var moratoriumMon = userfreezingMoney + moratorium;  // 再次发任务冻结的YB
                var query = new AV.Query('_User');
                query.get(userId).then(function(userInfo){
                    userInfo.set('freezingMoney', moratoriumMon);
                    userInfo.save().then(function(){
                        //
                    })

                })

            }, function(err) {
                // 失败了.

            });
        }
        res.json({'errorId':0, 'errorMsg':''});
    })
});

module.exports = router;

