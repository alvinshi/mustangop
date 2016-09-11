/**
 * Created by wujiangwei on 16/5/9.
 */


var app = angular.module('yemaWebApp', []);

var navIndex = 2;


app.controller('itunesSearchControl', function($scope, $http) {

    var downTaskYCoin = 23;
    var commentTaskYCoin = 30;

    var url = 'myapp/verify';
    $scope.insufficientFund = false;

    $scope.inviteUrl = "http://www.mustangop.com/user/register/" + getCookie("userIdCookie");

    $scope.copyUrl = function () {
        $('#alert-btn').popover('toggle');
        var Url = document.getElementById("inviteUrlcopy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };

    $http.get(url).success(function(response) {
        $scope.usermoney = response.usermoney;
    });

    //计算价格帮助变量
    var oldTaskType;
    var oldTaskRegisterType;

        //************* Helper Function ********************
    //请求每个任务的任务需求, function封装
    function getDemand(){
        if ($scope.selectedApp == undefined){
            $scope.demandTemplateArray == undefined;
            return;
        }

        var getneedUrl = '/myapp/getNeed/' + $scope.selectedApp.appObjectId;
        $http.get(getneedUrl).success(function (response) {

            $scope.demandTemplateArray = response.demandTemplateArray;
            $scope.displayDemandTemplate = $scope.demandTemplateArray[0];

            oldTaskType = $scope.displayDemandTemplate.taskType;
            oldTaskRegisterType = $scope.displayDemandTemplate.registerStatus;

            //获取用户账户余额
            var url = 'myapp/verify';
            $scope.insufficientFund = false;

            $http.get(url).success(function(response) {
                $scope.usermoney = response.usermoney;

                //核实该条任务Y Coin 够不够
                moneyCheck();
            });

        });
    }

    //**************页面载入变量初始************************
    $scope.isLoadingMyApp = true;
    $scope.numOfApps = 10;  // > 5 不显示+号
    $scope.selectedApp = undefined;
    $scope.saved = false;
    $scope.inviteCount = 0;

    function refreshAddBtn(){
        if($scope.inviteCount > $scope.myApps.length - 1){
            $("button.btn_addApp").attr('data-target', '#addApp_modal');
        }
        else {
            $("button.btn_addApp").attr('data-target', '#invite');
        }
    }
    //****************请求绑定的App条目***********************
    var appsUrl = 'myapp/angular';
    $http.get(appsUrl).success(function(response){
        //接收到服务器信息反馈
        $scope.isLoadingMyApp = false;
        $scope.numOfApps = response.myApps.length;
        $scope.inviteCount = response.inviteSucceedCount;
        $scope.Limit = response.Limit;
        if ($scope.numOfApps > 0) {
            //App排序
            $scope.myApps = response.myApps.sort(function(a, b){return a.createdAt >= b.createdAt});

            refreshAddBtn();

            //默认选择第一个App
            $scope.selectedApp = $scope.myApps[0];
            $scope.isDisabled = false;
            getDemand();
        }
    });

    //*************************获取三个模板的数组值******************
    $scope.demandTemplate = function(index){
        if($scope.demandTemplateArray != undefined && $scope.demandTemplateArray.length > 0){
            $scope.displayDemandTemplate = $scope.demandTemplateArray[index];
        }
    };

    //*************************按键颜色切换*************************

    //选择App
    $scope.selectedAppFunc = function(app){
        //保存状态重新初始
        $scope.saved = false;
        $scope.selectedApp = app;
        $scope.isDisabled = false;
        getDemand();

        setTimeout(function() {
            // IE
            if(document.all) {
                document.getElementById("model01").click();
            }
            // 其它浏览器
            else {
                var e = document.createEvent("MouseEvents");
                e.initEvent("click", true, true);
                document.getElementById("model01").dispatchEvent(e);
            }
        }, 1);

    };

    $scope.releaseTaskVideo=function(){
        $("#releaseTaskVideo").modal("hide");
        var myVideo=document.getElementById("release");
        myVideo.pause();
    };

    //Y币变动
    $scope.taskNumberChange = function(){
        //核实该条任务Y Coin 够不够
        moneyCheck();
    };

    //排名变动
    $scope.rankExtraYCoin = 0;
    $scope.rankChange = function()
    {
        var myVal = parseInt(document.getElementById("mytext1").value);
        if (50 >= myVal && myVal >= 20) {
            $scope.rankExtraYCoin = (myVal/10-2);
            moneyCheck();
        }
        else if(myVal > 50 && myVal <= 100){
            $scope.rankExtraYCoin = (3 + (myVal - 50) * 0.5);
            moneyCheck();
        }
        else{
            $scope.rankExtraYCoin = 0;
        }
    };

    // 标题关键词
    $(document).ready(function(){
        $(".input2").change(function(){
            var reviewTitle = $('.input2').val(); // 判断是否为空
            if (reviewTitle != ""){
                $scope.displayDemandTemplate.excUnitPrice += 1;
                $scope.reviewTitleTem = true;
            }else {
                $scope.displayDemandTemplate.excUnitPrice -= 1;
                $scope.reviewTitleTem = false;
            }
            moneyCheck();
        });
    });

    // 评论关键词
    $(document).ready(function(){
        $(".field").change(function(){
            var reviewContent = $('.field').val(); // 判断是否为空
            if (reviewContent != ""){
                $scope.displayDemandTemplate.excUnitPrice += 1;
                $scope.commentMustContent = true;
            }else {
                $scope.displayDemandTemplate.excUnitPrice -= 1;
                $scope.commentMustContent = false;
            }
            moneyCheck();
        });
    });

    //*******************按键默认被选定

    setTimeout(function() {
        // IE
        if(document.all) {
            document.getElementById("model01").click();
        }
        // 其它浏览器
        else {
            var e = document.createEvent("MouseEvents");
            e.initEvent("click", true, true);
            document.getElementById("model01").dispatchEvent(e);
        }
    }, 1);


    //*******************标题按钮颜色
    $("#model01").on('click',function(){
        $("#model01").removeAttr('style');
        $(this).attr('style','color:#5a94ec;width:350px;border: 0px;font-size: 20px;border-bottom: 2px solid#5a94ec;');
        $("#model02").removeAttr('style');
        $("#model02").attr('style','width:350px;border: 0px;font-size: 20px');
        $("#model03").removeAttr('style');
        $("#model03").attr('style','width:350px;border: 0px;font-size: 20px');
    });
    $("#model02").on('click',function(){
        $("#model02").removeAttr('style');
        $(this).attr('style','color:#5a94ec;width:350px;border: 0px;font-size: 20px;border-bottom:2px solid #5a94ec');
        $("#model01").removeAttr('style');
        $("#model01").attr('style','width:350px;border: 0px;font-size: 20px');
        $("#model03").removeAttr('style');
        $("#model03").attr('style','width:350px;border: 0px;font-size: 20px');
    });
    $("#model03").on('click',function(){
        $("#model03").removeAttr('style');
        $(this).attr('style','color:#5a94ec;width:350px;border: 0px;font-size: 20px;border-bottom:2px solid #5a94ec');
        $("#model02").removeAttr('style');
        $("#model02").attr('style','width:350px;border: 0px;font-size: 20px');
        $("#model01").removeAttr('style');
        $("#model01").attr('style','width:350px;border: 0px;font-size: 20px');
    });

    //*******************判断是下载还是评论****************
    $scope.down = false;
    $scope.taskprice = 30;
    $scope.download = function(){

        if(oldTaskType != $scope.displayDemandTemplate.taskType){
            $scope.displayDemandTemplate.excUnitPrice -= (commentTaskYCoin - downTaskYCoin);
            moneyCheck();
        }
        oldTaskType = $scope.displayDemandTemplate.taskType;

        if(document.getElementById("radtwoInput").checked){
            $scope.down = !$scope.down;
        }
        else{
            $scope.down = false;
        }
    };
    $scope.download1=function(){

        if(oldTaskType != $scope.displayDemandTemplate.taskType){
            $scope.displayDemandTemplate.excUnitPrice += (commentTaskYCoin - downTaskYCoin);
            moneyCheck();
        }
        oldTaskType = $scope.displayDemandTemplate.taskType;

        if(document.getElementById("radoneInput").checked){
            $scope.taskprice = 30;
        }
    };

    // 判断注册方式
    $scope.logonMode = function(curren){
        if (curren == 'third'){
            $scope.displayDemandTemplate.excUnitPrice += 2;
            $scope.showYCoin = true;
        }else {
            $scope.displayDemandTemplate.excUnitPrice -= 2;
            $scope.showYCoin = false;
        }
        moneyCheck();

    };

    //必须获取标志
    $scope.needGetFunc = function(){
        if(document.getElementById("box1").checked){
            $scope.displayDemandTemplate.excUnitPrice += 5;
            $scope.needGetYCoin = true;
       }
        else{
            $scope.displayDemandTemplate.excUnitPrice -= 5;
            $scope.needGetYCoin = false;
        }
        moneyCheck();
    };

    // 评论需满50字
    $scope.commenOver50 = function(){
        if(document.getElementById("box2").checked){
            $scope.displayDemandTemplate.excUnitPrice += 3;
            $scope.commentYCoin = true;
        }
        else{
            $scope.displayDemandTemplate.excUnitPrice -= 3;
            $scope.commentYCoin = false;
        }

        moneyCheck();
    };

    // 官方人工审核
    $scope.needOfficalCheck = function(){
        if(document.getElementById("inlineCheckbox1").checked){
            $scope.displayDemandTemplate.excUnitPrice += 3;
            $scope.needOfficaCheckYCoin = true
        }
        else{
            $scope.displayDemandTemplate.excUnitPrice -= 3;
            $scope.needOfficaCheckYCoin = false
        }

        moneyCheck();
    };

    // 限时今日完成任务
    $scope.currentDayTask=function(){
        if(document.getElementById("inlineCheckbox2").checked){
            $scope.currentDayTaskYCoin = true;
        }
        else{
            $scope.currentDayTaskYCoin=false;
        }
    };

    //搜索App
    var progressTimerHandle = undefined;
    $scope.progressNum = 0;
    var searchLocked = false;
    $scope.searchApp = function(){
        if ($scope.inviteCount < $scope.numOfApps) {
            $scope.invite1 = true;
            $scope.invite2 = false;
        }
        else {

            $scope.isError = 0;

            if ($scope.searchUrl != '' && searchLocked == false) {

                var searchUrl = 'api/itunes/search/' + $scope.searchKey;
                $scope.progressNum = 100;
                //timer
                if (progressTimerHandle != undefined) {
                    //clearTimeout(progressTimerHandle);
                }

                //progressTimerHandle = setTimeout(timerFunc(), 1);

                console.log('--------- searchApp searchApp');
                searchLocked = true;
                $http.get(searchUrl).success(function (response) {

                    searchLocked = false;
                    console.log('searchApp' + response);

                    $scope.appResults = response.appResults;
                    $scope.progressNum = 0;

                    if (response.errorMsg.length > 0) {
                        $scope.isError = 1;
                        $scope.errorMsg = response.errorMsg;
                    } else {
                        $scope.errorMsg = response.errorMsg;
                        $scope.isError = response.errorId != 0;

                        for (var i = 0; i < $scope.appResults.length; i++) {
                            var appRe = $scope.appResults[i];

                            appRe.isMine = false;
                            for (var j = 0; j < $scope.myApps.length; j++) {
                                var myApp = $scope.myApps[j];
                                if (myApp.appleId === appRe.appleId) {
                                    appRe.isMine = true;
                                    console.log(appRe.appleId + 'isMine');
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }

    };


    $scope.keySearchApp = function(e){
        var keycode = window.event?e.keyCode:e.which;
        if(keycode==13 ){
            $scope.searchApp();
        }
    };

    // 更新APP信息
    $scope.updateApp = function(appObjectId){
        $("#updateApp").modal('show');
        $scope.isLoadingApp=true;
        $scope.errorMsg="";
        var updateAppURL = '/myapp/UpdateApp';
        $http.post(updateAppURL, {'appObjectId':appObjectId}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                $scope.errorMsg = response.errorMsg;
                $scope.isLoadingApp = false;

                $scope.numOfApps = response.myApps;

                if ($scope.numOfApps > 0) {
                    $scope.myApps = response.myApps;

                }
            }
        })
    };


    //添加App
    $scope.chooseMyApp = function(appInfo){
        if(appInfo.isBinlding == true){
            //防止重复绑定
            return;
        }

        var searchUrl = 'myapp/add';
        appInfo.isBinlding = true;
        $http.post(searchUrl, {'appInfo':appInfo}).success(function(response){

            appInfo.isBinlding = false;

            if (response.errorId == 0 || response.errorId === undefined){
                appInfo.isMine = true;
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
                    $scope.isDisabled = false;

                    getDemand();
                    $scope.myApps.push(response.newApp);
                    console.log($scope.myApps);
                    $scope.numOfApps ++;

                    refreshAddBtn();
                }
            }else {
                $scope.errorMsg = response.errorMsg;
            }

            $scope.searchKey = '';
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
                        refreshAddBtn();
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
                    $scope.isDisabled = false;
                    getDemand();
                }
            }
        });
    };

    //radio切换
    $scope.change=false;
    $scope.radio=function(curre){
        if(document.getElementById('optionsRadios1').checked==true){
            $scope.change=true;
        }
        else{
            $scope.change=false;
        }
    };


    // 确认发布之后刷新界面
    $scope.Confirm = function(){
        //location.href="/doTask"
    };

    //验证表单
    $scope.color={
        "color" :"#3498db",
        "font-size":"14px"
    };

    // 验证钱够不够发布任务
    function moneyCheck(){
        var excCount = $scope.displayDemandTemplate.excCount;
        if(excCount != undefined && excCount > 0){
            var excUnitPrice = $scope.displayDemandTemplate.excUnitPrice + $scope.rankExtraYCoin;
            var taskMoney = excCount * excUnitPrice;
            if(taskMoney > $scope.usermoney){
                $scope.insufficientFund = true;
                console.log('money ' + $scope.usermoney + 'not enough, need ' + excUnitPrice + ', total' + taskMoney);
            }
            else{
                $scope.insufficientFund = false;
                console.log('money ' + $scope.usermoney + 'not enough, need ' + excUnitPrice + ', total' + taskMoney);
            }
        }
    }

    $scope.addApp=function(id) {
        $('#'+ id).popover("toggle");
    };

    $scope.saveStatusChange = function(){
        $scope.saved = false;
    };

    $.fn.smartFloat = function() {
        var position = function(element) {
            var top = element.position().top, pos = element.css("position");
            $(window).scroll(function() {
                var scrolls = $(this).scrollTop();
                if (scrolls > top) {
                    if (window.XMLHttpRequest) {
                        element.css({
                            position: "fixed",
                            top: 0
                        });
                    } else {
                        element.css({
                            top: scrolls
                        });
                    }
                }else {
                    element.css({
                        position: "relative",
                        top: 0
                    });
                }
            });
        };
        return $(this).each(function() {
            position($(this));
        });
    };
    $("#float").smartFloat();
});
