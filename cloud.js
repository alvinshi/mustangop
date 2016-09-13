/**
 * Created by wujiangwei on 16/5/4.
 */

var AV = require('leanengine');
var util = require('./routes/util');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var mackTaskInfoObject = AV.Object.extend('mackTaskInfo'); // 做单条任务的库

var messager = require('./utils/messager');

//小马
var tempUserSQL = AV.Object.extend('tempUser');
var YCoinToRMBRate = 0.45;
var masterRMBRate = 0.2;    //师徒获取Y币比率

//测试代码
var debugUploadTask = 0;
var debugRefusedTask = 0;

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
    response.success('Hello world!');
});

// 早上10点任务超时/未完成定时器
// 1.未审核任务自动审核成功 —— 付钱给做任务者
// 2.未完成任务罚款 —— 扣钱到系统,同时退钱
function getTaskCheckQuery(){
    var nowTimestamp = new Date().getTime();
    //早10点审核 前天下午6点前接受的任务
    var yesterdayTimestamp = nowTimestamp - 1000*60*60*16;
    if(debugUploadTask == 1){
        yesterdayTimestamp = nowTimestamp;    //test
    }
    var yesterdayDate = new Date(yesterdayTimestamp);

    var query = new AV.Query(receiveTaskObject);
    // 已经被定时器操作过的任务
    query.notEqualTo('close', true);
    query.notEqualTo('timerDone', true);
    query.lessThanOrEqualTo('createdAt', yesterdayDate);
    query.ascending('createdAt');
    return query;
}

