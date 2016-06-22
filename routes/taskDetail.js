/**
 * Created by cailong on 16/6/8.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

router.get('/:appleId', function(req, res){
    res.render('taskDetail')
});

router.get('/detail/:appleId', function(req, res){
    var userId = util.useridInReq(req);
    var appleid = parseInt(req.params.appleId);

    var query = new AV.Query(IOSAppExcLogger);

    query.equalTo('hisAppId', appleid);
    query.equalTo('userId', userId);
    query.include('myAppObject');
    query.include('hisAppObject');
    query.find().then(function(results){
        var retObject = Object();
        for (var i = 0; i< results.length; i++){
            var hisappObject = results[i].get('hisAppObject');
            var myappObject = results[i].get('myAppObject');
            var hisappid = results[i].get('hisAppId');
            if (hisappid == appleid){
                retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
                retObject.trackName = hisappObject.get('trackName');
                retObject.sellerName = hisappObject.get('sellerName');
                retObject.appleKind = hisappObject.get('appleKind');
                retObject.appleId = hisappObject.get('appleId');
                retObject.formattedPrice = hisappObject.get('formattedPrice');
                retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
                retObject.version = hisappObject.get('version');

                retObject.totalExcCount = results[i].get('totalExcCount');
                retObject.requirementImg = results[i].get('requirementImg');
                retObject.excKinds = results[i].get('excKinds');
                retObject.taskObjectId = results[i].id;

                retObject.myAppartworkUrl100 = myappObject.get('artworkUrl100');
                retObject.myAppName = myappObject.get('trackName');

                if (retObject.excKinds == 1){
                    retObject.excKinds = '评论'
                }else
                    retObject.excKinds = '下载';

                query.get(retObject.taskObjectId).then(function(taskObject){
                    var relation = taskObject.relation('mackTask');
                    var task_query = relation.query();
                    task_query.find().then(function(result){
                        var mackTaskList = new Array();
                        var mackImgList = new Array();
                        for (var e = 0; e < result.length; e++){
                            var mackTaskObject = Object();
                            mackTaskObject.uploadName = result[e].get('uploadName');
                            mackTaskList.push(mackTaskObject);
                            var taskImages = result[e].get('requirementImgs');
                            for (var w = 0; w < taskImages.length; w++){
                                var images = Object();
                                images.taskImage = taskImages[w];
                                mackImgList.push(images);
                            }
                        }
                        res.json({'oneAppInfo':retObject, 'macTask':mackTaskList, 'imgInfo':mackImgList})
                    })
                })
            }
        }

    }),function(error){
        res.json({'errorId':error.code, 'errorMsg':error.message})
    }
});



module.exports = router;