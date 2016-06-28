/**
 * Created by wujiangwei on 16/5/4.
 */

var AV = require('leanengine');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
    response.success('Hello world!');
});


AV.Cloud.define('refreshTask', function(request, response) {
    //1.每天早上8点,把今天之前完成的任务,都设置为已经完成
    //2.每天早上8点,把1周之前完成的任务,相关的信息删掉,只单纯保留任务信息
    response.success('refreshTask');
});

module.exports = AV.Cloud;