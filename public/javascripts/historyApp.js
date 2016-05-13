/**
 * Created by wujiangwei on 16/5/13.
 */
var app=angular.module('historyApp',[]);

app.controller('historyAppCtrl', function($scope, $http) {

    //搜索iTunes
    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = '/api/itunes/search/' + $scope.searchKey;

            console.log(searchUrl);
            $http.get(searchUrl).success(function(response){
                $scope.appResults = response.appResults;
            });
        }
    };

    var appsUrl = '/myapp/angular';
    $http.get(appsUrl).success(function(response){
        $scope.myApps = response.myApps;

        //多个App时,增加历史记录需要选择
        if ($scope.myApps.length < 1){
            //location
        }else {
            $scope.selectedApp = $scope.myApps[0];
        }
    });

    $scope.selectedApp = function(index){
        //TODO: refresh history area
        $scope.selectedApp = $scope.myApps[index];

        //TODO: All history logic
        var historyUrl = '/myapp/history/angular/' + $scope.selectedApp.appleId;
        $http.get(historyUrl).success(function(response){
            $scope.myExcAllApps = response.myExcAllApps;
        });
    };

    //TODO: more my app?
    var historyUrl = '/myapp/history/angular';
    $http.get(historyUrl).success(function(response){
        $scope.myExcAllApps = response.myExcAllApps;
    });

    //TODO: not support now
    $scope.searchHistory = function(){
        if ($scope.searchHisKey != ''){

            for (var i = 0; i < $scope.myExcAllApps.length; i++){
                //name contain search match
            }
        }
    };

    $scope.addHistory = function(appid, appversion){

        var addHistoryUrl = '/myapp/history/add';

        var myAppId = $scope.selectedApp.appleId;
        var myAppVersion = $scope.selectedApp.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
                        'hisAppId' : appid, 'hisAppVersion' : appversion};
        console.log('add history' + postParam);
        $http.post(addHistoryUrl, postParam).success(function(response){

            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){
                var flag = 0;
                for (var i = 0; i < $scope.myExcAllApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid && app.version == appversion){
                        flag = 1;
                        break;
                    }
                }

                if (flag == 0){
                    console.log('add app to ui');
                    $scope.myExcAllApps.push(response.newApp);
                }
                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }

            $scope.appResults = [];
        });
    };

    $scope.releaseHistory = function(appid, appversion){
        var releaseHistoryUrl = '/myapp/history/delete';

        var myAppId = $scope.selectedApp.appleId;
        var myAppVersion = $scope.selectedApp.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
            'hisAppId' : appid, 'hisAppVersion' : appversion};
        console.log('add history' + postParam);

        $http.post(releaseHistoryUrl, postParam).success(function(response){
            if (response.errorId == 0){
                console.log('remove app if');
                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid && app.version == appversion){
                        console.log('remove app to ui');
                        $scope.myExcAllApps.splice(i, 1);
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                console.log('remove app else');
                $scope.errorMsg = response.errorMsg;
            }

            //$scope.appResults = [];
        });
    };

});