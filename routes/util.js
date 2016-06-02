/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';

var AV = require('leanengine');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppSql = AV.Object.extend('IOSAppInfo');

exports.useridInReq = function(req){
    //获取cookie的值,进行解密
    var encodeUserId = req.cookies.userIdCookie;
    return Base64.decode(encodeUserId);
};


function findAppIniTunes(res, userId){
    //not need
    var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid +'&country=cn&entity=software';

    https.get(appInfoUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalData = '';

        if (httpRes.statusCode != 200){
            console.log("Add app error: " + httpRes.statusMessage);
            res.json({'appInfo':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString();
                var dataObject = eval("(" + dataStr + ")");

                //appid just 1 result
                var appInfo = dataObject.results[0];

                var appObject = new IOSAppSql();
                var appInfoObject = util.updateIOSAppInfo(appInfo, appObject);
                appObject.save().then(function(post) {
                    // 实例已经成功保存.
                    blindAppToUser(res, userId, appObject, appInfoObject);
                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });
            })
        }

    }).on('error', function(e) {
        console.log("Got appInfo with appid error: " + e.message);
        res.json({'errorMsg':e.message, 'errorId': e.code});
    });
};


exports.updateUserAppsVersion = function (req) {
    //parse appleId
    var appleIdArray = new Array();
    var appleIdObject = new Object();
    for (var i = 0; i < dataObject.results.length; i++) {
        var appleObject = dataObject.results[i];
        appleIdArray.push(appleObject.trackId);
        appleIdObject[appleObject.trackId] = appleObject;
    }

    //query appid not in SQL
    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.containedIn('appleId', appleIdArray);
    query.find({
        success: function(results) {
            for (var j = 0; j < appleIdArray.length; j++){

                var appObject = '';

                var flag = 0;
                for (var i = 0; i < results.length; i++) {
                    if (appleIdArray[j] == results[i].get('appleId')){
                        flag = 1;
                        appObject = results[i];
                        break;
                    }
                }

                if(flag == 0){
                    console.log(appleIdArray[j] + 'not exist in SQL');
                    //appid store to app sql
                    appObject = new IOSAppSql();
                }

                if (flag == 1 && appleIdObject[appleIdArray[j]]['version'] != appObject.get('version'))
                {

                }

                var appInfoObject = util.updateIOSAppInfo(appleIdObject[appleIdArray[j]], appObject);
                appObject.save().then(function(post) {
                    // 实例已经成功保存.
                    //blindAppToUser(res, userId, appObject, appInfoObject);
                    console.log(appInfoObject.appleId + 'save to SQL succeed');
                }, function(err) {
                    // 失败了.
                    console.log(appInfoObject.appleId + 'save to SQL failed');
                });
            }
        },
        error: function(err) {
            console.log(appleId + 'error in query');
        }
    });
}

function updateIOSAppInfo (appstoreObject, leanAppObject){
    var genres = appstoreObject['genres'];
    var appInfoObject = new Object();

    leanAppObject.set('trackName', appstoreObject['trackName']);
    leanAppObject.set('artworkUrl100', appstoreObject['artworkUrl100']);
    leanAppObject.set('artworkUrl512', appstoreObject['artworkUrl512']);
    leanAppObject.set('appleId', appstoreObject['trackId']);
    leanAppObject.set('appleKind', genres[0]);
    leanAppObject.set('formattedPrice', appstoreObject['formattedPrice']);
    leanAppObject.set('latestReleaseDate', appstoreObject['currentVersionReleaseDate']);
    leanAppObject.set('sellerName', appstoreObject['sellerName']);
    leanAppObject.set('version', appstoreObject['version']);

    appInfoObject.trackName = appstoreObject['trackName'];
    appInfoObject.artworkUrl100 = appstoreObject['artworkUrl100'];
    appInfoObject.artworkUrl512 = appstoreObject['artworkUrl512'];
    appInfoObject.appleId = appstoreObject['trackId'];
    appInfoObject.appleKind = genres[0];
    appInfoObject.formattedPrice = appstoreObject['formattedPrice'];
    appInfoObject.latestReleaseDate = appstoreObject['currentVersionReleaseDate'];
    appInfoObject.sellerName = appstoreObject['sellerName'];
    appInfoObject.version = appstoreObject['version'];

    return appInfoObject;
}

exports.updateIOSAppInfo = updateIOSAppInfo;

