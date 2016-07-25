/**
 * Created by cailong on 16/7/20.
 */

var app = angular.module('yemaWebApp', []);

var navIndex = 2;

app.controller('myClaimControl', function($scope, $http, $location){
    $scope.noApp = true;
    var appurlList = $location.absUrl().split('/');
    var userId = appurlList[appurlList.length - 1];

    var todayUrl = '/myClaim/claim/' + userId;


    $http.get(todayUrl).success(function(response){
        $scope.dailyTask = response.myDailyApps;
        if($scope.dailyTask.length>0){
            $scope.noApp=false;

        }
    });
    $scope.copy = $location.absUrl();


    //复制链接

    $scope.url=$location.absUrl();
    $scope.copyUrl= function () {
        $('#btn').popover('toggle');
        var Url=document.getElementById("copy");
        Url.select(); // 选择对象

        document.execCommand("Copy"); // 执行浏览器复制命令



    }
});