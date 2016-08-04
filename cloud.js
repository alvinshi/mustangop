/**
 * Created by wujiangwei on 16/5/4.
 */

var AV = require('leanengine');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var User = AV.Object.extend('_User');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表
var messageLogger = AV.Object.extend('messageLogger'); //消息表

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
    response.success('Hello world!');
});

//// QQ交换今日任务定时器
//function getRefreshTaskQuery(){
//    var myDate = new Date();
//    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
//
//    var query = new AV.Query(IOSAppExcLogger);
//    query.lessThanOrEqualTo('remainCount', 0);
//    query.notEqualTo('taskStatus', 1);
//    query.lessThan('excDateStr', myDateStr); // 今天前的日期
//    query.exists('requirementImg');
//    query.exists('totalExcCount');
//    query.exists('excKinds');
//    query.descending('createdAt');
//    return query;
//}
//
//AV.Cloud.define('refreshTask', function(request, response) {
//
//    var query = getRefreshTaskQuery();
//
//    query.count().then(function (count) {
//        var totalCount = count;
//
//        if (totalCount == 0){
//            console.log('!!!!! refreshTask succeed: no task need to deal');
//            response.success('refreshTask');
//            return;
//        }
//
//        var remain = totalCount % 1000;
//        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;
//
//        for (var i = 0; i < totalForCount; i++){
//            var subQuery = getRefreshTaskQuery();
//            subQuery.limit(1000);
//            subQuery.skip(i * 1000);
//            query.find().then(function(results){
//                for (var i = 0; i < results.length; i++){
//                    results[i].set('taskStatus', 1);
//                }
//                AV.Object.saveAll(results).then(function (avobjs) {
//                    //if (i == totalForCount - 1)
//                    {
//                        console.log('!!!!! refreshTask succeed');
//                        response.success('refreshTask');
//                    }
//                }, function (error) {
//                    console.log('----- refreshTask error');
//                    response.fail('refreshTask fail');
//                });
//            });
//        }
//    }, function (error) {
//        console.log('----- refreshTask error: count error');
//        response.fail('refreshTask fail');
//    });
//
//});

// 早上10点任务超时/未完成定时器
// 1.未审核任务自动审核成功 —— 付钱给做任务者
// 2.未完成任务罚款 —— 扣钱到系统,同时退钱
function getTaskCheckQuery(){
    var nowTimestamp = new Date().getTime();
    //早10点审核 前天下午6点前接受的任务
    var yesterdayTimestamp = nowTimestamp - 1000*60*60*16;
    var yesterdayDate = new Date(yesterdayTimestamp);

    var query = new AV.Query(receiveTaskObject);
    // 已经被定时器操作过的任务
    query.notEqualTo('close', true);
    query.lessThanOrEqualTo('createdAt', yesterdayDate);
    query.ascending('createdAt');
    return query;
}

