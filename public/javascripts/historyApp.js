/**
 * Created by wujiangwei on 16/5/13.
 */
var app=angular.module('historyApp',['ngSanitize']);

app.controller('historyAppCtrl', function($scope, $http, $location) {

    $scope.pageIndex = 0;
    $scope.progressNum = 0;
    $scope.hasMore = 0;
    $scope.selectMyAppIndex = 0;

    $scope.isLoadingMyApp = true;

    console.log('loading historyApp.js');

    console.log($location.absUrl());
    var webUrl = $location.absUrl();
    if (webUrl.indexOf('addHistory') == -1){
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

                    var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
                    if (myAppElemment != undefined){
                        myAppElemment.style.border = '2px solid #3498db';
                        console.log($scope.myExcAllApps);
                    }
                });

                var oldhistoryUrl = '/myapp/oldhistory/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version;
                $http.get(oldhistoryUrl).success(function(response){
                    $scope.myHistoryApps = response.myHistoryApps;
                    //console.log($scope.myHistoryApps);
                });

            }else {
                //
            }

        }).error(function(error){
            console.log('error' + error);
            $scope.isLoadingMyApp = false;
        });
    }

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

        //remove border in old
        var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
        myAppElemment.style.border = '2px solid gray';

        for (var i = 0; i < $scope.myApps.length; i++){
            var tempApp = $scope.myApps[i];
            if (tempApp.appleId == appleId){
                $scope.selectedApp.isSelected = false;

                $scope.selectedApp = tempApp;
                $scope.selectMyAppIndex = i;
                //$scope.selectedApp.isSelected = true;
                break;
            }
        }

        //add border in new
        myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
        myAppElemment.style.border = '2px solid #3498db';

        $scope.pageIndex = 0;
        var historyUrl = '/myapp/history/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version + '/' + $scope.pageIndex;
        $http.get(historyUrl).success(function(response){
                $scope.myExcAllApps = response.myExcAllApps;
            //console.log($scope.myExcAllApps);
        });

        var oldhistoryUrl = '/myapp/oldhistory/angular/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version;
        $http.get(oldhistoryUrl).success(function(response){
            $scope.myHistoryApps = response.myHistoryApps;
            //console.log($scope.myHistoryApps);
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

    //搜索iTunes
    $scope.searchHistoryApp = function(){
        $scope.isError = 0;

        if ($scope.searchUrl != ''){

            var searchUrl = $location.absUrl() + '/' + $scope.searchKey;

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

    //$scope.searchLocalHistoryApp = function(){
    //    if ($scope.searchUrl != ''){
    //        var searchUrl = '/myapp/historySearch/angular/' + $scope.searchkey;
    //        $http.get(searchUrl).success(function(response){
    //
    //            console.log('searchLocalHistoryApp ' + response.myTotalApps);
    //            $scope.myTotalApps = response.myTotalApps;
    //
    //        });
    //    }
    //};

    $scope.keySearchApp = function(e){
        var keycode = window.event?e.keyCode:e.which;
        //console.log('keycode ' + keycode);
        //enter or space
        if(keycode==13 || keycode==32){
            $scope.searchHistoryApp();
        }
    };

    $scope.addAppHistory = function(){
        var addHistoryHtmlUrl = '/myapp/addHistory/' + $scope.selectedApp.appleId + '/' + $scope.selectedApp.version;
        location.href = addHistoryHtmlUrl;
    };

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

    //删除当前交换记录
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

    //删除以往交换记录
    $scope.History = function(appid, appversion){
        var HistoryUrl = '/myapp/oldhistory/delete';

        var myAppId = $scope.selectedApp.appleId;
        var myAppVersion = $scope.selectedApp.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
            'hisAppId' : appid, 'hisAppVersion' : appversion};

        $http.post(HistoryUrl, postParam).success(function(response){
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
                for (var i = 0; i < $scope.myHistoryApps.length; i++){
                    var app = $scope.myHistoryApps[i];
                    if (app.appleId == appid){
                        console.log('remove app to ui');
                        $scope.myHistoryApps.splice(i, 1);
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