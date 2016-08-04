/**
 * Created by cailong on 16/7/21.
 */

var app = angular.module('yemaWebApp', []);
var navIndex = 2;

app.controller('interorDetailControl',function($scope, $http, $location){
    var appurlList = $location.absUrl().split('/');
    var excTaskId = appurlList[appurlList.length - 1];

    var Url = 'interior' + '/' + excTaskId;
    $http.get(Url).success(function(response){
        $scope.oneAppInfo = response.oneAppInfo;
        console.log('--------' + response.macTask);
        $scope.taskInfo = response.macTask;

        for (var i = 0; i < response.macTask.length; i++){
            // 判断任务的状态
            if (response.macTask[i].status == 'uploaded' || response.macTask[i].status == 'reUploaded'){
                response.macTask[i].status = '待审'
            }else if (response.macTask[i].status == 'rejected' || response.macTask[i].status == "refused"){
                response.macTask[i].status = '拒绝'
            }else if (response.macTask[i].status == 'accepted' || response.macTask[i].status == 'systemAccepted'){
                response.macTask[i].status = '已完成'
            }else {
                response.macTask[i].status = ''
            }
        }
    })
});