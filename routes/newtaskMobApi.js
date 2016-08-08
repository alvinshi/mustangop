/**
 * Created by cailong on 16/7/21.
 */
'use strict';

var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var File = AV.Object.extend('_File');

router.get('/:userId', function(req, res) {
    res.render('newtaskMob');
});

// 内部交换
router.get('/claim/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var uploadUserName = req.cookies.uploadImgName;

    var query = new AV.Query(receiveTaskObject);
    query.include('appObject');
    query.include('taskObject');
    query.include('userObject');
    query.get(excTaskId).then(function(resultObject){
        var retObject = Object();
        var hisappObject = resultObject.get('appObject');
        var taskInfo = resultObject.get('taskObject');
        retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
        retObject.trackName = hisappObject.get('trackName');
        retObject.sellerName = hisappObject.get('sellerName');
        retObject.appleKind = hisappObject.get('appleKind');
        retObject.appleId = hisappObject.get('appleId');
        retObject.formattedPrice = hisappObject.get('formattedPrice');
        retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
        retObject.version = hisappObject.get('version');
        retObject.excKinds = taskInfo.get('taskType');

        retObject.totalExcCount = resultObject.get('receiveCount');
        retObject.taskObjectId = taskInfo.id;
        retObject.userObjectId = Base64.encode(resultObject.get('userObject').id);

        // 需求截图数据
        retObject.taskType = taskInfo.get('taskType');  //任务类型
        retObject.searchKeyword = taskInfo.get('searchKeyword');  //搜索关键词
        retObject.ranKing = taskInfo.get('ranKing'); // 排名
        retObject.Score = taskInfo.get('Score');  // 评分
        retObject.titleKeyword = taskInfo.get('titleKeyword'); // 标题关键词
        retObject.commentKeyword = taskInfo.get('commentKeyword'); // 评论关键词
        retObject.detailRem = taskInfo.get('detailRem'); // 备注详情
        retObject.screenshotCount = taskInfo.get('screenshotCount'); // 截图数

        if (uploadUserName != undefined){
            var relation = resultObject.relation('mackTask');
            var task_query = relation.query();
            task_query.equalTo('uploadName', uploadUserName);
            task_query.notEqualTo('taskStatus', 'expired');
            task_query.find().then(function(result){
                var mackTaskList = new Array();

                //remain 需要计算,并且不能取具体任务里过期的数目,过期的数目统一在 receive的 resultObject的expiredCount取
                retObject.surplusCount = resultObject.get('receiveCount') - resultObject.get('expiredCount') - result.length;

                for (var e = 0; e < result.length; e++){
                    retObject.uploadName = result[e].get('uploadName');
                    var taskImages = result[e].get('requirementImgs');
                    for (var w = 0; w < taskImages.length; w++){
                        var taskImage = taskImages[w];
                        mackTaskList.push(taskImage);
                    }
                }
                res.json({'oneAppInfo':retObject, 'macTask':mackTaskList})
            })
        }else {
            res.json({'oneAppInfo':retObject})
        }
    })
});

