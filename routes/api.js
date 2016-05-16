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

/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('api home support by wujiangwei')
});


//iTunes Store Api
router.get('/itunes/search/:searchkey', function(req, res, next) {

    //https://itunes.apple.com/search?term=美丽约&country=cn&entity=software
    var searchUrl = 'https://itunes.apple.com/search?term=' + req.params.searchkey +'&country=cn&entity=software&media=software'
    searchUrl = encodeURI(searchUrl)

    https.get(searchUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalLen = 0;
        var totalData = '';

        if (httpRes.statusCode != 200){
            console.log("Got error: " + httpRes.statusMessage);
            res.json({'appResults':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString()
                var dataObject = eval("(" + dataStr + ")");
                var appResults = Array();

                //paser appleId
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
                            var flag = 0;
                            for (var i = 0; i < results.length; i++) {
                                if (appleIdArray[j] == results[i].get('appleId')){
                                    flag = 1;
                                    break;
                                }
                            }

                            if(flag == 0){
                                console.log(appleIdArray[j] + 'not exist in SQL');
                                //appid store to app sql
                                var appObject = new IOSAppSql();
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
                        }
                    },
                    error: function(err) {
                        console.log(appleId + 'error in query');
                    }
                });


                for (var i = 0; i < dataObject.results.length; i++){
                    var appleObject = dataObject.results[i];
                    var appleId = appleObject.trackId;
                    var appInfo = appleObject;
                    var appResult = Object();

                    appResult.name = appInfo['trackCensoredName'];
                    appResult.icon = appInfo['artworkUrl100'];
                    appResult.appid = appInfo['trackId'];
                    appResult.lastReleaseDate = appInfo['currentVersionReleaseDate'];
                    appResult.seller = appInfo['sellerName'];
                    appResult.version = appInfo['version'];

                    //类别 平台信息

                    appResults.push(appResult);
                }

                res.json({'appResults':appResults, 'title':'Api Todo'});
            })
        }

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        res.json({'appResults':[], 'errorMsg' : e.message})
    });
});

//test code
router.get('/test/todos', function(req, res, next) {

    var Todo = AV.Object.extend('Todo');

    var query = new AV.Query(Todo);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            var todos = new Array();
            for (var i = 0; i < results.length; i++)
            {
                var todo = Object()
                todo.content = results[i].get('content');
                todos.push(todo)
                //todos[i] = results[i].get('content');
            }

            res.json({'todos1':todos, 'title':'Api Todo'});
        },
        error: function(err) {
            if (err.code === 101) {

                res.json({'title':'101 Error'});
                res.render('todos', {
                    title: 'TODO 列表',
                    todos: []
                });
            } else {
                next(err);
            }
        }
    });
});

module.exports = router;
