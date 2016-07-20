/**
 * Created by wujiangwei on 16/5/9.
 */


var app = angular.module('yemaWebApp', []);

var navIndex = 1;


app.controller('itunesSearchControl', function($scope, $http) {

    //$scope.isError = 0;
    $scope.selectMyAppIndex=0;
    var appsUrl = 'myapp/angular';
    $scope.isLoadingMyApp = true;

    var progressTimerHandle = undefined;
    $scope.progressNum = 0;

    $http.get(appsUrl).success(function(response){
        $scope.isLoadingMyApp = false;
        $scope.myApps = response.myApps;

        if ($scope.myApps.length > 0){
            $scope.selectedApp = $scope.myApps[0];
            var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
            if (myAppElemment != undefined){
                myAppElemment.style.border = '2px solid #3498db';
                console.log($scope.myExcAllApps);
            }
        }

        var getneedUrl = '/myapp/getNeed/' + $scope.selectedApp.appleId;
        $http.get(getneedUrl).success(function(response){
            $scope.appNeedInfo = response.appNeedInfo;
        });
    });

    $scope.searchApp = function(){
        $scope.isError = 0;

        if ($scope.searchUrl != ''){

            var searchUrl = 'api/itunes/search/' + $scope.searchKey;
            $scope.progressNum = 100;
            //timer
            if (progressTimerHandle != undefined){
                //clearTimeout(progressTimerHandle);
            }

            //progressTimerHandle = setTimeout(timerFunc(), 1);

            console.log('--------- searchApp searchApp');

            $http.get(searchUrl).success(function(response){

                console.log('searchApp' + response);

                $scope.appResults = response.appResults;
                $scope.progressNum = 0;

                if (response.errorMsg.length > 0){
                    $scope.isError = 1;
                    $scope.errorMsg = response.errorMsg;
                }else {
                    $scope.errorMsg = '';
                    if ($scope.appResults.length == 0){
                        $scope.isError = 1;
                        $scope.errorMsg = '未找到你搜索的App,请尝试输入它的全称';
                    }

                    for (var i = 0; i < $scope.appResults.length; i++){
                        var appRe = $scope.appResults[i];

                        appRe.isMine = false;
                        for (var j = 0; j < $scope.myApps.length; j++){
                            var myApp = $scope.myApps[j];
                            if (myApp.appleId === appRe.appleId){
                                appRe.isMine = true;
                                console.log(appRe.appleId + 'isMine');
                                break;
                            }
                        }
                    }
                }
            });
        }
    };

    $scope.keySearchApp = function(e){
        var keycode = window.event?e.keyCode:e.which;
        //console.log('keycode ' + keycode);
        //enter or space
        if(keycode==13 ){
            $scope.searchApp();
        }
    };

    $scope.chooseMyApp = function(appInfo){
        //$cookieStore.get("name") == "my name";

        var searchUrl = 'myapp/add';

        console.log(appInfo);
        $http.post(searchUrl, {'appInfo':appInfo}).success(function(response){

            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){
                var flag = 0;

                if ($scope.myApps == undefined){
                    $scope.myApps = new Array();
                }

                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appInfo.appleId){
                        flag = 1;
                        break;
                    }
                }

                if (flag == 0){
                    console.log('add app to ui');
                    //第一个不是最后一个
                    $scope.myApps.push(response.newApp);
                }
                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }
            //location.href='/app/' + appInfo.appleId;
            //location.href="/myApp";

            $scope.appResults = [];
        });
    };

    $scope.releaseBtnClick = function(appid){
        $scope.prepareReleaseAppid = appid;

    };

    $scope.releaseMyApp = function(){
        var searchUrl = 'myapp/delete';
        var appid = $scope.prepareReleaseAppid;
        console.log('releaseMyApp' + appid);
        $http.post(searchUrl, {'appid':appid}).success(function(response){
            if (response.errorId == 0){
                console.log('remove app if');
                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid){
                        console.log('remove app to ui');
                        $scope.myApps.splice(i, 1);
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                console.log('remove app else');
                $scope.errorMsg = response.errorMsg;
            }

            $scope.appResults = [];
        });
    };

    $scope.saveNeed = function(){
        var needUrl = '/myapp/taskneed/' + $scope.selectedApp.appleId;
        var needInfo = {'taskType':$scope.appNeedInfo.taskType, 'excCount':$scope.appNeedInfo.excCount, 'excUnitPrice':$scope.appNeedInfo.excUnitPrice, 'screenshotCount':$scope.appNeedInfo.screenshotCount,
            'searchKeyword':$scope.appNeedInfo.searchKeyword, 'ranKing':$scope.appNeedInfo.ranKing, 'Score':$scope.appNeedInfo.Score,
            'titleKeyword':$scope.appNeedInfo.titleKeyword, 'commentKeyword':$scope.appNeedInfo.commentKeyword, 'detailRem':$scope.appNeedInfo.detailRem};
        $http.post(needUrl, needInfo).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
        })
    };

    $scope.releaseTask = function(){
        var needUrl = '/myapp/task/' + $scope.selectedApp.appleId;
        var needInfo = {'taskType':$scope.appNeedInfo.taskType, 'excCount':$scope.appNeedInfo.excCount,
            'excUnitPrice':document.getElementById("price").value, 'screenshotCount':$scope.appNeedInfo.screenshotCount,
            'searchKeyword':$scope.appNeedInfo.searchKeyword, 'ranKing':$scope.appNeedInfo.ranKing,
            'Score':$scope.appNeedInfo.Score, 'titleKeyword':$scope.appNeedInfo.titleKeyword,
            'commentKeyword':$scope.appNeedInfo.commentKeyword, 'detailRem':$scope.appNeedInfo.detailRem,
            'appObjectId':$scope.selectedApp.appObjectId};

        $http.post(needUrl, needInfo).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
        })
    };

    //验证表单
    $scope.color={
        "color" :"#3498db",
        "font-size":"14px"
    };


    $scope.setValue1=function(){
    document.getElementById("price").value="30"
    }
    $scope.setValue2=function(){
        document.getElementById("price").value="25"
    };



    //限制表单字数
    $scope.checkText1 = function () {
        if ($scope.appNeedInfo.titleKeyword.length > 20) {
            $scope.appNeedInfo.titleKeyword = $scope.appNeedInfo.titleKeyword.substr(0, 20);
        }
    };
    $scope.checkText2 = function () {
        if ($scope.appNeedInfo.commentKeyword.length > 40) {
            $scope.appNeedInfo.commentKeyword = $scope.appNeedInfo.commentKeyword.substr(0, 40);
        }
    };
    $scope.checkText3 = function () {
        if ($scope.appNeedInfo.detailRem.length > 140) {
            $scope.appNeedInfo.detailRem = $scope.appNeedInfo.detailRem.substr(0, 140);
        }
    };


    $scope.selectMyAppIndex = 0;
    $scope.selectedAppFunc = function(appleId){

    console.log('selected' +  appleId);

        //remove border in old
        var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
        myAppElemment.style.border = '2px solid #e0e0e0';
        for (var i = 0; i < $scope.myApps.length; i++){
            var tempApp = $scope.myApps[i];
            if (tempApp.appleId == appleId){

                $scope.selectedApp = tempApp;
                $scope.selectMyAppIndex = i;
                //$scope.selectedApp.isSelected = true;
                break;
            }
        }

        //add border in new
        myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
        myAppElemment.style.border = '2px solid black';
    }

    // 验证钱够不够发布任务
    $scope.myFunc = function(){
        var taskMoney = $scope.appNeedInfo.excCount * document.getElementById("price").value;

        var url = 'myapp/verify';
        $http.post(url, {'taskMoney':taskMoney}).success(function(response){
            $scope.error = response.Error
        })
    }

});

