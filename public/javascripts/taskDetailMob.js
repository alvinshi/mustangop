/**
 * Created by cailong on 16/6/12.
 */

var app = angular.module('taskDetailMobContent', []);
app.controller('taskDetailMobControl', function($scope, $http, $location){
    var appurlList = $location.absUrl().split('/');
    var appleId = appurlList[appurlList.length - 1];

    var detailUrl = '/taskDetail/detail' + '/' + appleId;
    $http.get(detailUrl).success(function(response){
        $scope.oneAppInfo = response.oneAppInfo;
    })
});