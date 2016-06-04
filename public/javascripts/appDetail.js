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
            $scope.myExcAllApps = response.myExcAllApps;
        });

        //搜索iTunes
        $scope.searchHistoryApp = function(){
            $scope.isError = 0;

            if ($scope.searchUrl != ''){

                var searchUrl = '/myapp/addHistory/' + appid + '/' + $scope.appBaseInfo.version + '/' + $scope.searchKey;

                $scope.progressNum = 100;

                $http.get(searchUrl).success(function(response){

                    console.log(response);

                    $scope.appResults = response.appResults;

                    $scope.progressNum = 0;

                    if (response.errorMsg.length > 0){
                        $scope.isError = 1;
                        $scope.errorMsg = response.errorMsg;
                    }else {
                        $scope.errorMsg = '';
                        if ($scope.appResults.length == 0){
                            $scope.isError = 1;
                            $scope.errorMsg = '未找到你搜索的App';
                        }
                    }

                    //console.log($scope.appResults);
                });
            }
        };

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