// 新增 做内部做任务
router.post('/add/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var requirementImgs = req.body.requirementImgs;

    var userUploadName = undefined;
    //无cookie则是新用户
    var cookieUserUploadName = req.cookies.uploadImgName;
    var userUploadName = req.body.uploadName;
    if (cookieUserUploadName != undefined && cookieUserUploadName.length > 0){
        userUploadName = cookieUserUploadName;
    }
    //不优先cookie存储
    if(userUploadName != undefined && userUploadName.length > 0) {
        userUploadName = userUploadName;
    }

    if(userUploadName == undefined || userUploadName.length == 0){
        res.json({'errorMsg':'未填写昵称(任务需要知道是谁做的哦)', 'errorId': -2});
        return;
    }

    var task_query = new AV.Query(receiveTaskObject);
    task_query.include('taskObject');
    task_query.get(excTaskId).then(function(receiveTaskObject){
            var relation = receiveTaskObject.relation('mackTask');
            var receiveCount = receiveTaskObject.get('receiveCount');
            var expiredCount = receiveTaskObject.get('expiredCount');
            var query = relation.query();
            query.notEqualTo('taskStatus', 'expired');
            query.find().then(function(results){

                var uploadDoTaskObject = undefined;

                for (var dj = 0; dj < results.length; dj++){
                    var doTaskObject = results[dj];
                    if(doTaskObject.get('uploadName') == uploadName){
                        uploadDoTaskObject = doTaskObject;
                        break;
                    }
                }

                //这边必须不包含过期条目,因为expiredCount已经包含了
                if((results.length + expiredCount) >= receiveCount && uploadDoTaskObject == undefined){
                    //任务已经做满,不能重新再上传
                    res.json({'errorMsg':'参与任务者已满,若想重新提交截图,请使用之前提交截图用户的昵称', 'uploadName':uploadName, 'errorId': -200});
                }else {
                    if(uploadDoTaskObject == undefined){
                        //new task
                        //add task imgs
                        var newTaskObject = new mackTaskInfo();
                        newTaskObject.set('uploadName', uploadName);
                        newTaskObject.set('requirementImgs', requirementImgs);
                        newTaskObject.set('taskStatus', 'uploaded');
                        newTaskObject.set('receiveTaskObject', receiveTaskObject);
                        newTaskObject.save().then(function(){
                            var relation = receiveTaskObject.relation('mackTask');
                            relation.add(newTaskObject);// 建立针对每一个 Todo 的 Relation
                            receiveTaskObject.save().then(function(){
                                res.json({'errorId':0, 'errorMsg':'', 'uploadName':uploadName, 'requirementImgs':requirementImgs});
                            }, function (error) {
                                //更新任务失败
                                console.log('upload task img failed(save relation):' + taskStatus + 'error:' + error.message);
                                res.json({'errorMsg':error.message, 'uploadName':uploadName,  'errorId': error.code});
                            });
                        }, function (error) {
                            //更新任务失败
                            console.log('upload task img failed(save task):' + taskStatus + 'error:' + error.message);
                            res.json({'errorMsg':error.message, 'uploadName':uploadName, 'errorId': error.code});
                        });
                    }else {
                        //该用户已经做过任务,想重新传图
                        var taskStatus = uploadDoTaskObject.get('taskStatus');
                        if (taskStatus == 'accepted' || taskStatus == 'systemAccepted'){
                            //任务已经完成,无需再做
                            res.json({'errorMsg':'任务已经完成喽', 'errorId': -100});
                        }else if (taskStatus == 'expired') {
                            res.json({'errorMsg':'任务已经超时过期', 'errorId': -101});
                        }else {
                            //自己重新提交,或者被决绝后重新做任务
                            //销毁以往图片
                            var images = uploadDoTaskObject.get('requirementImgs');
                            var query_file = new AV.Query(File);
                            query_file.containedIn('url', images);
                            query_file.find().then(function(imgResults){
                                for (var e = 0; e < imgResults.length; e++){
                                    imgResults[e].destroy().then(function(){
                                        //remove success
                                    })
                                }
                            });

                            uploadDoTaskObject.set('requirementImgs', requirementImgs);
                            //区分 自己提交和 拒绝后提交
                            if (taskStatus == 'refused'){
                                uploadDoTaskObject.set('taskStatus', 'reUploaded');
                            }else {
                                uploadDoTaskObject.set('taskStatus', 'uploaded');
                            }
                            uploadDoTaskObject.save().then(function(){
                                res.cookie('uploadImgName', userUploadName);
                                res.json({'errorId':0, 'errorMsg':'', 'uploadName':uploadName, 'requirementImgs':requirementImgs});
                            }, function (error) {
                                //更新任务失败
                                console.log('reUpload task img failed(save task):' + taskStatus + 'error:' + error.message);
                                res.json({'errorMsg':error.message, 'uploadName':uploadName, 'errorId': error.code});
                            });
                        }
                    }
                }

            });
        },
        function (err){
            console.log('upload task img failed(task object error):' + taskStatus + 'error:' + error.message);
            res.json({'errorMsg':err.message, 'errorId': err.code, 'uploadName':uploadName});
        })
});

module.exports = router;