function dealReceiveTask(inReceTaskObject, doTaskObjects, taskUsers, locked, results)
{
    var app = inReceTaskObject.get('appObject'); // 领取的任务App
    var task = inReceTaskObject.get('taskObject'); // 领取任务的object

    function retResponse()
    {
        if(locked == results.length){
            //保存所有用户的数据改动
            AV.Object.saveAll(taskUsers.concat(results)).then(function(){
                console.log('!!!!! checkTask  modify journal succeed');
            }, function (error) {
                console.error('---------- save all user money error ' + error.message);
            });
        }
    }

    if(task == undefined || app == undefined){
        console.error('********** task or app is undefine in timer func');
        retResponse();
        return;
    }
    var releaseTaskUser = util.addLeanObject(task.get('userObject'), taskUsers);
    if(releaseTaskUser == undefined){
        console.error('********** releaseUser is undefine in timer func');
        retResponse();
        return;
    }
    console.log('********** task for timer: ' + inReceTaskObject.id);

    var trackName = app.get('trackName'); //任务App名称
    var tempUserPrice = task.get('tempUserPrice');
    var excUnitPrice = task.get('excUnitPrice'); // 发布任务的单价
    var rateUnitPrice = task.get('rateUnitPrice');

    // 领取任务的用户
    var user = util.addLeanObject(inReceTaskObject.get('userObject'), taskUsers);
    var tempUser = inReceTaskObject.get('tempUserObject');

    var needDoneTimer = true;
    var changeDoTasks = [];
    for (var r = 0; r < doTaskObjects.length; r++){
        var taskStatus = doTaskObjects[r].get('taskStatus');
        var usernameForMessage;
        if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){

            //不能在1小时之内提交的任务(审核人员来不及审核)
            var taskUpdateDate = doTaskObjects[r].updatedAt;
            var nowDate = new Date();
            if(taskUpdateDate.getDay() ==  nowDate.getDay() &&
                taskUpdateDate.getMonth() ==  nowDate.getMonth() &&
                taskUpdateDate.getHours() >= nowDate.getHours() - 1){
                needDoneTimer = false;
                if(debugUploadTask != 1) {
                    continue;
                }
            }

            doTaskObjects[r].set('taskStatus', 'systemAccepted');
            changeDoTasks.push(doTaskObjects[r]);

            if (user != undefined)
            {
                //野马用户
                usernameForMessage = user.get('username');

                //新手任务
                if(changeDoTasks.length == 1 && user.get('registerBonus') == 'register_upload_task'){
                    user.set('registerBonus', 'register_accept_task');
                }

                //增加做任务人的钱
                console.log('****** task be accept by timer ****** do task user ' + user.id + '(add total YB) +' + rateUnitPrice);
                user.increment('totalMoney', rateUnitPrice);
                messager.earnMsg('(' + releaseTaskUser.get('username') + ')超时未审核,系统自动接受了您提交的任务(' + trackName + ')结果', rateUnitPrice, user.id, user);
            }
            else
            {
                //小马用户
                //增加钱
                usernameForMessage = tempUser.get('userCodeId');

                var isToday = true;
                var myDate = new Date();
                var month = (myDate.getMonth() + 1).toString();
                var day = myDate.getDate().toString();
                var yearStr = myDate.getFullYear().toString();
                var todayStr = yearStr + '-' + month + '-' + day;
                var todayMoneyDate = tempUser.get('todayMoneyDate');
                if (todayMoneyDate != todayStr) {
                    //非当天赚到的钱
                    isToday = false;
                }

                var tempUserGetRMB = 0;
                if (tempUserPrice > 0) {
                    tempUserGetRMB = tempUserPrice;
                } else {
                    tempUserGetRMB = (rateUnitPrice / 10) * YCoinToRMBRate;
                }

                //增加用户的钱(总额,可用,今日)
                tempUser.increment('totalMoney', tempUserGetRMB);
                tempUser.increment('currentMoney', tempUserGetRMB);
                if (isToday == true) {
                    tempUser.increment('todayMoney', tempUserGetRMB);
                } else {
                    //更新日期到最新
                    tempUser.set('todayMoneyDate', todayStr);
                    tempUser.set('todayMoney', tempUserGetRMB);
                }
                console.log('****** task be accept by timer ------ temp do task user ' + tempUser.get('userCodeId') + '(add total RMB) +' + tempUserGetRMB);

                //增加师傅的钱
                var masterCode = tempUser.get('inviteCode');
                if (masterCode != undefined && masterCode.length > 0) {
                    var tempUserQuery = new AV.Query(tempUserSQL);
                    tempUserQuery.equalTo('userCodeId', masterCode);
                    tempUserQuery.find().then(function (datas) {

                        if (datas.length == 1) {
                            var masterUserObject = datas[0];
                            var isToday = true;
                            var masterRewards = tempUserGetRMB * masterRMBRate;

                            var todayMoneyDate = masterUserObject.get('todayMoneyDate');
                            if (todayMoneyDate != todayStr) {
                                //非当天赚到的钱
                                isToday = false;
                            }

                            //增加用户的钱(总额,可用,今日)
                            masterUserObject.increment('totalMoney', masterRewards);
                            masterUserObject.increment('currentMoney', masterRewards);
                            masterUserObject.increment('apprenticeMoney', masterRewards);
                            if (isToday == true) {
                                masterUserObject.increment('todayMoney', masterRewards);
                            } else {
                                //更新日期到最新
                                masterUserObject.set('todayMoneyDate', todayStr);
                                masterUserObject.set('todayMoney', masterRewards);
                            }

                            masterUserObject.save().then(function () {
                                console.log('****** task be accept by timer ------ temp do task user(his master) ' + masterUserObject.get('userCodeId') + '(add total RMB) +' + masterRewards);
                            }, function (error) {

                            });

                            //TODO RMB Logger
                        }
                    });

                    //TODO RMB Logger
                }
            }

            //扣除发布任务人的冻结钱
            releaseTaskUser.increment('freezingMoney', -excUnitPrice);
            messager.payMsg('您超时未审核,系统自动接受了（' + usernameForMessage + '）提交的任务(' + trackName + ')结果', excUnitPrice, releaseTaskUser.id, releaseTaskUser);
            console.log('****** task be accept by timer ****** release task user : ' + releaseTaskUser.id + '(minus freeze YB) -' + rateUnitPrice);
        }else if(taskStatus == 'refused'){
            needDoneTimer = false;
        }
        else{
            //do nothing
            //query.notContainedIn('taskStatus', ['systemAccepted', 'accepted', 'refused']);
        }
    }

    if(changeDoTasks.length > 0){
        AV.Object.saveAll(changeDoTasks).then(function(){
            console.log(inReceTaskObject.id + ' ______ task status for systemAccepted Saved succeed');
        },function(error){
            console.error(inReceTaskObject.id + ' ______ task status for systemAccepted Saved error');
        });
    }

    //还得减去已过期,不再重新结算
    var undoTask = inReceTaskObject.get('receiveCount') - doTaskObjects.length - inReceTaskObject.get('expiredCount');
    if (undoTask > 0){
        //protect
        //1.扣除用户金币入系统(汇率金币)  减少发布人冻结的钱 增加发布人总钱
        if(user != undefined){
            user.increment('totalMoney', -(rateUnitPrice * undoTask));
            messager.penaltyMsg(trackName, rateUnitPrice * undoTask, user);
            console.log('****** task be expired by timer ****** do task user : ' + user.id + '(minus/punish total YB) +' + (rateUnitPrice * undoTask));
        }else {
            //小马用户不存在超时的问题
        }

        //解锁发布任务的人的钱
        releaseTaskUser.increment('freezingMoney', - (excUnitPrice * undoTask));
        releaseTaskUser.increment('totalMoney', excUnitPrice * undoTask);
        messager.unfreezeMsg('您的任务（' + trackName + '）' + '有 ' + undoTask + ' 条(' + user.get('username') + ')领取未完成', rateUnitPrice * undoTask, releaseTaskUser.id, releaseTaskUser);
        console.log('****** task be expired by timer ****** release task user : ' + releaseTaskUser.id + '(minus freeze YB,add total YB) +' + (rateUnitPrice * undoTask));

        //2.过期任务增加
        inReceTaskObject.increment('expiredCount', undoTask);
    }

    inReceTaskObject.set('timerDone', needDoneTimer);
    retResponse();
}

