/**
 * Created by wujiangwei on 16/5/9.
 */


var app = angular.module('yemaWebApp', []);

var navIndex = 1;


app.controller('itunesSearchControl', function($scope, $http) {

    //$scope.isError = 0;
    var appsUrl = 'myapp/angular';
    $scope.selectMyAppIndex=0;
    $scope.isLoadingMyApp = true;

    var progressTimerHandle = undefined;
    $scope.progressNum = 0;

    $scope.numOfApps = undefined;

    $http.get(appsUrl).success(function(response){
        $scope.isLoadingMyApp = false;
        var myAppsBefore = response.myApps;
        myAppsBefore.sort(function(a, b){return a.createdAt >= b.createdAt});
        console.log(myAppsBefore[0].createdAt);
        console.log(myAppsBefore[1].createdAt);
        $scope.myApps = myAppsBefore;//数组
        $scope.numOfApps = $scope.myApps.length;

        if ($scope.myApps.length > 0) {
            $scope.selectedApp = $scope.myApps[0];

            //请求每个任务的任务需求,
            var getneedUrl = '/myapp/getNeed/' + $scope.selectedApp.appleId;
            $http.get(getneedUrl).success(function (response) {
                $scope.appNeedInfo = response.appNeedInfo;
                var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
                if (myAppElemment != undefined) {
                    myAppElemment.style.border = '2px solid #3498db';
                    console.log($scope.myApps);
                }
                var unitePrice = document.getElementById("price");
                unitePrice.value = "30";
                var comment=document.getElementById("comment");
                comment.checked=true;
            });
        }
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
                }//myapp里面有了就不能重复添加


                if (flag == 0){
                    console.log('add app to ui');
                    //第一个不是最后一个
                    $scope.myApps.push(response.newApp);

                }
                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }
            $scope.searchKey='';
            $("#addApp_modal").modal('hide');

            //location.href='/app/' + appInfo.appleId;
            //location.href="/myApp";

            $scope.appResults = [];
            $scope.numOfApps ++;

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
                console.log('remopp else');
                $scope.errorMsg = response.errorMsg;
            }

            $scope.appResults = [];
            $scope.numOfApps --;


        });
    };
    //保存
    $scope.saveNeed = function(){
        var needUrl = '/myapp/taskneed/' + $scope.selectedApp.appleId;
        var needInfo = {'taskType':$scope.appNeedInfo.taskType, 'excCount':$scope.appNeedInfo.excCount, 'excUnitPrice':$scope.appNeedInfo.excUnitPrice, 'screenshotCount':$scope.appNeedInfo.screenshotCount,
            'searchKeyword':$scope.appNeedInfo.searchKeyword, 'ranKing':$scope.appNeedInfo.ranKing, 'Score':$scope.appNeedInfo.Score,
            'titleKeyword':$scope.appNeedInfo.titleKeyword, 'commentKeyword':$scope.appNeedInfo.commentKeyword, 'detailRem':$scope.appNeedInfo.detailRem};
        $http.post(needUrl, needInfo).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            $scope.bthShow=1;
            //location.href="/myapp"
        })
    };
    //发布任务
    $scope.releaseTask = function(){
        //初始参数
        console.log("start");
        var flag = true;
        $scope.error = Object();
        $scope.error.excCount = false;
        $scope.error.searchKeyword = false;

        //前端检查
        if ($scope.appNeedInfo.excCount == '' || $scope.appNeedInfo.excCount == undefined) {
            flag = false;
            $scope.error.excCount = true;
            console.log($scope.error.excCount);
            console.log("failed");
            $("#error").modal("show");
        }
        if($scope.appNeedInfo.searchKeyword == '' || $scope.appNeedInfo.searchKeyword == undefined) {
            flag = false;
            $scope.error.searchKeyword = true;
            $("#error").modal("show");

        }


        //通过前端检查,请求服务器
        if (flag){
            console.log("passed");
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
                $("#releaseTask").modal("show");
            })
        }
    };

    //验证表单
    $scope.color={
        "color" :"#3498db",
        "font-size":"14px"
    };


    $scope.setValue1=function(){
    document.getElementById("price").value="30"
    };
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
                break;
            }
        }

        //add border in new
        myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
        myAppElemment.style.border = '2px solid #3498db';

        //请求每个任务的任务需求,
        var getneedUrl = '/myapp/getNeed/' + $scope.selectedApp.appleId;
        $http.get(getneedUrl).success(function(response){
            $scope.appNeedInfo = response.appNeedInfo;
            var myAppElemment = document.getElementsByClassName('thumbnail_wrap')[$scope.selectMyAppIndex];
            if (myAppElemment != undefined){
                myAppElemment.style.border = '2px solid #3498db';
                console.log($scope.myApps);
            }
            var unitePrice=document.getElementById("price");
            unitePrice.value="30";
            var comment=document.getElementById("comment");
            comment.checked=true;

        });
    };

    // 验证钱够不够发布任务
    $scope.calcuQuantity = function(){
        var taskMoney = $scope.appNeedInfo.excCount * document.getElementById("price").value;

        var url = 'myapp/verify';
        $http.post(url, {'taskMoney':taskMoney}).success(function(response){
            $scope.ErrorMsg = response.Error;

        })
    };
    //生成预览截图

    $scope.getScreenShot = function() {
        console.log('runned');
        html2canvas(document.getElementById("screenShot"), {
            onrendered: function (canvas) {
                var a = document.createElement('a');
                a.href = canvas.toDataURL("image/png", 1).replace("image/png", "image/octet-stream");
                a.download = 'exchange-requirements.png';
                a.click();
            },
            proxy: $scope.selectedApp.artworkUrl100
        });
    };

    $scope.addApp=function() {
        $('#glyphicon').popover("toggle");
    };


});
