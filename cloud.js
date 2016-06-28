/**
 * Created by wujiangwei on 16/5/4.
 */

var AV = require('leanengine');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
    response.success('Hello world!');
});


AV.Cloud.define('refreshTask', function(request, response) {
    //1.每天早上8点,把今天之前完成的任务,都设置为已经完成
    //2.每天早上8点,把1周之前完成的任务,相关的信息删掉,只单纯保留任务信息
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(IOSAppExcLogger);
    query.notContainedIn('excDateStr', myDateStr);
    query.exists('requirementImg');
    query.exists('totalExcCount');
    query.exists('excKinds');
    query.find().then(function(result){
        for (var i = 0; i < result.length; i++){
            var totalCount = result[i].get('totalExcCount');
            var addTaskCount = result[i].get('taskCount');
            var SurplusCount = totalCount - addTaskCount;
            if (SurplusCount == 0){
                result.splice(SurplusCount)
            }
        }
    });

    console.log('Log in timer.');
    response.success('refreshTask');
});

module.exports = AV.Cloud;