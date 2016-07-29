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
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(receiveTaskObject);
    query.notEqualTo('completed', 1);
    query.equalTo('receiveDate', myDateStr);
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('checkTask', function(request, response){
    var query = getRefreshQuery();

    query.count().then(function(count){
        var totalcount = count;

        console.log(totalcount);

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
                    var submitted = results[e].get('submitted');
                    if (submitted != 0){
                        // 增加 做任务人的金钱
                        var sub = AV.Object.createWithoutData('_User', user.id);
                        sub.set('remainMoney', getTaskUserMoney + submitted * taskmoney);
                        sub.set('totalMoney', getTaskUserMoney + submitted * taskmoney);
                        sub.save().then(function(){
                            console.log('!!!!! checkTask money give do task user succeed');
                        });

                        // 扣除发布任务人冻结的钱
                        var deductionrelease = AV.Object.createWithoutData('_User', releaseuser.id);
                        deductionrelease.set('freezingMoney', releaseuserYB - submitted * taskmoney);
                        deductionrelease.save().then(function(){
                            console.log('!!!!! checkTask deduction release task user money succeed');
                        });

                        results[e].set('submitted', 0); // 把任务审核显示已经审核
                        var acceptedNum = results[e].get('accepted');
                        results[e].set('accepted', acceptedNum + submitted);//新的接受条目等于过去的接受条目加上待审
                        results[e].save();

                        var releaseSubmittedNum = task.get('submitted');
                        task.set('submitted', releaseSubmittedNum - submitted); // 修改发布任务里面的待审
                        var releaseAcceptedNum = task.get('accepted');
                        task.set('accepted', releaseAcceptedNum + submitted);//修改发布任务里面的接受
                        var releaseAbandonedNum = task.get('abandoned');
                        var releaseTotal = parseInt(task.get('excCount'));
                        if (releaseAbandonedNum + releaseAcceptedNum + submitted == releaseTotal){
                            task.set('completed', 1);
                        }
                        task.save();

                        // 修改任务为已经接收
                        var targetTodoFolder = AV.Object.createWithoutData('receiveTaskObject', results[e].id);
                        var relation = targetTodoFolder.relation('mackTask');
                        var query = relation.query();
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

                        // 修改流水库
                        var query_journal = new AV.Query(accountJournal);
                        query_journal.equalTo('payYCoinUser', user);
                        query_journal.equalTo('taskObject', task);
                        query_journal.find().then(function(result){
                            for (var z = 0; z < result.length; z++){
                                var payYB = result[z].get('payYCoin'); // 支付的YB
                                var incomeYB = result[z].get('incomeYCoin'); // 得到的YB
                                var systemYB = payYB - incomeYB;  // 系统得到的
                                result[z].set('payYCoinStatus', 'payed');
                                result[z].set('incomeYCoinStatus', 'incomed');
                                result[z].set('systemYCoin', systemYB);
                            }
                            AV.Object.saveAll(result).then(function(){
                                console.log('!!!!! checkTask  modify journal succeed');
                            })
                        });

                    }

                    // 每天晚上10点 查看领取任务的人 有没有做完任务 没有做完罚钱
                    var task_not_done = results[e].get('remainCount');//这个是未提交!!!!!!跟pending事一样的!!!!下次要改!!!!
                    if (task_not_done != 0){
                        // 扣除领取任务人的YB,因为任务没有做完
                        var todo = AV.Object.createWithoutData('_User', user.id);
                        todo.set('remainMoney', getTaskUserMoney - (task_not_done * taskmoney)); // 罚钱1倍可以不用*1
                        todo.set('totalMoney', getTaskUserMoney - (task_not_done * taskmoney));
                        todo.save().then(function(){
                            console.log('!!!!! checkTask user penalty succeed');
                        },
                        function (error) {
                            console.log('----- checkTask error');
                        });

                        // 增加发布人的YB
                        var releaseUser = AV.Object.createWithoutData('_User', releaseuser.id);
                        releaseUser.set('remainMoney', releaseTaskUserMoney + (task_not_done * taskmoney));
                        releaseUser.set('totalMoney', releaseTaskUserMoney + (task_not_done * taskmoney));
                        releaseUser.save().then(function(){
                            console.log('!!!!! checkTask releaseUser YB succeed');
                        },
                        function (error) {
                            console.log('----- checkTask error');
                        });

                        // 修改领取任务的信息 已过期  未提交 字段
                        var get_abandoned = results[e].get('abandoned'); // 已过期
                        var get_pending = results[e].get('pending'); // 未提交
                        results[e].set('abandoned', get_pending + get_abandoned);//过期条目等于过去的过期条目加未完成条目
                        results[e].set('pending', 0);
                        results[e].set('remainCount', 0);
                        results[e].set('completed', 1);
                        results[e].save();

                        // 修改发布任务的信息 已过期 未提交 字段
                        (function(tempTask, tempGetPending){
                            console.log(tempTask);
                            console.log('checkTask modify taskRelease data')
                            var task_get_abandoned = tempTask.get('abandoned'); // 总的已过期
                            var task_get_pending = tempTask.get('pending'); // 总的未提交
                            tempTask.set('abandoned', task_get_abandoned + tempGetPending);
                            tempTask.set('pending', task_get_pending - tempGetPending);
                            //判断任务是否已经完成了
                            var task_get_accepted = tempTask.get('accepted');
                            var task_total = parseInt(tempTask.get('excCount'));
                            if (task_get_accepted + task_get_abandoned + get_pending == task_total){
                                tempTask.set('completed', 1);
                            }
                            tempTask.save();
                        })(task, get_pending);



                        // 修改流水库 罚钱
                        var query_account = new AV.Query(accountJournal);
                        query_account.equalTo('incomeYCoinUser', user);
                        query_account.equalTo('taskObject', task);
                        query_account.find().then(function(result){
                            for (var z = 0; z < result.length; z++){
                                result[z].set('incomeYCoinStatus', 'punish_income');
                            }
                            AV.Object.saveAll(result).then(function(){
                                console.log('!!!!! checkTask  modify punishment succeed');
                            })
                        });
                    }

                    //// 每天晚上10点 任务有拒绝 但领取的用户没有再继续做 领取的用户得不到单条的钱 释放被拒绝的任务
                    var taskisReject = results[e].get('rejected'); // 找出是否有拒绝 默认为0
                    if (taskisReject != 0) {
                        var taskAbandoned = results[e].get('abandoned');//之前过期的任务
                        results[e].set('abandoned', taskAbandoned + taskisReject);
                        results[e].set('rejected', 0);
                        results[e].save();

                        //我们这里没有更改mackTask状态.只是权宜之计.

                        var releasetask = AV.Object.createWithoutData('releaseTaskObject', task.id);
                        var taskRejected = releasetask.get('rejected');
                        releasetask.set('rejected', taskRejected - taskisReject); //拒绝条目减
                        var task_Abandoned = releasetask.get('abandoned');
                        releasetask.set('abandoned', task_Abandoned + taskisReject); //过期条目加
                        var taskAccepted = releasetask.get('accepted');
                        var taskTotal = parseInt(releasetask.get('excCount'));
                        if (taskAccepted + task_Abandoned + taskisReject == taskTotal) {
                            releasetask.set('completed', 1);
                        }
                        releasetask.save();

                        //需要把钱返回给发布者
                        var taskOwner = AV.Object.createWithoutData('_User', releaseuser.id);
                        taskOwner.set('remainMoney', releaseTaskUserMoney + (taskisReject * taskmoney));
                        taskOwner.set('totalMoney', releaseTaskUserMoney + (taskisReject * taskmoney));
                        taskOwner.save().then(function () {
                                console.log('!!!!! checkTask releaseUser YB succeed');
                            },
                            function (error) {
                                console.log('----- checkTask error');
                            });
                    }
                    results[e].set('completed', 1);
                    results[e].save();
                }
            })
        }
        function error(){
            console.log('----- checkTask error: count error');
        }
    })
});

