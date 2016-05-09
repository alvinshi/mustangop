/**
 * Created by wujiangwei on 16/5/8.
 */
'use strict';
var express = require('express');
var router = express.Router();
var AV = require('leanengine');
var https = require('https');


/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('api home support by wujiangwei')
});


//iTunes Store Api
router.get('/itunes/search/:searchkey', function(req, res, next) {

    //https://itunes.apple.com/search?term=美丽约&country=cn&entity=software
    var searchUrl = 'https://itunes.apple.com/search?term=' + req.params.searchkey +'&country=cn&entity=software'


    https.get(searchUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalLen = 0;
        var totalData = ''

        if (httpRes.statusCode != 200){
            console.log("Got error: " + httpRes.statusMessage);
            res.json({'appResults':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString()

                var dataObject = eval("(" + dataStr + ")")

                var appResults = Array();

                for (var i = 0; i < dataObject.results.length; i++){
                    var appInfo = dataObject.results[i];
                    var appResult = Object();
                    appResult.name = appInfo['trackCensoredName'];
                    appResult.icon = appInfo['artworkUrl100'];
                    appResult.appid = appInfo['artistId'];
                    appResult.lastReleaseDate = appInfo['currentVersionReleaseDate'];
                    appResult.seller = appInfo['sellerName'];

                    //类别 平台信息

                    appResults.push(appResult);
                }

                console.log(appResults);
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
                todos[i] = todo
                //todos[i] = results[i].get('content');
            }

            res.json({'todos':todos, 'title':'Api Todo'});
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
