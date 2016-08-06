/**
 * Created by wujiangwei on 16/5/8.
 */
'use strict';
var express = require('express');
var router = express.Router();
var AV = require('leanengine');
var https = require('https');
var util = require('./util');

var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('api home support by wujiangwei')
});


//iTunes Store Api
router.get('/itunes/search/:searchkey', function(req, res, next) {

    //https://itunes.apple.com/search?term=美丽约&country=cn&entity=software
    var searchUrl = 'https://itunes.apple.com/search?term=' + req.params.searchkey +'&limit=120&country=cn&entity=software&media=software';
    searchUrl = encodeURI(searchUrl);

    https.get(searchUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalData = '';

        if (httpRes.statusCode != 200){
            console.log("Got error: " + httpRes.statusMessage);
            res.json({'appResults':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage, 'errorId':-2})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString();
                try{
                    var dataObject = eval("(" + dataStr + ")");
                    var appResults = Array();

                    for (var i = 0; i < dataObject.results.length; i++){
                        var appleObject = dataObject.results[i];

                        var appResult = Object();

                        appResult.trackName = appleObject['trackName'];
                        appResult.artworkUrl512 = appleObject['artworkUrl512'];
                        appResult.artworkUrl100 = appleObject['artworkUrl100'];
                        appResult.appleId = appleObject['trackId'];
                        appResult.latestReleaseDate = appleObject['currentVersionReleaseDate'];
                        appResult.sellerName = appleObject['sellerName'];
                        appResult.version = appleObject['version'];
                        appResult.appleKind = appleObject['genres'][0];
                        appResult.formattedPrice = appleObject['formattedPrice'];

                        //类别 平台信息

                        appResults.push(appResult);
                    }

                    res.json({'appResults':appResults, 'errorMsg':'', 'errorId':0});
                }catch (e){
                    res.json({'appResults':[], 'errorMsg': e.message, 'errorId':-100});
                }

            })
        }

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        res.json({'appResults':[], 'errorMsg' : e.message, 'errorId' : -1})
    });
});

module.exports = router;
