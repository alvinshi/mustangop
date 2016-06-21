/**
 * Created by cailong on 16/6/12.
 */
var app = angular.module('yemaWebApp', []);
var navIndex = 3;
app.controller('taskDetailControl', function($scope, $http, $location){
    var appurlList = $location.absUrl().split('/');
    var appleId = appurlList[appurlList.length - 1];

    var detailUrl = 'detail' + '/' + appleId;
    $http.get(detailUrl).success(function(response){
        $scope.oneAppInfo = response.oneAppInfo;
        console.log('--------' + response.macTask);
        $scope.taskInfo = response.macTask;
        $scope.taskimages = response.taskImages;
    })
});
