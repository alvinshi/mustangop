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

// QQ交换今日任务定时器
function getRefreshTaskQuery(){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(IOSAppExcLogger);
    query.lessThanOrEqualTo('remainCount', 0);
    query.notEqualTo('taskStatus', 1);
    query.lessThan('excDateStr', myDateStr); // 今天前的日期
    query.exists('requirementImg');
    query.exists('totalExcCount');
    query.exists('excKinds');
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('refreshTask', function(request, response) {

    var query = getRefreshTaskQuery();

    query.count().then(function (count) {
        var totalCount = count;

        if (totalCount == 0){
            console.log('!!!!! refreshTask succeed: no task need to deal');
            response.success('refreshTask');
            return;
        }

        var remain = totalCount % 1000;
        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;

        for (var i = 0; i < totalForCount; i++){
            var subQuery = getRefreshTaskQuery();
            subQuery.limit(1000);
            subQuery.skip(i * 1000);
            query.find().then(function(results){
                for (var i = 0; i < results.length; i++){
                    results[i].set('taskStatus', 1);
                }
                AV.Object.saveAll(results).then(function (avobjs) {
                    //if (i == totalForCount - 1)
                    {
                        console.log('!!!!! refreshTask succeed');
                        response.success('refreshTask');
                    }
                }, function (error) {
                    console.log('----- refreshTask error');
                });
            });
        }
    }, function (error) {
        console.log('----- refreshTask error: count error');
    });

});

// 晚上10点新版本审核定时器
// 1.未审核任务自动审核成功
// 2.未完成任务罚款
// 3.拒绝任务未重新做,任务失败
function getTaskCheckQuery(){
    var date = new Date().getTime();
    var dateStr = date - 1000*60*60*24;
    var myDate = new Date(dateStr);
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth()) + 1) + '-' + myDate.getDate();

    var query = new AV.Query(receiveTaskObject);
    query.notEqualTo('close', true);
    query.equalTo('receiveDate', myDateStr);
    query.descending('createdAt');
    return query;
}