//工作日10点定时器
// 这个定时器只处理领取任务的相关信息 每天10点处理前一天晚上6点前的数据
AV.Cloud.define('taskCheckForDoTask', function(request, response){
    var query = getTaskCheckQuery();

    query.count().then(function(count){
        var totalCount = count;
        if (totalCount == 0){
            console.log('!!!!! checkTask succeed: no task need to deal');
            response.success('checkTask');
            return;
        }

        var remain = totalCount % 1000;
        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;
        for (var i = 0; i < totalForCount; i++){
            //receiveTaskObject
            var query_a = getTaskCheckQuery();
            query_a.include('userObject');
            query_a.include('tempUserObject');
            query_a.include('tempMackTask');
            query_a.include('taskObject');
            query_a.include('appObject');
            query_a.include('taskObject.userObject');
            query_a.limit(1000);
            query_a.skip(i * 1000);
            query_a.find().then(function(results){ // 查找出所有没有完成的任务

                var locked = 0;
                var taskUsers = Array();

                for (var e = 0; e < results.length; e++){

                    //小马用户
                    var tempUser = results[e].get('tempUserObject');
                    if(tempUser != undefined){
                        //小马用户
                        locked++;
                        var tempMackTask = results[e].get('tempMackTask');
                        if(tempMackTask == undefined){
                            dealReceiveTask(results[e], [], taskUsers, locked);
                        }else {
                            dealReceiveTask(results[e], [tempMackTask], taskUsers, locked, results);
                        }
                    }else{
                        //换评用户
                        (function(receTaskObject){
                            // 修改任务为已经接收 最多可以做1000个任务
                            var relation = receTaskObject.relation('mackTask');
                            var query = relation.query();
                            query.notEqualTo('taskStatus', 'expired');
                            query.include('receiveTaskObject');
                            query.include('receiveTaskObject.taskObject');
                            query.include('receiveTaskObject.taskObject.userObject');
                            query.include('receiveTaskObject.userObject');
                            query.limit(1000);
                            query.find().then(function(doTaskObjects){
                                locked++;
                                //闭包
                                dealReceiveTask(receTaskObject, doTaskObjects, taskUsers, locked, results);
                            });
                        })(results[e]);
                    }
                }
            })
        }

        response.success('checkTask success');
    }, function(error){
        console.error('----- checkTask error: count error');
        response.fail('checkTask fail');
    })
});

