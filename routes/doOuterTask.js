/**
 * Created by tanghui on 16/7/20.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');

router.get('/', function(req, res) {
    res.render('doOuterTask');
});

function dealiTunesAppFailed(retApps, appObject){
    var appInfoObject = new Object();

    appInfoObject.trackName = appObject.get('trackName');
    appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
    appInfoObject.artworkUrl512 = appObject.get('artworkUrl512');
    appInfoObject.appleId = appObject.get('appleId');
    appInfoObject.appleKind = appObject.get('appleKind');
    appInfoObject.formattedPrice = appObject.get('formattedPrice');
    appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');
    appInfoObject.sellerName = appObject.get('sellerName');
    appInfoObject.version = appObject.get('version');

    retApps.push(appInfoObject);
}

router.get('/angular', function(req, res) {
    var userId = util.useridInReq(req);

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.addDescending('updatedAt')
    query.find({
        success: function(results) {


            //没有绑定应用
            if (results.length == 0){
                res.json({'myApps': undefined});
            }
            //has blinded
            var retApps = new Array();

            //check update apps

            var judgeLength = results.length;

            for (var i = 0; i < results.length; i++){
                var appObject = results[i].get('appObject');
                if (appObject == undefined){
                    judgeLength -= 1;
                    continue;
                }
                var appid = appObject.get('appleId');

                var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid +'&country=cn&entity=software';

                (function(tempAppObject){
                    https.get(appInfoUrl, function(httpRes) {

                        var totalData = '';

                        if (httpRes.statusCode != 200){
                            console.log("Add app error: " + httpRes.statusMessage);

                            //未检测到App的更新信息
                            dealiTunesAppFailed(retApps, tempAppObject);

                            if (retApps.length == judgeLength){
                                res.json({'myApps':retApps});
                            }

                        }else {
                            httpRes.on('data', function(data) {
                                totalData += data;
                            });

                            httpRes.on('end', function(){
                                var dataStr = totalData.toString();
                                var dataObject = eval("(" + dataStr + ")");

                                //appid just 1 result
                                if (dataObject.results.length == 0){
                                    dealiTunesAppFailed(retApps, tempAppObject);
                                    if (retApps.length == judgeLength){
                                        res.json({'myApps':retApps});
                                    }
                                }else {
                                    var appInfo = dataObject.results[0];
                                    var appInfoObject = util.updateIOSAppInfo(appInfo, tempAppObject);
                                    tempAppObject.save().then(function(post) {
                                        // 实例已经成功保存.
                                        retApps.push(appInfoObject);

                                        if (retApps.length == judgeLength){
                                            res.json({'myApps':retApps});
                                        }
                                    }, function(err) {
                                        // 失败了.
                                        dealiTunesAppFailed(retApps, tempAppObject);

                                        if (retApps.length == judgeLength){
                                            res.json({'myApps':retApps});
                                        }
                                    });
                                }
                            })
                        }

                    }).on('error', function(e) {
                        dealiTunesAppFailed(retApps, appObject);

                        if (retApps.length == results.length){
                            res.json({'myApps':retApps});
                        }
                    });
                })(appObject);
            }
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});


module.exports = router;