/**
 * Created by cailong on 16/6/7.
 */
var app = angular.module('dailyTaskContent', []);

app.controller('dailyTaskControl', function($scope, $http){
    var todayUrl = 'dailyTask/daily';

    $http.get(todayUrl).success(function(response){
        $scope.dailyTask = response.myDailyApps;
    })
});