//工作日11点定时器
//拒绝定时器,为了发布者设计的 —— 当拒绝任务后,做任务方未在2天内重新上传任务,任务会自动失效,发布者金钱+,冻结金钱-
AV.Cloud.define('refuseTaskTimerForRelease', function(request, response){
    //查询一定时间前拒绝的所有任务
    function getRefuseDoTaskQuery(){
        var nowTimestamp = new Date().getTime();
        //早11点审核 前天下午6点前被拒绝的任务有没有重新提交
        var yesterdayTimestamp = nowTimestamp - 1000*60*60*17;
        if(debugRefusedTask == 1){
            yesterdayTimestamp = nowTimestamp;  //test
        }
        var yesterdayDate = new Date(yesterdayTimestamp);

        var refuseDoTaskquery = new AV.Query(mackTaskInfoObject);
        // 已经被拒绝的任务
        refuseDoTaskquery.equalTo('taskStatus', 'refused');
        // 按照操作任务的时间来算 —— 拒绝的时间点
        refuseDoTaskquery.lessThanOrEqualTo('updatedAt', yesterdayDate);
        return refuseDoTaskquery;
    }

    var query = getRefuseDoTaskQuery();
    query.count().then(function(count){
        var totalCount = count;
        if (totalCount == 0){
            console.log('!!!!! no refused task: one day before');
            response.success('********** refuseTaskTimerForRelease succeed **********');
            return;
        }

        var remain = totalCount % 1000;
        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;

        for (var i = 0; i < totalForCount; i++){
            //receiveTaskObject
            var query_a = getRefuseDoTaskQuery();
            query_a.ascending('updatedAt');
            query_a.include('releaseTaskUser');
            query_a.include('receiveTaskObject.appObject');
            query_a.include('receiveTaskObject.userObject');
            query_a.include('receiveTaskObject.taskObject');
            query_a.limit(1000);
            query_a.skip(i * 1000);
            query_a.find().then(function(results){ // 查找出所有满足条件的被拒绝的任务
                //闭包
                var doReceTaskList = [];
                var refuseReleaseTaskUsers = [];

                for (var e = 0; e < results.length; e++){
                    var doTaskObject = results[e];
                    var doReceTaskObject = doTaskObject.get('receiveTaskObject');
                    var receUserObject = doReceTaskObject.get('userObject');
                    var taskObjectInDo = doReceTaskObject.get('taskObject');
                    if(taskObjectInDo == undefined){
                        continue;
                    }
                    var excUnitPrice = taskObjectInDo.get('excUnitPrice'); // 任务的单价
                    var sendTaskUserObject = doTaskObject.get('releaseTaskUser');
                    if(sendTaskUserObject == undefined){
                        sendTaskUserObject = taskObjectInDo.get('userObject');
                    }
                    var sendTaskUserObject = util.addLeanObject(sendTaskUserObject, refuseReleaseTaskUsers);

                    //拒绝任务1天内未重新做,设定为过期
                    doTaskObject.set('taskStatus', 'expired');

                    //任务超时个数增加
                    doReceTaskObject.increment('expiredCount', 1);
                    //解锁发布任务的人的YB
                    var app = doReceTaskObject.get('appObject'); // 领取的任务App
                    var trackName = app.get('trackName'); //任务App名称

                    sendTaskUserObject.increment('freezingMoney', -excUnitPrice);
                    sendTaskUserObject.increment('totalMoney', excUnitPrice);

                    messager.unfreezeMsg('您的任务（' + trackName + '）对方(' + receUserObject.get('username') + ')被拒绝后未重新提交', excUnitPrice, sendTaskUserObject.id, sendTaskUserObject);
                    console.log('****** refused task be expired by timer ****** release task user : ' + sendTaskUserObject.id + '(minus freeze YB,add total YB) +' + excUnitPrice);

                    util.addLeanObject(doReceTaskObject, doReceTaskList);
                }

                //解锁YB
                AV.Object.saveAll(refuseReleaseTaskUsers).then(function(){
                    console.log('!!!  返还过期拒绝任务的YB给发布者 成功 !!!');
                    //统一增加超时条目
                    AV.Object.saveAll(doReceTaskList).then(function(){
                        console.log('!!! 接受任务方超时任务条目增加 成功!!!');
                        //统一改变任务状态为 expired
                        AV.Object.saveAll(results).then(function(){
                            console.log('!!! 保存任务状态成功 !!!');
                            response.success('refuseTaskTimerForRelease success');
                        }, function(error){
                            console.error('------ results error');
                            response.fail('refuseTaskTimerForRelease fail');
                        });
                    }, function(error){
                        console.error('------ doReceTaskList error');
                        response.fail('refuseTaskTimerForRelease fail');
                    });
                }, function(error){
                    console.error('------ senTaskUserList error');
                    response.fail('refuseTaskTimerForRelease fail');
                });
            })
        }
        function error(){
            console.error('----- refuseTaskTimerForRelease error: count error');
            response.fail('refuseTaskTimerForRelease fail');
        }
    });
});

