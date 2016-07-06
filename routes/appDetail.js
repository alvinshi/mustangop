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

    query.limit(100);
    query.notEqualTo('excHistoryAdd', 'excHistoryadd');
    query.include('myAppObject');
    query.include('hisAppObject');
    query.addDescending('excDateStr');
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
                res.json({'errorId':0, 'errorMsg':''});
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
                    res.json({'errorId':0, 'errorMsg':''});
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

module.exports = router;

