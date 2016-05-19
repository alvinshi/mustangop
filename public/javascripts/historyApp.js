/**
 * Created by wujiangwei on 16/5/13.
 */
var app=angular.module('historyApp',[]);

app.controller('historyAppCtrl', function($scope, $http) {

    //TODO: more my app?
    var historyUrl = '/myapp/history/angular';
    $http.get(historyUrl).success(function(response){
        $scope.myExcAllApps = response.myExcAllApps;
        console.log($scope.myExcAllApps);
    });

    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = '/api/itunes/search/' + $scope.searchKey;

            console.log(searchUrl);
            $http.get(searchUrl).success(function(response){
                $scope.appResults = response.appResults;
            });
        }
    };

    var oldhistoryUrl = '/myapp/historys/angular';
    $http.get(oldhistoryUrl).success(function(response){
        $scope.myHistoryApps = response.myHistoryApps;
        console.log($scope.myHistoryApps);
    });

    //搜索iTunes
    $scope.searchHistoryApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = '/api/itunes/search/' + $scope.searchKey;

            console.log(searchUrl);
            $http.get(searchUrl).success(function(response){
                $scope.appResults = response.appResults;

                for (var i = 0; i < $scope.appResults.length; i++){
                    var appRe = $scope.appResults[i];

                    appRe.isExced = false;
                    for (var j = 0; j < $scope.myExcAllApps.length; j++){
                        var appExRe = $scope.myExcAllApps[j];
                        if (appRe.appleId === appExRe.appleId){
                            appRe.isExced = true;
                            console.log(appRe.appleId + 'is exchanged');
                            break;
                        }
                    }
            }

                console.log($scope.appResults);
            });


        }
    };

    var appsUrl = '/myapp/angular';
    $http.get(appsUrl).success(function(response){
        $scope.myApps = response.myApps;
        $scope.selectedApp = $scope.myApps[0];
    });

    //TODO: not support now
    $scope.searchHistory = function(){
        if ($scope.searchHisKey != ''){

            for (var i = 0; i < $scope.myExcAllApps.length; i++){
                //name contain search match
            }
        }
    };

    $scope.addHistory = function(hisAppInfo){

        var addHistoryUrl = '/myapp/history/add';

        var myAppId = $scope.selectedApp.appleId;
        var myAppVersion = $scope.selectedApp.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
                        'hisAppInfo' : hisAppInfo};
        console.log('add history' + postParam);
        $http.post(addHistoryUrl, postParam).success(function(response){

            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){

                //change ui
                for (var i = 0; i < $scope.appResults.length; i++){
                    var appRe = $scope.appResults[i];

                    if (appRe.appleId === hisAppInfo.appleId){
                        appRe.isExced = true;
                        console.log(appRe.appleId + 'is exchanged');
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }

        });
    };

    $scope.releaseHistory = function(appid, appversion){
        var releaseHistoryUrl = '/myapp/history/delete';

        var myAppId = $scope.selectedApp.appleId;
        var myAppVersion = $scope.selectedApp.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
            'hisAppId' : appid, 'hisAppVersion' : appversion};
        //console.log('add history' + postParam);

        $http.post(releaseHistoryUrl, postParam).success(function(response){
            if (response.errorId == 0){
                console.log('remove app if');

                if ($scope.appResults != undefined){
                    //change ui
                    for (var q = 0; q < $scope.appResults.length; q++){
                        var appRe = $scope.appResults[q];

                        if (appRe.appleId === appid){
                            appRe.isExced = false;
                            console.log(appRe.appleId + 'is exchanged');
                            break;
                        }
                    }
                }

                //other thing
                for (var i = 0; i < $scope.myExcAllApps.length; i++){
                    var app = $scope.myExcAllApps[i];
                    if (app.appleId == appid){
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

        });
    };
});