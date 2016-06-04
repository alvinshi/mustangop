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
                    var retObject = Object()
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

router.post('/excTaskId/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var excKinds = req.body.excKinds;
    var totalExcCount = req.body.totalExcCount;

    var newExcContent = AV.Object.createWithoutData('IOSAppExcLogger', excTaskId);
    newExcContent.set('excKinds', excKinds);
    newExcContent.set('totalExcCount', totalExcCount);
    newExcContent.save().then(function(){
        //成功
        res.json({'errorId':0, 'errorMsg':''});
    }),function(error){
        //失败
    }
});

module.exports = router;

