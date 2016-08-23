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
    if(encodeUserId == undefined){
        return encodeUserId;
    }else {
        return Base64.decode(encodeUserId);
    }
};

exports.decodeUserId = function(encodeUserId){
    if(encodeUserId == undefined){
        return undefined;
    }
    return Base64.decode(encodeUserId);
};

exports.encodeStr = function(encodeStr){
    if(encodeStr == undefined){
        return undefined;
    }
    return Base64.encode(encodeStr);
};

exports.postFile = function (req, res) {

    if (req.busboy) {
        var base64dataList = Array();
        var pubFileNameList = Array();
        var pubMimeTypeList = Array();
        var promiseIndex = 0;

        req.busboy.on('file', function (fieldName, file, fileName, encoding, mimeType) {
            var buffer = '';
            file.setEncoding('base64');
            file.on('data', function(data) {
                buffer += data;
            }).on('end', function() {
                pubFileNameList.push(fileName);
                pubMimeTypeList.push(mimeType);
                base64dataList.push(buffer);
            });
        }).on('finish', function() {

            var totalData = base64dataList.length;
            var fileUrlList = Array();
            //var promiseIndex = 0;

            for (var i = 0; i < base64dataList.length; i++){
                (function (index){
                    console.log('------ upload img ------ ' + pubFileNameList[index]);
                    try{
                        var f = new AV.File(pubFileNameList[index], {
                            // 仅上传第一个文件（多个文件循环创建）
                            base64: base64dataList[index]
                        });
                        console.log('------ upload img ------ avfile succeed');
                        f.save().then(function(fileObj) {
                            fileUrlList.push(fileObj.url());
                            promiseIndex++;
                            console.log('------ upload img ------ save succeed');
                            if (promiseIndex == totalData){
                                res.json({'fileUrlList':fileUrlList, 'totalCount':base64dataList.length});
                            }
                        }, function(error){
                            console.log('------ ' + pubFileNameList[index] + ' upload img failed ------ ' + error.message);
                            promiseIndex++;
                            if(promiseIndex == totalData){
                                res.json({'errorId':error.code, 'errorMsg':error.message});
                            }
                        });
                    }catch (e){
                        promiseIndex++;
                        if(promiseIndex == totalData){
                            console.log('------ AVFile error:' + pubFileNameList[index] + ' upload img failed ------ ' + e.message);
                            res.json({'errorId':error.code, 'errorMsg':error.message});
                        }
                    }

                }(i));
            }
        });
        req.pipe(req.busboy);
    } else {
        console.log('uploadFile - busboy undefined.');
        res.status(502);
    }
};


// --------
// iTunes Api deal
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
}


exports.updateUserAppsVersion = function (req) {
    //parse appleId
    var appleIdArray = Array();
    var appleIdObject = Object();
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
};

function updateIOSAppInfo (appstoreObject, leanAppObject){
    var genres = appstoreObject['genres'];
    var appInfoObject = Object();

    //is updated
    var isUpdated = false;
    if(leanAppObject.get('version') != appstoreObject['version']){
        isUpdated = true;
    }

    leanAppObject.set('trackName', appstoreObject['trackName']);
    leanAppObject.set('artworkUrl100', appstoreObject['artworkUrl100']);
    leanAppObject.set('artworkUrl512', appstoreObject['artworkUrl512']);
    leanAppObject.set('appleId', appstoreObject['trackId']);
    leanAppObject.set('appleKind', genres[0]);
    leanAppObject.set('formattedPrice', appstoreObject['formattedPrice']);
    leanAppObject.set('latestReleaseDate', appstoreObject['currentVersionReleaseDate']);
    leanAppObject.set('sellerName', appstoreObject['sellerName']);
    leanAppObject.set('version', appstoreObject['version']);
    leanAppObject.set('excUniqueCode', appstoreObject['trackId'] + appstoreObject['version']);

    appInfoObject.trackName = appstoreObject['trackName'];
    appInfoObject.artworkUrl100 = appstoreObject['artworkUrl100'];
    appInfoObject.artworkUrl512 = appstoreObject['artworkUrl512'];
    appInfoObject.appleId = appstoreObject['trackId'];
    appInfoObject.appleKind = genres[0];
    appInfoObject.formattedPrice = appstoreObject['formattedPrice'];
    appInfoObject.latestReleaseDate = appstoreObject['currentVersionReleaseDate'];
    appInfoObject.excUniqueCode = appstoreObject['trackId'] + appstoreObject['version'];
    appInfoObject.sellerName = appstoreObject['sellerName'];
    appInfoObject.version = appstoreObject['version'];
    appInfoObject.appObjectId = leanAppObject.id;
    appInfoObject.isUpdated = isUpdated;

    appInfoObject.createdAt = leanAppObject.createdAt;
    return appInfoObject;
}


//tools for leancloud
exports.leanObjectListIdList = function(leanObjectList){
    var idList = Array();

    for(var i = 0; i < leanObjectList.length; i++){
        var leanObject = leanObjectList[i];
        if(leanObject != undefined){
            idList.push(leanObject.id);
        }
    }
    return idList;
};

exports.addLeanObject = function(leanObject, leanObjectList){
    for (var i = 0; i < leanObjectList.length; i++){
        var temLeanObject = leanObjectList[i];
        if(temLeanObject.id == leanObject.id){
            return;
        }
    }
    leanObjectList.push(leanObject);
};

exports.updateIOSAppInfo = updateIOSAppInfo;