// 这个定时器只处理领取任务的相关信息 每天10点处理前一天晚上6点前的数据
AV.Cloud.define('checkTask', function(request, response){
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
            query_a.include('taskObject');
            query_a.include('appObject');
            query_a.include('taskObject.userObject');
            query_a.limit(1000);
            query_a.skip(i * 1000);
            query_a.find().then(function(results){ // 查找出所有没有完成的任务
                for (var e = 0; e < results.length; e++){
                    results[e].set('close', true);

                    (function(receTaskObject){
                        var task = receTaskObject.get('taskObject'); // 领取任务的object
                        var user = receTaskObject.get('userObject'); // 领取任务的用户
                        var app = receTaskObject.get('appObject'); // 领取的任务App
                        var trackName = app.get('trackName'); //任务App名称

                        var rate_unitPrice = task.get('rateUnitPrice'); // 任务的单价
                        var releaseTaskUser = task.get('userObject');  // 发布任务的用户

                        // 修改任务为已经接收 最多可以做1000个任务
                        var relation = receTaskObject.relation('mackTask');
                        var query = relation.query();
                        query.limit(1000);
                        query.find().then(function(doTaskObjects){
                            for (var r = 0; r < doTaskObjects.length; r++){
                                var taskStatus = doTaskObjects[r].get('taskStatus');
                                var changeDoTasks = [];
                                if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                                    doTaskObjects[r].set('taskStatus', 'systemAccepted');
                                    changeDoTasks.push(doTaskObjects[r]);
                                    //增加做任务人的钱
                                    user.increment('totalMoney', rate_unitPrice);
                                    //扣除发布任务人的冻结钱
                                    releaseTaskUser.releaseTaskUser('freezingMoney', -rate_unitPrice);
                                }else{
                                    //do nothing
                                    //query.notContainedIn('taskStatus', ['systemAccepted', 'accepted', 'refused']);
                                }
                            }

                            var undoTask = receiveTaskObject.get('receiveCount') - doTaskObjects.length;
                            if (undoTask > 0){
                                //protect
                                //1.扣除用户金币入系统(汇率金币)  减少发布人冻结的钱 增加发布人总钱
                                user.increment('totalMoney', -(rate_unitPrice * undoTask));
                                releaseTaskUser.releaseTaskUser('freezingMoney', - (rate_unitPrice * undoTask));
                                releaseTaskUser.releaseTaskUser('totalMoney', rate_unitPrice * undoTask);

                                //2.过期任务增加
                                receTaskObject.increment('expiredCount', undoTask);

                                //发布罚钱信息
                                var message = new messageLogger();
                                message.set("senderObjectId", user);
                                message.set('receiverObjectId', user);
                                message.set('category', 'Y币');
                                message.set('type', '处罚');
                                message.set('firstPara', trackName);
                                message.set('thirdPara', rate_unitPrice *  undoTask);
                                message.set('fourthPara', task_not_done);
                                message.save();
                            }

                            task.save();
                            releaseTaskUser.save();
                            user.save().then(function (saveUserObject) {
                                console.log('!!!!! checkTask receiveUser YB succeed');
                                //如果欠费,发布欠费消息
                                var moneyLeft = saveUserObject.get('totalMoney');
                                if (moneyLeft < 0){
                                    var msgNoMoney = new messageLogger();
                                    msgNoMoney.set("senderObjectId", user);
                                    msgNoMoney.set('receiverObjectId', user);
                                    msgNoMoney.set('category', 'Y币');
                                    msgNoMoney.set('type', '欠费');
                                    msgNoMoney.save();
                                }
                            }, function (error) {
                                console.log('----- totalMoney error');
                            });

                            AV.Object.saveAll(changeDoTasks).then(function(){
                                console.log('!!!!! checkTask modify task is accepted succeed');
                            });
                        });
                    })(results[e]);

                    // 修改流水库 因为是异步 所以封装起来 处理
                    // BUGBUG
                    //(function (checkPendingTask, notDoTaskCount){
                    //    var query_journal = new AV.Query(accountJournal);
                    //    query_journal.equalTo('payYCoinUser', releaseTaskUser);
                    //    query_journal.equalTo('taskObject', task);
                    //    query_journal.equalTo('incomeYCoinUser', user);
                    //    query_journal.equalTo('payYCoinStatus', 'prepare_pay');
                    //    query_journal.equalTo('incomeYCoinStatus', 'prepare_income');
                    //    query_journal.find().then(function(result){
                    //        console.log(checkPendingTask);
                    //        console.log(notDoTaskCount);
                    //        for (var z = 0; z < checkPendingTask; z++){
                    //            var payYB = result[z].get('payYCoin'); // 支付的YB
                    //            var incomeYB = result[z].get('incomeYCoin'); // 得到的YB
                    //            var systemYB = payYB - incomeYB;  // 系统得到的
                    //
                    //            result[z].set('payYCoinStatus', 'payed');
                    //            result[z].set('incomeYCoinStatus', 'incomed');
                    //            result[z].set('systemYCoin', systemYB);
                    //
                    //        }
                    //        for (var f = checkPendingTask; f < notDoTaskCount + checkPendingTask; f++){
                    //            result[f].set('incomeYCoinStatus', 'punish_income');
                    //        }
                    //
                    //        AV.Object.saveAll(result).then(function(){
                    //            console.log('!!!!! checkTask  modify journal succeed');
                    //        })
                    //    });
                    //})(submitted, task_not_done);
                }
                AV.Object.saveAll(results).then(function(){
                    console.log('!!! 保存领取任务里面修改内容成功 !!!')
                    response.success('checkTask success');
                })
            })
        }
        function error(){
            console.log('----- checkTask error: count error');
            response.fail('checkTask fail');
        }
    })
});

module.exports = AV.Cloud;

//var paramsJson = {
//    movie: "夏洛特烦恼"
//};
//
//AV.Cloud.run('checkTask', paramsJson, {
//    success: function(data) {
//        // 调用成功，得到成功的应答data
//    },
//    error: function(err) {
//        // 处理调用失败
//    }
//});

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



