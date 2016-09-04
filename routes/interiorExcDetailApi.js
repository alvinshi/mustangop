/**
 * Created by cailong on 16/7/21.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');
var homePageApi = require('./homePageApi');

var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var File = AV.Object.extend('_File');
var nodemailer = require('nodemailer');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport("SMTP",{
    service: 'QQ',
    auth: {
        user: "719480449@qq.com", // 账号
        pass: "kabggqckzbuwbdgi" // 密码
    }
});

function submissionNotification(qq){
    console.log(qq);
    if (qq == undefined){
        return;
    }
    else {
        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: '"野马ASO" <719480449@qq.com>', // sender address
            to: qq + '@qq.com', // list of receivers
            subject: '野马任务审核提醒', // Subject line
            html: '<p>尊敬的野马用户,您今日发布的任务已经有人领取并提交了,请快速到' +
            '<a style="color:red" href="http://www.mustangop.com/taskCheck">审核界面</a>审核提交结果.</p>' // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                res.json({'errorId': 1});
            }
            else{
                //console.log('Message sent: ' + info.response);
            }
            return;
        });
    }
}


router.get('/:excTaskId', function(req, res){
    res.render('interiorExcDetail')
});


router.get('/interior/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var query = new AV.Query(receiveTaskObject);
    query.include('taskObject');
    query.include('appObject');
    query.include('userObject');
    query.get(excTaskId).then(function(results){
        var retObject = Object();
        var hisappObject = results.get('appObject');
        var taskObject = results.get('taskObject');
        retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
        retObject.trackName = hisappObject.get('trackName');
        retObject.sellerName = hisappObject.get('sellerName');
        retObject.appleKind = hisappObject.get('appleKind');
        retObject.appleId = hisappObject.get('appleId');
        retObject.formattedPrice = hisappObject.get('formattedPrice');
        retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
        retObject.excUniqueCode = hisappObject.get('excUniqueCode');
        retObject.version = hisappObject.get('version');
        retObject.userObjectId = Base64.encode(results.get('userObject').id);

        retObject.totalExcCount = results.get('receiveCount');
        retObject.expiredCount = results.get('expiredCount');
        retObject.excKinds = taskObject.get('taskType');
        retObject.taskObjectId = taskObject.id;

        // 需求截图数据
        retObject.taskType = taskObject.get('taskType');  //任务类型
        retObject.searchKeyword = taskObject.get('searchKeyword');  //搜索关键词
        retObject.ranKing = taskObject.get('ranKing'); // 排名
        retObject.Score = taskObject.get('Score');  // 评分
        retObject.titleKeyword = taskObject.get('titleKeyword'); // 标题关键词
        retObject.commentKeyword = taskObject.get('commentKeyword'); // 评论关键词
        retObject.detailRem = taskObject.get('detailRem'); // 备注详情
        retObject.screenshotCount = taskObject.get('screenshotCount'); // 截图数

        // 请求已经上交的数据
        var relation = results.relation('mackTask');
        var task_query = relation.query();
        task_query.ascending('createdAt');
        task_query.find().then(function(result){
            var mackTaskList = new Array();
            for (var i = 0; i < result.length; i++){
                var mackTaskObject = Object();
                mackTaskObject.uploadName = result[i].get('uploadName');
                mackTaskObject.taskImages = result[i].get('requirementImgs');
                mackTaskObject.detail = result[i].get('detail');  // 拒绝理由
                //Error for
                mackTaskObject.status = result[i].get('taskStatus'); // 任务状态
                mackTaskObject.type = 'real';
                mackTaskList.push(mackTaskObject);
            }
            //未提交条目计算, 如果任务已经过期则不再推送假的Object
            retObject.tasksRemain = retObject.totalExcCount - mackTaskList.length - retObject.expiredCount;

            //初始假的Object
            for (var j = 0; j < retObject.tasksRemain; j++){
                var dummyObject = Object();
                dummyObject.type = 'dummy';
                mackTaskList.push(dummyObject);
            }
            res.json({'oneAppInfo':retObject, errorId:0, 'macTasks':mackTaskList})
        },function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        })
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

//重新请求mackTask表
router.get('/refresh/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var query = new AV.Query(receiveTaskObject);
    query.include('taskObject');
    query.include('appObject');
    query.get(excTaskId).then(function(results){
        var totalExcCount = results.get('receiveCount');
        var expiredCount = results.get('expiredCount');
        // 请求已经上交的数据
        var relation = results.relation('mackTask');
        var task_query = relation.query();
        task_query.ascending('createdAt');
        task_query.find().then(function(result){
            var mackTaskList = new Array();
            for (var i = 0; i < result.length; i++){
                var mackTaskObject = Object();
                mackTaskObject.uploadName = result[i].get('uploadName');
                mackTaskObject.taskImages = result[i].get('requirementImgs');
                mackTaskObject.detail = result[i].get('detail');  // 拒绝理由
                //Error for
                mackTaskObject.status = result[i].get('taskStatus'); // 任务状态
                mackTaskObject.type = 'real';
                mackTaskList.push(mackTaskObject);
            }
            //未提交条目计算, 如果任务已经过期则不再推送假的Object
            var tasksRemain = totalExcCount - mackTaskList.length - expiredCount;

            //初始假的Object
            for (var j = 0; j < tasksRemain; j++){
                var dummyObject = Object();
                dummyObject.type = 'dummy';
                mackTaskList.push(dummyObject);
            }
            res.json({errorId:0, 'macTasks':mackTaskList, 'taskRemain':tasksRemain})
        },function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        })
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

// 新增 做内部做任务
router.post('/add/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var userId = util.useridInReq(req);
    var requirementImgs = req.body.requirementImgs;
    var userUploadName = req.body.uploadName;

    if(requirementImgs == undefined || requirementImgs.length == 0){
        res.json({'errorMsg':'上传图片失败', 'errorId': -3});
        return;
    }

    var task_query = new AV.Query(receiveTaskObject);
    task_query.include('taskObject');
    task_query.include('userObject');
    task_query.include('taskObject.userObject');
    task_query.get(excTaskId).then(function(receiveTaskObject){
            var relation = receiveTaskObject.relation('mackTask');
            var receiveCount = receiveTaskObject.get('receiveCount');
            var userObject = receiveTaskObject.get('userObject');
            var expiredCount = receiveTaskObject.get('expiredCount');
            var releaseTaskUserObject = receiveTaskObject.get('taskObject').get('userObject');
            var qq = releaseTaskUserObject.get('userQQ');
            var query = relation.query();
            query.notEqualTo('taskStatus', 'expired');
            query.find().then(function(results){

                var uploadDoTaskObject = undefined;

                for (var dj = 0; dj < results.length; dj++){
                    var doTaskObject = results[dj];
                    if(doTaskObject.get('uploadName') == userUploadName){
                        uploadDoTaskObject = doTaskObject;
                        break;
                    }
                }

                //这边必须不包含过期条目,因为expiredCount已经包含了
                if((results.length + expiredCount) >= receiveCount && uploadDoTaskObject == undefined){
                    //任务已经做满,不能重新再上传
                    res.json({'errorMsg':'参与任务者已满,若想重新提交截图,请使用之前提交截图用户的昵称', 'uploadName':userUploadName, 'errorId': -200});
                }else {
                    if(uploadDoTaskObject == undefined){
                        //new task
                        //add task imgs
                        var newTaskObject = new mackTaskInfo();
                        newTaskObject.set('uploadName', userUploadName);
                        newTaskObject.set('requirementImgs', requirementImgs);
                        newTaskObject.set('taskStatus', 'uploaded');
                        newTaskObject.set('receiveTaskObject', receiveTaskObject);
                        newTaskObject.set('doTaskUser', userObject);
                        newTaskObject.set('releaseTaskUser', releaseTaskUserObject);
                        newTaskObject.save().then(function(){
                            var relation = receiveTaskObject.relation('mackTask');
                            relation.add(newTaskObject);// 建立针对每一个 Todo 的 Relation
                            receiveTaskObject.save().then(function(){
                                //发送邮件
                                //submissionNotification(qq);

                                //每日任务
                                var myDate = new Date();
                                if(myDate.getHours() < 16 || (myDate.getHours() == 16 && myDate.getMinutes() < 31)){
                                    homePageApi.dayTaskIncrement(userId, 'doTaskY', 1);
                                }

                                var needSaveUserObjects = Array();
                                //新做的任务
                                if(userObject.get('registerBonus') == 'register_new'){
                                    userObject.set('registerBonus', 'register_upload_task');
                                    needSaveUserObjects.push(userObject);
                                }

                                var inviteUserId = userObject.get('inviteUserId');
                                if(inviteUserId != undefined && inviteUserId.length > 0 && inviteUserId != 'invite_done'){
                                    var inviteUserObject = new AV.User();
                                    inviteUserObject.id = userObject.get('inviteUserId');
                                    inviteUserObject.increment('inviteSucceedCount', 1);
                                    inviteUserObject.save();

                                    userObject.set('inviteUserId', 'invite_done');
                                    if(needSaveUserObjects.length == 0){
                                        needSaveUserObjects.push(userObject);
                                    }
                                    needSaveUserObjects.push(inviteUserObject);
                                }

                                if(needSaveUserObjects.length > 0){
                                    AV.Object.saveAll(needSaveUserObjects).then(function(){
                                        res.json({'errorId':0, 'errorMsg':'', 'uploadName':userUploadName, 'requirementImgs':requirementImgs});
                                    }, function(err){
                                        console.log('----- invite add YB failed');
                                        res.json({'errorId':0, 'errorMsg':'', 'uploadName':userUploadName, 'requirementImgs':requirementImgs});
                                    });
                                }else {
                                    res.json({'errorId':0, 'errorMsg':'', 'uploadName':userUploadName, 'requirementImgs':requirementImgs});
                                }
                            }, function (error) {
                                //更新任务失败
                                console.log('upload task img failed(save relation):' + taskStatus + 'error:' + error.message);
                                res.json({'errorMsg':error.message, 'uploadName':userUploadName,  'errorId': error.code});
                            });
                        }, function (error) {
                            //更新任务失败
                            console.log('upload task img failed(save task):' + taskStatus + 'error:' + error.message);
                            res.json({'errorMsg':error.message, 'uploadName':userUploadName, 'errorId': error.code});
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
                                //发送邮件
                                //console.log("runned");
                                submissionNotification(qq);

                                res.cookie('uploadImgName', userUploadName);
                                res.json({'errorId':0, 'errorMsg':'', 'uploadName':userUploadName, 'requirementImgs':requirementImgs});
                            }, function (error) {
                                //更新任务失败
                                console.log('reUpload task img failed(save task):' + taskStatus + 'error:' + error.message);
                                res.json({'errorMsg':error.message, 'uploadName':userUploadName, 'errorId': error.code});
                            });
                        }
                    }
                }

            });
        },
        function (err){
            console.log('upload task img failed(task object error):');
            res.json({'errorMsg':err.message, 'errorId': err.code, 'uploadName':userUploadName});
        })
});


module.exports = router;