// 处理任务审核界面内容晚上10点后 不显示
function getQueryReleaseTask(){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('close', false);
    //query.equalTo('releaseDate', myDateStr);
    query.equalTo('completed', 1);
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('closeCheckTask', function(request, response){
    var query = getQueryReleaseTask();

    query.count().then(function(count){
        var totalCount = count;

        console.log(totalCount);

        if (totalCount == 0){
            console.log('!!!!! closeCheckTask succeed: no task need to deal');
            response.success('closeCheckTask');
            return;
        }

        var remain = totalCount % 1000;
        var totalForCount = totalCount/1000 + remain > 0 ? 1 : 0;

        for (var i = 0; i < totalForCount; i++){
            var query_release_task = getQueryReleaseTask();
            query_release_task.include('userObject');
            query_release_task.limit(1000);
            query_release_task.skip(i * 1000);
            query.find().then(function(results){
                for (var e = 0; e < results.length; e++){
                    results[e].set('close', true);
                }
                AV.Object.saveAll(results).then(function(){
                    console.log('!!!!! closeCheckTask close succeed')
                },
                    function (error){
                        console.log('----- closeCheckTask error');
                });
            })
        }
    },
        function (error) {
        console.log('----- closeCheckTask error: count error');
    });
});

module.exports = AV.Cloud;


//var paramsJson = {
//    movie: "夏洛特烦恼"
//};
//AV.Cloud.run('checkTask', paramsJson, {
//    success: function(data) {
//        // 调用成功，得到成功的应答data
//    },
//    error: function(err) {
//        // 处理调用失败
//    }
//});