// 这个定时器只处理领取任务的相关信息 每天10点只处理前一天的数据
AV.Cloud.define('checkTask', function(request, response){
    var query = getTaskCheckQuery();

    query.count().then(function(count){
        var totalcount = count;

        if (totalcount == 0){
            console.log('!!!!! checkTask succeed: no task need to deal');
            response.success('checkTask');
            return;
        }

        var remain = totalcount % 1000;
        var totalForCount = totalcount/1000 + remain > 0 ? 1 : 0;
        for (var i = 0; i < totalForCount; i++){
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
                    var task = results[e].get('taskObject'); // 领取任务的id
                    var user = results[e].get('userObject'); // 领取任务的用户
                    var app = results[e].get('appObject'); // 领取任务的用户
                    var trackName = app.get('trackName'); //任务App名称

                    var rate_unitPrice = task.get('rateUnitPrice'); // 任务的单价

                    var releaseTaskUser = task.get('userObject');  // 发布任务的用户

                    // 每天10点 做任务人提交了任务 发布者未审核 钱付给做任务者
                    var submitted = results[e].get('submitted');
                    if (submitted != 0){
                        // 增加 做任务人的金钱 用累加的方法
                        user.increment('totalMoney', submitted * rate_unitPrice);

                        // 修改领取库里的 审核 变成已经审核
                        results[e].set('submitted', 0); // 把任务审核显示已经审核
                        results[e].increment('accepted', submitted);//使用计数 不断加

                        // 修改任务为已经接收 最多可以做1000个任务
                        var relation = results[e].relation('mackTask');
                        var query = relation.query();
                        query.limit(1000);
                        query.find().then(function(addtask){
                            for (var r = 0; r < addtask.length; r++){
                                var rejected = addtask[r].get('status');
                                if (rejected != 2){
                                    addtask[r].set('status', 3);
                                }
                            }
                            AV.Object.saveAll(addtask).then(function(){
                                console.log('!!!!! checkTask modify task is accepted succeed');
                            })
                        });
                    }

                    // 每天晚上10点 查看领取任务的人 有没有未完成的任务 有就罚钱
                    var task_not_done = results[e].get('remainCount');//这个是未提交!!!!!!跟pending事一样的!!!!下次要改!!!!
                    if (task_not_done != 0){

                        //发布罚钱信息
                        var message = new messageLogger();
                        message.set("senderObjectId", user);
                        message.set('receiverObjectId', user);
                        message.set('category', 'Y币');
                        message.set('type', '处罚');
                        message.set('firstPara', trackName);
                        message.set('thirdPara', rate_unitPrice *  task_not_done);
                        message.set('fourthPara', task_not_done);
                        message.save();


                        // 扣除领取任务人的YB,因为任务没有做完
                        user.increment('totalMoney',  - task_not_done * rate_unitPrice);

                        //如果欠费,发布欠费消息
                        var moneyLeft = user.get('totalMoney');
                        if (moneyLeft < 0){
                            var msgNoMoney = new messageLogger();
                            msgNoMoney.set("senderObjectId", user);
                            msgNoMoney.set('receiverObjectId', user);
                            msgNoMoney.set('category', 'Y币');
                            msgNoMoney.set('type', '欠费');
                            msgNoMoney.save();
                        }

                        // 修改领取任务的信息 已过期  未提交 字段
                        var get_abandoned = results[e].get('abandoned'); // 已过期
                        var get_pending = results[e].get('pending'); // 未提交
                        results[e].set('abandoned', get_pending + get_abandoned);//过期条目等于过去的过期条目加未完成条目
                        results[e].set('pending', 0);
                        results[e].set('remainCount', 0);
                        results[e].set('completed', 1);

                    }

                    //// 每天晚上10点 任务有拒绝 但领取的用户没有再继续做 领取的用户得不到单条的钱 释放被拒绝的任务
                    var taskisReject = results[e].get('rejected'); // 找出是否有拒绝 默认为0
                    if (taskisReject != 0) {
                        // 计数修改过期的条目
                        results[e].increment('abandoned',  taskisReject);
                        results[e].set('rejected', 0);
                    }

                    // 修改流水库 因为是异步 所以封装起来 处理
                    (function (checkPendingTask, notDoTaskCount){
                        var query_journal = new AV.Query(accountJournal);
                        query_journal.equalTo('payYCoinUser', releaseTaskUser);
                        query_journal.equalTo('taskObject', task);
                        query_journal.equalTo('incomeYCoinUser', user);
                        query_journal.equalTo('payYCoinStatus', 'prepare_pay');
                        query_journal.equalTo('incomeYCoinStatus', 'prepare_income');
                        query_journal.find().then(function(result){
                            console.log(checkPendingTask);
                            console.log(notDoTaskCount);
                            for (var z = 0; z < checkPendingTask; z++){
                                var payYB = result[z].get('payYCoin'); // 支付的YB
                                var incomeYB = result[z].get('incomeYCoin'); // 得到的YB
                                var systemYB = payYB - incomeYB;  // 系统得到的

                                result[z].set('payYCoinStatus', 'payed');
                                result[z].set('incomeYCoinStatus', 'incomed');
                                result[z].set('systemYCoin', systemYB);

                            }
                            for (var f = checkPendingTask; f < notDoTaskCount + checkPendingTask; f++){
                                result[f].set('incomeYCoinStatus', 'punish_income');
                            }

                            AV.Object.saveAll(result).then(function(){
                                console.log('!!!!! checkTask  modify journal succeed');
                            })
                        });
                    })(submitted, task_not_done);


                    user.save().then(function () {
                        console.log('!!!!! checkTask receiveUser YB succeed');
                    }, function (error) {
                        console.log('----- totalMoney error');
                    });
                    results[e].set('completed', 1);

                }
                AV.Object.saveAll(results).then(function(){
                    console.log('!!! 保存领取任务里面修改内容成功 !!!')
                    response.success('checkTask success');
                })
            })
        }
        function error(){
            console.log('----- checkTask error: count error');
            response.success('checkTask error');
        }
    })
});

