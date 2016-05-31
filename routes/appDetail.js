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

router.get('/', function(req, res, next) {
    res.render('appDetail')
});

router.get('app/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var appid = req.params.appid;

    var user = new AV.User();
    user.id = userId;

    var query =new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.find({
        success:function(results){
            var retApps = new Array();
            var hisappObject = results.get('appObject');
            var appleId = hisappObject.get('appleId');
            if (appleId == appid){
                var appContent = new Object();
                appContent.artworkUrl100 = hisappObject.get('artworkUrl100');
                appContent.trackName = hisappObject.get('trackName');
                appContent.sellerName = hisappObject.get('sellerName');
                appContent.appleKind = hisappObject.get('appleKind');
                appContent.appleId = hisappObject.get('appleId');
                appContent.formattedPrice = hisappObject.get('formattedPrice');
                appContent.latestReleaseDate = hisappObject.get('latestReleaseDate');

                retApps.push(appContent)
            }
            res.json({'mytieAPP':retApps});
        }
    })
    
});

