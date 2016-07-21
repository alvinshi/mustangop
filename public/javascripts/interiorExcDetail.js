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
    })
});