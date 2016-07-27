/**
 * Created by wujiangwei on 16/5/4.
 */

var AV = require('leanengine');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var User = AV.Object.extend('_User');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表

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

// 新版本审核定时器
function getRefreshQuery(){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate() +
         '-' + myDate.getHours() + '-' + myDate.getMinutes() + '-' + myDate.getSeconds();

    var query = new AV.Query(receiveTaskObject);
    query.notEqualTo('completed', 1);
    //query.lessThan('createdAt', myDateStr);
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('checkTask', function(request, response){
    var query = getRefreshQuery();

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
            var query_a = getRefreshQuery();
            query_a.include('userObject');
            query_a.include('taskObject');
            query_a.include('taskObject.userObject');
            query_a.limit(1000);
            query_a.skip(i * 1000);
            query_a.find().then(function(results){ // 查找出所有没有完成的任务
                for (var e = 0; e < results.length; e++){
                    var task = results[e].get('taskObject'); // 领取任务的id
                    var user = results[e].get('userObject'); // 领取任务的用户
                    var taskmoney = task.get('rateUnitPrice'); // 任务的单价
                    var getTaskUserMoney = user.get('totalMoney'); // 领取任务的用户钱
                    var releaseuser = task.get('userObject');  // 发布任务的用户
                    var releaseTaskUserMoney = releaseuser.get('totalMoney'); // 发布任务的总钱
                    var releaseuserYB = releaseuser.get('freezingMoney'); // 发布任务者冻结的钱

                    // 每天10点 做任务人提交了任务 发布者未审核 钱付给做任务者
                    var acceptedCount = results[e].get('accepted'); // 发布任务者接收了几条
                    var userreleaseCount = results[e].get('receiveCount'); // 用户领取条数
                    var userrejectedCount = results[e].get('rejected'); // 发布者拒绝的条数

                    //var submitted = results[e].get('submitted');
                    //if (submitted != 0){
                    //    // 增加 做任务人的金钱
                    //    var sub = AV.Object.createWithoutData('_User', user.id);
                    //    sub.set('remainMoney', getTaskUserMoney + submitted * taskmoney);
                    //    sub.set('totalMoney', getTaskUserMoney + submitted * taskmoney);
                    //    sub.save().then(function(){
                    //        console.log('!!!!! checkTask money give do task user succeed');
                    //    });
                    //
                    //    // 扣除发布任务人冻结的钱
                    //    var deductionrelease = AV.Object.createWithoutData('_User', releaseuser.id);
                    //    deductionrelease.set('freezingMoney', releaseuserYB - submitted * taskmoney);
                    //    deductionrelease.save().then(function(){
                    //        console.log('!!!!! checkTask deduction release task user money succeed');
                    //    });
                    //
                    //    results[e].set('submitted', 0); // 把任务审核显示已经审核
                    //    results[e].save();
                    //
                    //    task.set('submitted', 0); // 修改发布任务里面的审核
                    //    task.save();
                    //
                    //    // 修改任务为已经接收
                    //    var targetTodoFolder = AV.Object.createWithoutData('receiveTaskObject', results[e].id);
                    //    var relation = targetTodoFolder.relation('mackTask');
                    //    var query = relation.query();
                    //    query.find().then(function(addtask){
                    //        for (var r = 0; r < addtask.length; r++){
                    //            var rejected = addtask[r].get('status');
                    //            if (rejected != 2){
                    //                addtask[r].set('status', 3);
                    //            }
                    //        }
                    //        AV.Object.saveAll(addtask).then(function(){
                    //            console.log('!!!!! checkTask modify task is accepted succeed');
                    //        })
                    //    })
                    //
                    //}
                    //
                    //// 修改流水库
                    //var query_journal = new AV.Query(accountJournal);
                    //query_journal.equalTo('incomeYCoinUser', user);
                    //query_journal.equalTo('taskObject', task);
                    //query_journal.find().then(function(result){
                    //    for (var z = 0; z < result.length; z++){
                    //        var payYB = result[z].get('payYCoin'); // 支付的YB
                    //        var incomeYB = result[z].get('incomeYCoin'); // 得到的YB
                    //        var systemYB = payYB - incomeYB;  // 系统得到的
                    //        result[z].set('payYCoinStatus', 'payed');
                    //        result[z].set('incomeYCoinStatus', 'incomed');
                    //        result[z].set('systemYCoin', systemYB);
                    //    }
                    //    AV.Object.saveAll(result).then(function(){
                    //        console.log('!!!!! checkTask  modify journal succeed');
                    //    })
                    //});

                    // 每天晚上10点 查看领取任务的人 有没有做完任务 没有做完罚钱
                    //var task_not_done = results[e].get('remainCount');
                    //if (task_not_done != 0){
                    //    // 扣除领取任务人的YB,因为任务没有做完
                    //    var todo = AV.Object.createWithoutData('_User', user.id);
                    //    todo.set('remainMoney', getTaskUserMoney - (task_not_done * taskmoney)); // 罚钱1倍可以不用*1
                    //    todo.set('totalMoney', getTaskUserMoney - (task_not_done * taskmoney));
                    //    todo.save().then(function(){
                    //        console.log('!!!!! checkTask user penalty succeed');
                    //    },
                    //    function (error) {
                    //        console.log('----- checkTask error');
                    //    });
                    //
                    //    // 增加发布人的YB
                    //    var releaseUser = AV.Object.createWithoutData('_User', releaseuser.id);
                    //    releaseUser.set('remainMoney', releaseTaskUserMoney + (task_not_done * taskmoney));
                    //    releaseUser.set('totalMoney', releaseTaskUserMoney + (task_not_done * taskmoney));
                    //    releaseUser.save().then(function(){
                    //        console.log('!!!!! checkTask releaseUser YB succeed');
                    //    },
                    //    function (error) {
                    //        console.log('----- checkTask error');
                    //    });
                    //}

                    //// 每天晚上10点 任务有拒绝 但领取的用户没有再继续做 领取的用户得不到单条的钱 释放被拒绝的任务
                    var taskisReject = results[e].get('rejected'); // 找出是否有拒绝 默认为0
                    var remaincount = parseInt(task.get('remainCount'));
                    var remainCount = remaincount + 1;
                    if (taskisReject != 0){
                        var releasetask = AV.Object.createWithoutData('releaseTaskObject', task.id);
                        releasetask.set('remainCount', remainCount + '');
                        releasetask.save().then(function(){
                            console.log('!!!!! checkTask task released succeed');
                        })
                    }function error(){
                        console.log('----- checkTask error: count error');
                    }

                }

            })
        }
        function error(){
            console.log('----- checkTask error: count error');
        }
    })
});

module.exports = AV.Cloud;


var paramsJson = {
    movie: "夏洛特烦恼"
};
AV.Cloud.run('checkTask', paramsJson, {
    success: function(data) {
        // 调用成功，得到成功的应答data
    },
    error: function(err) {
        // 处理调用失败
    }
});