// 处理任务审核界面内容晚上10点后 每天10点只处理前一天的数据
function getQueryReleaseTask(){
    var date = new Date().getTime();
    var dateStr = date - 1000*60*60*24;
    var myDate = new Date(dateStr);
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth()) + 1) + '-' + myDate.getDate();
    var query = new AV.Query(releaseTaskObject);
    query.equalTo('close', false);
    query.equalTo('releaseDate', myDateStr);
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('releaseTaskTimer', function(request, response){
    var query = getQueryReleaseTask();

    query.count().then(function(count){
        var totalCount = count;

        console.log(totalCount);

        if (totalCount == 0){
            console.log('!!!!! releaseTaskTimer succeed: no task need to deal');
            response.success('releaseTaskTimer');
            return;
        }

        var remain = totalCount % 1000;
        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;

        for (var i = 0; i < totalForCount; i++){
            var query_release_task = getQueryReleaseTask();
            query_release_task.include('userObject');
            query_release_task.limit(1000);
            query_release_task.skip(i * 1000);
            query_release_task.include('userObject');
            query_release_task.include('appObject');
            query_release_task.find().then(function(results){
                for (var i = 0; i < results.length; i++){
                    //获取需要的任务数据
                    var user = results[i].get('userObject');
                    var app2 = results[i].get('appObject');
                    console.log(app2);
                    var appName = app2.get('trackName'); //任务App名称;
                    console.log(appName);

                    var rateUnitPrice = results[i].get('rateUnitPrice'); //价格

                    var excCount = parseInt(results[i].get('excCount')); //任务总数
                    var abandoned = results[i].get('abandoned'); //过期条目
                    var accepted = results[i].get('accepted'); //接受条目
                    var rejected = results[i].get('rejected'); //拒绝条目
                    var pending = results[i].get('pending'); //未完成条目
                    var submitted = results[i].get('submitted'); //待审条目


                    //生成发布人结算消息
                    if (pending != 0 || rejected != 0){
                        var message = new messageLogger();
                        message.set("senderObjectId", user);
                        message.set('receiverObjectId', user);
                        message.set('category', 'Y币');
                        message.set('type', '发布人结算');
                        console.log("saved");
                        message.set('firstPara', appName);
                        message.set('thirdPara', rateUnitPrice * (pending * 2 + rejected));
                        message.set('fourthPara', pending);
                        message.set('fifthPara', rejected);
                        message.save();
                    }

                    //处理拒绝条目
                    if  (rejected > 0){
                        abandoned = abandoned + rejected; //所有拒绝都转换为过期
                        user.increment('totalMoney', rejected * rateUnitPrice); //返还Y币
                        user.increment('freezingMoney', -rejected * rateUnitPrice);
                        rejected = 0;
                    }

                    //处理未完成条目
                    if (pending > 0){
                        abandoned = abandoned + pending; //所有未完成都转换为过期
                        user.increment('totalMoney', pending * rateUnitPrice * 2); //返还Y币和赔偿
                        user.increment('freezingMoney', -pending * rateUnitPrice);
                        pending = 0;
                    }

                    //处理待审题条目
                    if (submitted > 0){
                        accepted = accepted + submitted; //所有待审都转换为接受
                        user.increment('freezingMoney', -submitted * rateUnitPrice);
                        submitted = 0;
                    }

                    user.save().then(console.log('---- releaseTask Timer: moneyAccount has been updated'))

                    //判断任务完成情况
                    if (accepted + abandoned == excCount){
                        results[i].set('completed', 1);
                        results[i].set('close', true);
                    }

                    //更新领取任务数据库条目信息
                    results[i].set('abandoned', abandoned);
                    results[i].set('accepted', accepted);
                    results[i].set('rejected', rejected);
                    results[i].set('pending', pending);
                    results[i].set('submitted', submitted);
                }
                //for循环结束, 统一保存所有发布任务条目
                AV.Object.saveAll(results).then(function () {
                    console.log('---- releaseTaskTimer: succeed')
                    response.success('releaseTaskTimer succeed');
                }, function (error) {
                });
            })
        }
    },
        function (error) {
        console.log('----- releaseTaskTimer error: count error');
        response.success('releaseTaskTimer error');
    });
});

// 删除用户信息脚本
function remove(){
    var query = new AV.Query(IOSAppExcLogger);
    query.notEqualTo('userId', '573bce7149830c006116ad6e');
    return query;
}

AV.Cloud.define('removeRen', function(){
    var userId = '573bce7149830c006116ad6e';

    var user = new AV.User();
    user.id = userId;
    var query_IosApp = new AV.Query(IOSAppBinder);
    query_IosApp.notEqualTo('userObject', user);
    query_IosApp.limit(1000);
    query_IosApp.find().then(function(removeObject){
        console.log('AppBinder' + removeObject.length);
        //AV.Object.destroyAll(removeObject).then(function(){
        //    console.log('删除我添加的APP不是俞雷的数据成功')
        //})
    });

    var query = remove();
    query.limit(1000);
    query.find().then(function(removeExcObject){
        console.log('AppExc' + removeExcObject.length);
        //AV.Object.destroyAll(removeExcObject).then(function(){
        //    console.log('删除交换任务不是俞雷的数据成功')
        //})
    })
});

module.exports = AV.Cloud;

//var paramsJson = {
//    movie: "夏洛特烦恼"
//};
//
//AV.Cloud.run('removeRen', paramsJson, {
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

