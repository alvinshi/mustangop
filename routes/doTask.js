/**
 * Created by tanghui on 16/7/6.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var User = AV.Object.extend('_User');
var IOSAppInfo = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务库


function dateCompare(DateA, DateB) {
    var a = new Date(DateA);
    var b = new Date(DateB);
    var msDateA = Date.UTC(a.getFullYear(), a.getMonth()+1, a.getDate());
    var msDateB = Date.UTC(b.getFullYear(), b.getMonth()+1, b.getDate());
    if (parseFloat(msDateA) < parseFloat(msDateB)) {
        if ((a.getDate() - b.getDate()) == -1) {
            return '昨天';
        }
        else {
            return a;
        }
    }// lt
    else if (parseFloat(msDateA) == parseFloat(msDateB)){
        return '今天';}  // eq
    else if (parseFloat(msDateA) > parseFloat(msDateB)){
        return a;} // gt
    else{
        console.log("fail");
    }
}

router.get('/', function(req, res) {
    res.render('doTask');
});

function getTaskQuery(userObject){
    var remainCountQuery = new AV.Query('releaseTaskObject');
    remainCountQuery.greaterThan('remainCount', 0);

    var today = new Date();
    var timeString = parseInt(today.getFullYear()) + '-' + parseInt(today.getMonth() + 1) + '-' + parseInt(today.getDate());
    var timeQuery = new AV.Query('releaseTaskObject');
    timeQuery.equalTo('releaseDate', timeString);

    var query = AV.Query.or(remainCountQuery, timeQuery);
    query.notEqualTo('cancelled', true);
    query.notEqualTo('close', true);
    query.notEqualTo('userObject', userObject);
    return query;
}

function taskObjectToDic(results, TaskObjects, isMyTask)
{
    for (var i = 0; i < results.length; i++){
        var appObject = Object();
        var userReleaseAppObject = results[i].get('appObject');
        // app详细信息
        appObject.artworkUrl100 = userReleaseAppObject.get('artworkUrl100');
        appObject.appObjectId = userReleaseAppObject.id;
        appObject.myTask = false;

        var trackName = userReleaseAppObject.get('trackName');
        if (trackName != undefined){
            appObject.trackName = trackName.substring(0, 18);
        }
        appObject.appleId = userReleaseAppObject.get('appleId');
        appObject.appleKind = userReleaseAppObject.get('appleKind');
        appObject.formattedPrice = userReleaseAppObject.get('formattedPrice');
        appObject.latestReleaseDate = userReleaseAppObject.get('latestReleaseDate');
        appObject.latestReleaseDate = dateCompare(appObject.latestReleaseDate, new Date());
        appObject.excUniqueCode = userReleaseAppObject.get('excUniqueCode');
        appObject.sellerName = userReleaseAppObject.get('sellerName');

        appObject.myTask = isMyTask;
        //黑名单描述
        appObject.blackDes = userReleaseAppObject.get('blackDes');

        appObject.objectId = results[i].id;
        appObject.excCount = results[i].get('excCount');
        appObject.remainCount = results[i].get('remainCount');
        appObject.rateUnitPrice = results[i].get('rateUnitPrice');

        // 任务详情信息
        appObject.taskType = results[i].get('taskType');
        appObject.ranking = results[i].get('ranKing');
        appObject.score = results[i].get('Score');
        appObject.searchKeyword = results[i].get('searchKeyword');
        appObject.screenshotCount = results[i].get('screenshotCount');
        appObject.titleKeyword = results[i].get('titleKeyword');
        appObject.commentKeyword = results[i].get('commentKeyword');
        appObject.detailRem = results[i].get('detailRem');


        if(isMyTask){
            TaskObjects.unshift(appObject);
        }else {
            TaskObjects.push(appObject);
        }
    }
}

function getDisableTaskQuery(userObject){
    //筛选应该是,我可以领,但是我不能领的任务(已经交换过)
    //查询用户无法做任务的query (使用非精准的App发布时间进行区分)
    var queryReceiveExcTask = new AV.Query(receiveTaskObject);
    queryReceiveExcTask.equalTo('userObject', userObject);
    queryReceiveExcTask.limit(1000);
    queryReceiveExcTask.descending('updatedAt');

    var query = new AV.Query(releaseTaskObject);
    query.greaterThan('remainCount', 0);
    query.notEqualTo('close', true);
    query.notEqualTo('cancelled', true);
    query.matchesKeyInQuery('excUniqueCode', 'excUniqueCode', queryReceiveExcTask);
    return query;
}

function getTaskObjectList(taskType, query, totalCount, pageIndex, userObject, res, disableCount){
    var flag = 0;
    var flagTotal = 2;
    var TaskObjects = [];
    var hasmore = 1;
    var myAppCount = 0;
    var disableTaskObjectList = Array();

    function dealOperationNewVersion(vaildTaskObjectList, operatedTaskOperationList){
        //isNewVersion
        for(var i = 0; i < vaildTaskObjectList.length; i++){
            for(var j = 0; j < operatedTaskOperationList.length; j++){
                if(vaildTaskObjectList[i]['myTask'] != true && vaildTaskObjectList[i]['appleId'] == operatedTaskOperationList[j].get('appObject').get('appleId')){
                    vaildTaskObjectList[i].isNewVersion = true;
                }
            }
        }
    }

    if (taskType == 'inactiveTask' || pageIndex > 0){
        flagTotal = 1;
    }else {
        //查询我发布的任务
        var queryMyTask = new AV.Query(releaseTaskObject);
        queryMyTask.notEqualTo('cancelled', true);
        queryMyTask.notEqualTo('close', true);
        queryMyTask.equalTo('userObject', userObject);
        queryMyTask.greaterThan('remainCount', 0);
        if (taskType == 'commentTask'){
           queryMyTask.equalTo('taskType', '评论');
        }
        else if (taskType == 'downTask'){
           queryMyTask.equalTo('taskType', '下载');
        }

        queryMyTask.include('appObject');
        queryMyTask.descending('createdAt');
        queryMyTask.find().then(function(results) {
            myAppCount = results.length;
            taskObjectToDic(results, TaskObjects, true);
            retTaskFunc(disableCount, 0);
        }, function(error){
            retTaskFunc(disableCount, 0);
        });
    }

    function retTaskFunc(disableCount, errorId){
        flag = flag + 1;
        if (flag == flagTotal) {
            dealOperationNewVersion(TaskObjects, disableTaskObjectList);
            if(disableCount >= 0){
                res.json({'allTask':TaskObjects, 'myAppCount':myAppCount, 'hasMore':hasmore, 'errorId': errorId, 'disableTaskCount':disableCount})
            }else {
                res.json({'allTask':TaskObjects, 'myAppCount':myAppCount, 'hasMore':hasmore, 'errorId': errorId, 'disableTaskCount':disableCount})
            }
        }
    }

    query.include('appObject');
    query.descending('createdAt');
    query.descending('remainCount');
    query.skip(pageIndex);
    query.limit(20);
    query.find().then(function(results){

        taskObjectToDic(results, TaskObjects, false);
        if (totalCount > results.length + pageIndex){
            hasmore = 1;
        }else {
            hasmore = 0;
        }

        if(taskType != 'inactiveTask'){
            //查询已换过App
            var queryReceiveExcTask = new AV.Query(receiveTaskObject);
            queryReceiveExcTask.equalTo('userObject', userObject);
            queryReceiveExcTask.limit(1000);
            queryReceiveExcTask.descending('updatedAt');

            var disableQuery = new AV.Query(releaseTaskObject);
            //曾经操作过的App即可
            disableQuery.matchesKeyInQuery('appObject', 'appObject', queryReceiveExcTask);

            disableQuery.containedIn('objectId', util.leanObjectListIdList(results));
            disableQuery.include('appObject');
            disableQuery.find().then(function(disableSubResults){
                disableTaskObjectList = disableSubResults;
                retTaskFunc(disableCount, 0);
            }, function(error){
                retTaskFunc(disableCount, 0);
            });
        }else {
            retTaskFunc(disableCount, 0);
        }
    }, function (error){
        retTaskFunc(disableCount, error.code);
    });
}

function queryRelTask(){
    var remainCountQuery = new AV.Query('releaseTaskObject');
    remainCountQuery.greaterThan('remainCount', 0);

    var today = new Date();
    var timeString = parseInt(today.getFullYear()) + '-' + parseInt(today.getMonth() + 1) + '-' + parseInt(today.getDate());
    var timeQuery = new AV.Query('releaseTaskObject');
    timeQuery.equalTo('releaseDate', timeString);

    var queryRelTask = AV.Query.or(remainCountQuery, timeQuery);
    queryRelTask.notEqualTo('cancelled', true);
    queryRelTask.notEqualTo('close', true);
    return queryRelTask
}

// get do task list
router.get('/taskHall/:pageIndex/:taskType', function(req, res){
    var userId = util.useridInReq(req);
    var pageIndex = parseInt(req.params.pageIndex);
    var tasktype = req.params.taskType;

    var user = new User();
    user.id = userId;

    if (userId == undefined ){
        var queryNotRegisteredUser = undefined;
        if (tasktype == 'allTask'){
            queryNotRegisteredUser = queryRelTask();
        }
        else if (tasktype == 'commentTask'){
            queryNotRegisteredUser = queryRelTask();
            queryNotRegisteredUser.equalTo('taskType', '评论');
        }
        else if (tasktype == 'downTask'){
            queryNotRegisteredUser = queryRelTask();
            queryNotRegisteredUser.equalTo('taskType', '下载');
        }
        else {
            //已筛选任务

        }

        var totalCount = 0;
        queryNotRegisteredUser.count().then(function(count){
            totalCount = count;
            getTaskObjectList(tasktype, queryNotRegisteredUser, totalCount, pageIndex, user, res, 0);
        }, function (error){
            getTaskObjectList(tasktype, queryNotRegisteredUser, 1000, pageIndex, user, res, 0);
        });

    }
    else {
        var query = new AV.Query(User);
        query.get(userId).then(function(userObject){
            //is sub seller user

            //查询用户无法做任务的query (使用精准的AppID+version作为标记位)
            var queryReceiveExcTask = getDisableTaskQuery(userObject);
            //TODO 标记为已做任务,去receiveTask数据库建立相关字段
            //TODO 个人中心保存用户告诉换屏设备个数,排序这边优先排序设备个数的换屏

            var query = undefined;

            if (tasktype == 'allTask'){
                query = getTaskQuery(userObject);
                if(userObject.get('isSellerChannel') == undefined || userObject.get('isSellerChannel') != 'yangyang'){
                    query.doesNotMatchKeyInQuery('excUniqueCode', 'excUniqueCode', queryReceiveExcTask);
                }
            }
            else if (tasktype == 'commentTask'){
                query = getTaskQuery(userObject);
                query.equalTo('taskType', '评论');
                query.doesNotMatchKeyInQuery('excUniqueCode', 'excUniqueCode', queryReceiveExcTask);
            }
            else if (tasktype == 'downTask'){
                query = getTaskQuery(userObject);
                query.equalTo('taskType', '下载');
                query.doesNotMatchKeyInQuery('excUniqueCode', 'excUniqueCode', queryReceiveExcTask);
            }
            else {
                //已筛选任务
                query = queryReceiveExcTask;
            }

            var totalCount = 0;
            query.count().then(function(count){
                totalCount = count;
                if (pageIndex == 0){
                    //首次请求时,查询筛选任务个数
                    var disableTaskQuery = getDisableTaskQuery(userObject);

                    disableTaskQuery.count().then(function(disableTaskCount){
                        getTaskObjectList(tasktype, query, totalCount, pageIndex, userObject, res, disableTaskCount);
                    }, function (error){
                        getTaskObjectList(tasktype, query, 1000, pageIndex, userObject, res, -1);
                    });
                }else {
                    var disabletaskQuery = getDisableTaskQuery(userObject);
                    disabletaskQuery.count().then(function(disableTaskCount){
                        getTaskObjectList(tasktype, query, totalCount, pageIndex, userObject, res, disableTaskCount);
                    },function (error){
                        getTaskObjectList(tasktype, query, 1000, pageIndex, userObject, res, -1);
                    });
                }
            }, function (error){
                getTaskObjectList(tasktype, query, 1000, pageIndex, userObject, res, -1);
            });

        }, function(error){
            //error
            res.json({'allTask':[], 'myAppCount':0, 'hasMore':0, 'errorId': error.errorCode, 'disableTaskCount':0})
        });
    }


});


// receive task 领取任务一个人统一领取
router.post('/postUsertask/:taskObjectId/:ratePrice/:appId', function(req, res){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
    //领取任务基本信息收集
    var userId = util.useridInReq(req);
    var receive_Count = parseInt(req.body.receiveCount);
    var excUniqueCode = req.body.excUniqueCode;
    var detail_Rem = req.body.detailRem;
    if (detail_Rem == undefined){
        detail_Rem = '';
    }
    var taskObjectId = req.params.taskObjectId;
    var appObjectId = req.params.appId;

    //任务领取人
    var userObject = new AV.User();
    userObject.id = userId;

    //任务ID
    var releaseQuery = new AV.Query(releaseTaskObject);
    releaseQuery.get(taskObjectId).then(function (releTaskObject) {

        var receive_Price = (releTaskObject.get('excUnitPrice')) * receive_Count;

        if(releTaskObject.get('close') == true){
            res.json({'succeeded': -2, 'errorMsg': '任务已关闭,不能领取哦'});
        }else if(releTaskObject.get('cancelled') == true){
            res.json({'succeeded': -2, 'errorMsg': '任务刚被发布者撤销,看看别的任务吧'});
        }else {
            var appObject = AV.Object.createWithoutData('IOSAppInfo', appObjectId);

            //后端效验
            var flag = true;
            var errorMsg = '';

            //1.不得重复领取同一任务
            var query = new AV.Query(receiveTaskObject);
            query.equalTo('userObject', userObject);
            query.equalTo('taskObject', releTaskObject);
            query.equalTo('appObject', appObject);
            query.include('taskObject');
            query.find().then(function(results){
                if (results.length > 0){
                    errorMsg = "任务已经被领取过";
                    flag = false;
                    res.json({'succeeded': -2, 'errorMsg': errorMsg});
                }else {
                    //2.账户余额不得为负
                    query = new AV.Query(User);
                    query.get(userId).then(function (userObject) {
                        var totalMoney = userObject.get('totalMoney');
                        if (totalMoney < 0) {
                            errorMsg = "账户余额为负, 请充值后再领取新任务";
                            res.json({'errorId': -100, 'errorMsg': errorMsg});
                        }else {
                            //3.剩余条数监测
                            var remainCount = releTaskObject.get('remainCount');
                            if (remainCount < receive_Count){
                                console.log('task get failed because of task done');
                                errorMsg = "抱歉, 任务被别的用户抢走了";
                                res.json({'errorId': -1, 'errorMsg': errorMsg});
                            }else {
                                //后端效验通过
                                var ReceiveTaskObject = new receiveTaskObject();
                                ReceiveTaskObject.set('userObject', userObject);
                                ReceiveTaskObject.set('taskObject', releTaskObject);
                                ReceiveTaskObject.set('appObject', appObject);
                                ReceiveTaskObject.set('receiveCount', receive_Count);
                                ReceiveTaskObject.set('receivePrice', receive_Price);
                                ReceiveTaskObject.set('detailRem', detail_Rem);

                                ReceiveTaskObject.set('excUniqueCode', excUniqueCode);//换评信息
                                ReceiveTaskObject.set('receiveDate', myDateStr);

                                releTaskObject.increment('remainCount', -receive_Count);

                                var needSavedTasks = [releTaskObject, ReceiveTaskObject];

                                AV.Object.saveAll(needSavedTasks).then(function(){
                                    res.json({'errorId': 0, 'errorMsg': '任务领取成功!'});
                                }, function(error){
                                    res.json({'errorId': error.code, 'errorMsg': error.message});
                                });
                            }
                        }
                    }, function(error){
                        res.json({'errorId': error.code, 'errorMsg': error.message});
                    });
                }
            });
        }

    }, function (error) {
        // 失败了
        res.json({'errorId': error.code, 'errorMsg': error.message});
    });
});

// 用户自己筛选的任务
router.post('/fiterApp', function(req, res){
    var userid = util.useridInReq(req);

    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var appObjectId = req.body.appObjectId;
    var excUniqueCode = req.body.excUniqueCode;
    var taskObjectId = req.body.taskObjectId;

    var userObject = new AV.User();
    userObject.id = userid;

    // 任务的Object 和 appObject
    var taskObject = AV.Object.createWithoutData('releaseTaskObject', taskObjectId);
    var appObject = AV.Object.createWithoutData('IOSAppInfo', appObjectId);

    var query = new AV.Query(releaseTaskObject);
    query.get(taskObjectId).then(function(myTaskObject){
        var myUserId = myTaskObject.get('userObject').id;
        if (myUserId == userid){
            res.json({'errorId': -1, 'errorMsg':'不能筛选自己发布的任务'})
        }else {
            var userFilterTaskObject = new receiveTaskObject();
            userFilterTaskObject.set('userObject', userObject);
            userFilterTaskObject.set('excUniqueCode', excUniqueCode);
            userFilterTaskObject.set('receiveDate', myDateStr);
            userFilterTaskObject.set('taskObject', taskObject);
            userFilterTaskObject.set('appObject', appObject);
            userFilterTaskObject.set('close', true);
            userFilterTaskObject.save().then(function(){
                res.json({'errorId':0, 'errorMsg':'筛选成功,当前版本不会出现'});
            },function (error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            })
        }
    },function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// banner
router.get('/banner', function(req, res){
    var query = new AV.Query('bannerObject');
    query.equalTo('close', true);
    query.equalTo('bannerType', 'doTask');
    query.find().then(function(bannerObject){
        var bannerList = Array();
        for (var i = 0; i < bannerObject.length; i++){
            var bannerUrl = bannerObject[i].get('bannerURL');
            bannerList.push(bannerUrl)
        }
        res.json({'bannerUrl': bannerList, 'errorId': 0, 'errorMsg':''})
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

module.exports = router;