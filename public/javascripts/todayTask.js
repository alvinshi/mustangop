/**
 * Created by cailong on 16/6/7.
 */
var app = angular.module('yemaWebApp', []);

app.controller('dailyTaskControl', function($scope, $http, $location){

    var appurlList = $location.absUrl().split('/');
    var userId = appurlList[appurlList.length - 1];

    var todayUrl = '/dailyTask/daily/' + userId;

    $http.get(todayUrl).success(function(response){
        $scope.dailyTask = response.myDailyApps;
    })
});