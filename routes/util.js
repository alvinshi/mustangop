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
    appInfoObject.appleId = appstoreObject['artistId'];
    appInfoObject.appleKind = genres[0];
    appInfoObject.formattedPrice = appstoreObject['formattedPrice'];
    appInfoObject.latestReleaseDate = appstoreObject['currentVersionReleaseDate'];
    appInfoObject.sellerName = appstoreObject['sellerName'];
    appInfoObject.version = appstoreObject['version'];

    return appInfoObject;
}

exports.updateIOSAppInfo = updateIOSAppInfo;


