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

router.get('/:appid', function(req, res, next) {
    res.render('appDetail')
});

router.get('baseinfo/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var appleid = req.params.appid;

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
                if (appleId == appleid){
                    var appContent = new Object();
                    appContent.appObject = hisappObject.id;
                    appContent.artworkUrl100 = hisappObject.get('artworkUrl100');
                    appContent.trackName = hisappObject.get('trackName');
                    appContent.sellerName = hisappObject.get('sellerName');
                    appContent.appleKind = hisappObject.get('appleKind');
                    appContent.appleId = hisappObject.get('appleId');
                    appContent.formattedPrice = hisappObject.get('formattedPrice');
                    appContent.latestReleaseDate = hisappObject.get('latestReleaseDate');
                    appContent.myAppVersion = hisappObject.get('version')

                }
            }
            res.json({'AppDetail':appContent});
        }
    })
});

module.exports = router;

