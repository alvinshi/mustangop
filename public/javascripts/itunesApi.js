/**
 * Created by wujiangwei on 16/5/9.
 */


var app = angular.module('yemaWebApp', []);

var navIndex = 1;


app.controller('itunesSearchControl', function($scope, $http) {
    var url = 'myapp/verify';
    $scope.insufficientFund = false;

    $http.get(url).success(function(response) {
        $scope.usermoney = response.usermoney;
    });

    //************* Helper Function ********************
    //请求每个任务的任务需求, function封装
    function getDemand(){
        if ($scope.selectedApp == undefined){
            $scope.appNeedInfo == undefined;
            return;
        }
        var getneedUrl = '/myapp/getNeed/' + $scope.selectedApp.appleId;
        $http.get(getneedUrl).success(function (response) {
            $scope.appNeedInfo = response.appNeedInfo;

            //获取用户账户余额
            var url = 'myapp/verify';
            $scope.insufficientFund = false;

            $http.get(url).success(function(response) {
                $scope.usermoney = response.usermoney;
                if ($scope.appNeedInfo.excCount != undefined){
                    moneyCheck($scope.appNeedInfo.excCount, $scope.usermoney)
                }
            });

            //默认初始条目
            if ($scope.appNeedInfo.taskType == undefined){
                $scope.appNeedInfo.taskType = '评论';
            }
            if ($scope.appNeedInfo.taskType == '评论'){
                $scope.appNeedInfo.excUnitPrice = 30;
            }

            else {$scope.appNeedInfo.excUnitPrice = 25;}

            if ($scope.appNeedInfo.screenshotCount == undefined){
                $scope.appNeedInfo.screenshotCount= 3;
            }

        });
    };

    //**************页面载入变量初始************************
    $scope.isLoadingMyApp = true;
    $scope.numOfApps = undefined;
    $scope.selectedApp = undefined;
    $scope.saved = false;

    //****************请求绑定的App条目***********************
    var appsUrl = 'myapp/angular';
    $http.get(appsUrl).success(function(response){
        //接收到服务器信息反馈
        $scope.isLoadingMyApp = false;
        (response.myApps).sort(function(a, b){return (a.createdAt < b.createdAt)?1:-1});
        $scope.myApps = response.myApps;
        $scope.numOfApps = $scope.myApps.length;

        if ($scope.numOfApps > 0) {
            //App排序
            $scope.myApps = $scope.myApps.sort(function(a, b){return a.createdAt >= b.createdAt});
            //默认选择第一个App
            $scope.selectedApp = $scope.myApps[0];
            getDemand()
        }
    });

    //选择App
    $scope.selectedAppFunc = function(app){
        //保存状态重新初始
        $scope.saved = false;
        $scope.selectedApp = app;
        getDemand()
    };

    //搜索App
    var progressTimerHandle = undefined;
    $scope.progressNum = 0;

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
        if(keycode==13 ){
            $scope.searchApp();
        }
    };


    //添加App
    $scope.chooseMyApp = function(appInfo){
        var searchUrl = 'myapp/add';
        $http.post(searchUrl, {'appInfo':appInfo}).success(function(response){
            if (response.errorId == 0 || response.errorId === undefined){
                var flag = 0;
                //本地没有App, 初始Array
                if ($scope.myApps == undefined){
                    $scope.myApps = new Array();
                }
                //myapp里面有了就不能重复添加
                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appInfo.appleId){
                        flag = 1;
                        break;
                    }
                }
                if (flag == 0){
                    //默认选择的App是新添加的App
                    $scope.selectedApp = response.newApp;
                    getDemand();
                    $scope.myApps.push(response.newApp);
                    console.log($scope.myApps);
                    $scope.numOfApps ++;
                }
            }else {
                $scope.errorMsg = response.errorMsg;
            }

            $scope.searchKey='';
            $scope.appResults = [];
            $("#addApp_modal").modal('hide');

        });
    };

    //释放App
    $scope.releaseBtnClick = function(app){
        $scope.prepareReleaseApp = app;
    };

    $scope.releaseMyApp = function(){
        var searchUrl = 'myapp/delete';
        var appid = $scope.prepareReleaseApp.appleId;
        $http.post(searchUrl, {'appid':appid}).success(function(response){
            if (response.errorId == 0){
                console.log('remove app if');
                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid){
                        $scope.myApps.splice(i, 1);
                        break;
                    }
                }
            }else {
                $scope.errorMsg = response.errorMsg;
            }
            $scope.appResults = [];
            $scope.numOfApps --;
            if ($scope.numOfApps == 0){
                $scope.selectedApp = undefined;
                getDemand()
            }
            else {
                //如果删除的是之前选择的App, 默认App为第一个
                if ($scope.prepareReleaseApp == $scope.selectedApp){
                    $scope.selectedApp = $scope.myApps[0];
                    getDemand();
                }
            }
        });
    };


    //保存
    $scope.saved = false;

    $scope.saveNeed = function(){
        if ($scope.selectedApp == undefined || $scope.selectedApp.appleId == undefined){
            $scope.modelStr = '未选择换评的App,检查一下吧';
            $("#error").modal("show");
            return;
        }

        if ($scope.selectedApp.trackName == undefined || $scope.selectedApp.length == 0){
            $scope.modelStr = '选择换评的App信息错误,需要联系客服哦';
            $("#error").modal("show");
            return;
        }


        var needUrl = '/myapp/taskneed/' + $scope.selectedApp.appleId;
        var needInfo = {'taskType':$scope.appNeedInfo.taskType, 'excCount':$scope.appNeedInfo.excCount, 'excUnitPrice':$scope.appNeedInfo.excUnitPrice, 'screenshotCount':$scope.appNeedInfo.screenshotCount,
            'searchKeyword':$scope.appNeedInfo.searchKeyword, 'ranKing':$scope.appNeedInfo.ranKing, 'Score':$scope.appNeedInfo.Score,
            'titleKeyword':$scope.appNeedInfo.titleKeyword, 'commentKeyword':$scope.appNeedInfo.commentKeyword, 'detailRem':$scope.appNeedInfo.detailRem};
        $http.post(needUrl, needInfo).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            $scope.saved = true;
            //location.href="/myapp"
        })
    };



    //检查排名不能超过50
    $scope.checkRank= function () {

        if( $scope.appNeedInfo.ranKing>50){
           $scope.errorCheck=true;

        }else {
            $scope.errorCheck=false;
        }


    };



    //发布任务
    $scope.releaseTask = function(){
        $scope.isDisabled = false;
        $scope.saveNeed();
        //初始参数
        var flag = true;
        $scope.error = Object();
        $scope.error.excCount = false;
        $scope.error.searchKeyword = false;

        //前端检查
        if ($scope.appNeedInfo == undefined){
            flag = false;
            $("#error").modal("show");
        }else {
            if ($scope.appNeedInfo.excCount == undefined || $scope.appNeedInfo.excCount == '') {
                flag = false;
                $scope.error.excCount = true;
                $scope.modelStr = '您有未填写完整的信息';
                $("#error").modal("show");
            }
            if($scope.appNeedInfo.searchKeyword == '' || $scope.appNeedInfo.searchKeyword == undefined) {
                flag = false;
                $scope.error.searchKeyword = true;
                $scope.modelStr = '您有未填写完整的信息';
                $("#error").modal("show");
            }
            if($scope.appNeedInfo.excCount>20){
                flag = false;
                $scope.modelStr = '任务条数暂时最多20条哦';
                $("#error").modal("show");

            }
            if($scope.appNeedInfo.ranKing>50){
                flag = false;
                $scope.modelStr = '关键字搜索排名要在50名以内哦';
                $("#error").modal("show");

            }
            if ($scope.appNeedInfo.excCount != undefined){
                var taskMoney = $scope.appNeedInfo.excCount * $scope.appNeedInfo.excUnitPrice;
                console.log($scope.usermoney);
                if (taskMoney > $scope.usermoney){
                    $scope.modelStr = '你的Y币余额不足';
                    $("#error").modal("show");
                    flag = false;
                    $scope.isDisabled = false;
                }
            }
        }

        if ($scope.selectedApp == undefined || $scope.selectedApp.appObjectId == undefined || $scope.selectedApp.appObjectId.length < 0){
            flag = false;
            $scope.modelStr = '未选择换评的App,检查一下吧';
            $("#error").modal("show");
        }

        if ($scope.selectedApp.trackName == undefined || $scope.selectedApp.artworkUrl512 == undefined){
            $scope.modelStr = '选择换评的App信息错误,需要联系客服哦';
            $("#error").modal("show");
            return;
        }

        //通过前端检查,请求服务器
        if (flag){
            console.log("passed");
            console.log($scope.selectedApp);
            var needUrl = '/myapp/task';
            var needInfo = {'taskType':$scope.appNeedInfo.taskType, 'excCount':$scope.appNeedInfo.excCount,
                'excUnitPrice':document.getElementById("price").value, 'screenshotCount':$scope.appNeedInfo.screenshotCount,
                'searchKeyword':$scope.appNeedInfo.searchKeyword, 'ranKing':$scope.appNeedInfo.ranKing,
                'Score':$scope.appNeedInfo.Score, 'titleKeyword':$scope.appNeedInfo.titleKeyword,
                'commentKeyword':$scope.appNeedInfo.commentKeyword, 'detailRem':$scope.appNeedInfo.detailRem,
                'appObjectId':$scope.selectedApp.appObjectId};

            $http.post(needUrl, needInfo).success(function(response){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;

                if(response.errorId != 0){
                    $scope.modelStr = response.errorMsg;
                    $("#error").modal("show");
                }else {
                    $("#releaseTask").modal("show");
                    $scope.isDisabled = true;
                }
            })
        }
    };

    // 确认发布之后刷新界面
    $scope.Confirm = function(){
        location.href="/doTask"
    };

    //验证表单
    $scope.color={
        "color" :"#3498db",
        "font-size":"14px"
    };

    //限制表单字数
    $scope.checkText1 = function () {
        if ($scope.appNeedInfo.titleKeyword.length > 20) {
            $scope.appNeedInfo.titleKeyword = $scope.appNeedInfo.titleKeyword.substr(0, 20);
            saveStatusChange();
        }
    };
    $scope.checkText2 = function () {
        if ($scope.appNeedInfo.commentKeyword.length > 40) {
            $scope.appNeedInfo.commentKeyword = $scope.appNeedInfo.commentKeyword.substr(0, 40);
            saveStatusChange();
        }
    };
    $scope.checkText3 = function () {
        if ($scope.appNeedInfo.detailRem.length > 140) {
            $scope.appNeedInfo.detailRem = $scope.appNeedInfo.detailRem.substr(0, 140);
            saveStatusChange();
        }
    };

    // 验证钱够不够发布任务
    function moneyCheck(amount, accountMoney){
        if (amount != undefined){
            var taskMoney = amount * $scope.appNeedInfo.excUnitPrice;
            if (taskMoney > accountMoney){
                $scope.insufficientFund = true;

            }
            else{
                $scope.insufficientFund = false;
            }
        }
    }

    $scope.calcuQuantity = function(){
        if($scope.appNeedInfo.excCount>20){
            $scope.errorQuatity=true;
        }else {
            $scope.errorQuatity=false;
        }
        var url = 'myapp/verify';
        $http.get(url).success(function(response) {
            $scope.usermoney = response.usermoney;
            moneyCheck($scope.appNeedInfo.excCount, $scope.usermoney)

        });

        $scope.saved = false;

    };
    //生成预览截图

    $scope.getScreenShot = function() {
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

    $scope.addApp=function(id) {
        $('#'+ id).popover("toggle");
    };

    $scope.saveStatusChange = function(){
        $scope.saved = false;
    };

    $scope.taskTypeChanged = function(){
        if ($scope.appNeedInfo.taskType == "评论"){
            $scope.appNeedInfo.excUnitPrice = 30;
        }
        else{
            $scope.appNeedInfo.excUnitPrice = 25;
        }
        $scope.saved = false;
    };
});
