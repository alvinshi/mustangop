/**
 * Created by cailong on 16/5/30.
 */

var app = angular.module('myAppContent', []);
app.controller('myAppControl', function($scope, $http, $location){
    var appurlList = $location.absUrl().split('/');
    var appid = appurlList[appurlList.length - 1];
    var myappUrl = 'baseinfo/' + appid;

    $http.get(myappUrl).success(function(response){
        $scope.appBaseInfo = response.appBaseInfo;

        var historyUrl = '/myapp/history/angular/' + appid + '/' + $scope.appBaseInfo.version + '/' + -1;
        $http.get(historyUrl).success(function(response){
            $scope.appResults = response.myExcAllApps;
        });
    });


    $scope.saveTask = function(app){
        var appUrl = 'excTaskId/' + app.appObjectID;

        $scope.files;

        $http.post(appUrl, {'excKinds':app.excKinds, 'totalExcCount':app.totalExcCount}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
        })
    }

});