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

function getRefreshTaskQuery(){
    var myDate = new Date();

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('remainCount', 0);
    query.equalTo('taskStatus', 0);
    query.lessThan('createdAt', myDate);
    query.exists('requirementImg');
    query.exists('totalExcCount');
    query.exists('excKinds');
    query.descending('createdAt');
    return query;
}

AV.Cloud.define('refreshTask', function(request, response) {

    var query = getRefreshTaskQuery();
    var totalCount = query.count();
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
                if (i == totalForCount - 1){
                    console.log('!!!!! refreshTask succeed');
                    response.success('refreshTask');
                }
            }, function (error) {
                console.log('----- refreshTask error');
            });
        });
    }
});

module.exports = AV.Cloud;