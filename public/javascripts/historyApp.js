/**
 * Created by wujiangwei on 16/5/13.
 */
var app=angular.module('historyApp',['ngSanitize']);

app.controller('historyAppCtrl', function($scope, $http) {

    $scope.pageIndex = 0;
    $scope.progressNum = 0;
    $scope.hasMore = 0;

    $scope.isLoadingMyApp = true;

    console.log('loading historyApp.js');

    var appsUrl = '/myapp/angular';
    $http.get(appsUrl).success(function(response){
        $scope.myApps = response.myApps;

        $scope.isLoadingMyApp = false;

        if ($scope.myApps.length > 0){
            $scope.selectedApp = $scope.myApps[0];
            $scope.selectedApp.isSelected = true;


            var historyUrl = '/myapp/history/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version + '/' + $scope.pageIndex;
            $http.get(historyUrl).success(function(response){
                $scope.myExcAllApps = response.myExcAllApps;
                $scope.hasMore = response.hasMore;
                //console.log($scope.myExcAllApps);
            });
        }else {
            //
        }

    }).error(function(error){
        console.log('error' + error);
        $scope.isLoadingMyApp = false;
    });

    $scope.nextPage = function(){
        $scope.pageIndex = $scope.pageIndex + 20;
        var historyUrl = '/myapp/history/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version + '/' + $scope.pageIndex;
        $http.get(historyUrl).success(function(response){
            $scope.hasMore = response.hasMore;
            $scope.myExcAllApps = $scope.myExcAllApps.concat(response.myExcAllApps);
            //console.log($scope.myExcAllApps);
        });
    };

    $scope.selectedAppFunc = function(appleId){

        console.log('selected' +  appleId);

        for (var i = 0; i < $scope.myApps.length; i++){
            var tempApp = $scope.myApps[i];
            if (tempApp.appleId == appleId){
                $scope.selectedApp.isSelected = false;

                $scope.selectedApp = tempApp;
                $scope.selectedApp.isSelected = true;
                break;
            }
        }

        $scope.pageIndex = 0;
        var historyUrl = '/myapp/history/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version + '/' + $scope.pageIndex;
        $http.get(historyUrl).success(function(response){
                $scope.myExcAllApps = response.myExcAllApps;
            //console.log($scope.myExcAllApps);
        });
    };

    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){
            var searchUrl = '/api/itunes/search/' + $scope.searchKey;
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
        $scope.isError = 0;

        if ($scope.searchUrl != ''){

            var searchUrl = '/api/itunes/search/' + $scope.searchKey;

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
                }

                //console.log($scope.appResults);
            });
        }
    };

    $scope.keySearchApp = function(e){
        var keycode = window.event?e.keyCode:e.which;
        //console.log('keycode ' + keycode);
        //enter or space
        if(keycode==13 || keycode==32){
            $scope.searchHistoryApp();
        }
    };

    //TODO: not support now
    $scope.searchHistory = function(){
        if ($scope.searchHisKey != ''){

            for (var i = 0; i < $scope.myExcAllApps.length; i++){
                //name contain search match
            }
        }
    };

    $scope.addAppHistory = function(){
        var addHistoryHtmlUrl = '/myapp/addHistory/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version;
        location.href = addHistoryHtmlUrl;
    }

    $scope.addHistory = function(hisAppInfo){

        console.log('-----* ' + location.href);

        //var addHistoryUrl = '/myapp/history/add';
        var addHistoryUrl = location.href;

        var postParam = {'hisAppInfo' : hisAppInfo};
        console.log('add history' + postParam);
        $http.post(addHistoryUrl, postParam).success(function(response){

            $scope.isError = response.errorId;
            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){

                if ($scope.myExcAllApps == undefined){
                    $scope.myExcAllApps = new Array();
                }

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