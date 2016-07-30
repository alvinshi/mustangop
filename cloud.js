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

// 处理任务审核界面内容晚上10点后 不显示
function getQueryReleaseTask(){
    var query = new AV.Query(releaseTaskObject);
    query.equalTo('close', false);
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
            query.find().then(function(results){
                for (var i = 0; i < results.length; i++){
                    //获取需要的任务数据
                    var user = results[i].get('userObject');

                    var rateUnitPrice = results[i].get('rateUnitPrice'); //价格

                    var excCount = parseInt(results[i].get('excCount')); //任务总数
                    var abandoned = results[i].get('abandoned'); //过期条目
                    var accepted = results[i].get('accepted'); //接受条目
                    var rejected = results[i].get('rejected'); //拒绝条目
                    var pending = results[i].get('pending'); //未完成条目
                    var submitted = results[i].get('submitted'); //待审条目

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
                }, function (error) {
                });
            })
        }
    },
        function (error) {
        console.log('----- releaseTaskTimer error: count error');
    });
});

module.exports = AV.Cloud;


var paramsJson = {
    movie: "夏洛特烦恼"
};

AV.Cloud.run('releaseTaskTimer', paramsJson, {
    success: function(data) {
        // 调用成功，得到成功的应答data
    },
    error: function(err) {
        // 处理调用失败
    }
});

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