module.exports = AV.Cloud;

var paramsJson = {
    movie: "夏洛特烦恼"
};

if(debugUploadTask == 1){
    AV.Cloud.run('taskCheckForDoTask', paramsJson, {
        success: function(data) {
            // 调用成功，得到成功的应答data
            console.log('---- test timer: succeed');
        },
        error: function(err) {
            // 处理调用失败
            console.log('---- test timer: error');
        }
    });
}

if(debugRefusedTask == 1){
    AV.Cloud.run('refuseTaskTimerForRelease', paramsJson, {
        success: function(data) {
            // 调用成功，得到成功的应答data
            console.log('---- test timer: succeed');
        },
        error: function(err) {
            // 处理调用失败
            console.log('---- test timer: error');
        }
    });
}


////Promise test code
//var successful = new AV.Promise();
//successful.resolve('The good result.');
//
//var failed = new AV.Promise();
//failed.reject('An error message.');
//
//var successful = AV.Promise.as('The good result.');
//
//var failed = AV.Promise.error('An error message.');

//临时代码,修复string to int问题
//var query = new AV.Query('mackTaskInfo');
//query.descending('createdAt');
//query.include('appObject');
//query.limit(1000);
//query.skip(1000);
//query.find().then(function(results) {
//    for (var i = 0; i < results.length; i++) {
//        release_task_object = results[i];
//        var status = release_task_object.get('status');
//        if (status == 1){
//            release_task_object.set('taskStatus', 'uploaded');
//        }else if(status == 2){
//            release_task_object.set('taskStatus', 'refused');
//        }else {
//            release_task_object.set('taskStatus', 'accepted');
//        }
//
//        //release_task_object.set('receiveCountI', parseInt(release_task_object.get('receiveCount')));
//        //release_task_object.set('excCountI', parseInt(release_task_object.get('excCount')));
//        //release_task_object.set('ranKingI', parseInt(release_task_object.get('ranKing')));
//        //release_task_object.set('excUnitPriceI', parseInt(release_task_object.get('excUnitPrice')));
//
//        //release_task_object.set('receiveCount', release_task_object.get('receiveCountI'));
//        //release_task_object.set('excCount', release_task_object.get('excCountI'));
//        //release_task_object.set('ranKing', release_task_object.get('ranKingI'));
//        //release_task_object.set('excUnitPrice', release_task_object.get('excUnitPriceI'));
//    }
//
//    AV.Object.saveAll(results).then(function () {
//        console.log('---- fix bug: succeed')
//    }, function (error) {
//        console.log('---- fix bug: failed')
//    });
//});

