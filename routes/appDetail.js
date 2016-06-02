/**
 * Created by cailong on 16/5/31.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var File = AV.Object.extend('_File');

router.get('/:appid', function(req, res, next) {
    res.render('appDetail')
});

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
                    var appObject = hisappObject.id;
                    var artworkUrl100 = hisappObject.get('artworkUrl100');
                    var trackName = hisappObject.get('trackName');
                    var sellerName = hisappObject.get('sellerName');
                    var appleKind = hisappObject.get('appleKind');
                    var appleId = hisappObject.get('appleId');
                    var formattedPrice = hisappObject.get('formattedPrice');
                    var latestReleaseDate = hisappObject.get('latestReleaseDate');
                    var myAppVersion = hisappObject.get('version')

                }
            }
            res.json({'artworkUrl100':artworkUrl100, 'trackName':trackName, 'sellerName':sellerName, 'appleId':appleId, 'latestReleaseDate':latestReleaseDate});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    })
});

// 获取我的记录
router.get('/:appleId/', function(req, res, next) {
    var userId = util.useridInReq(req);

    var appId = parseInt(req.params.appleId);

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    if (appId != undefined){
        var query_ex = new AV.Query(IOSAppExcLogger);
        query_ex.equalTo('myAppId', appId);
        query = AV.Query.and(query, query_ex);
    }

    query.limit(20);

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

                appHisObject.totalExcCount = appExcHisObject.get('totalExcCount');
                appHisObject.excKinds = appExcHisObject.get('excKinds');

                retApps.push(appHisObject);

            }
            res.json({'myExcAllApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    });
});


router.post('/:appleId', function(req, res, next){
    var userId = util.useridInReq(req);
    var myAppId = req.params.appleId;

    var hisAppId = req.body.hisAppId;
    var hisAppVersion = req.body.hisAppVersion;

    var totalExcCount = req.body.totalExcCount;
    var excKinds = req.body.excKinds;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('myAppId', myAppId);
    query.equalTo('hisAppId', hisAppId);
    query.equalTo('hisAppVersion', hisAppVersion);

    query.find({
        success: function(results) {
            if (results.length > 0){
                var IOSAppExcLogger = new IOSAppExcLogger();
                IOSAppExcLogger.set('totalExcCount', totalExcCount);
                IOSAppExcLogger.set('excKinds', excKinds);
                IOSAppExcLogger.save().then(function(){
                    //成功
                }),function(error){
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                }
            }

        }
    });
});

module.exports = router;

