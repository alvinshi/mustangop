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

router.post('/:appleId', function(req, res, next){
    var userId = util.useridInReq(req);
    var myAppId = req.params.appleId;

    var hisAppId = req.body.hisAppId;
    var hisAppVersion = req.body.hisAppVersion;

    var totalExcCount = req.body.totalExcCount;
    var excKinds = req.body.excKinds;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);
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
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                }
            }

        }
    });
});

module.exports = router;

