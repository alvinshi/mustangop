/**
 * Created by tanghui on 16/7/6.
 */


var app = angular.module('yemaWebApp',[]);
var navIndex = 0;



app.controller('doTaskCtrl', function($scope, $http) {

    //******************* 自动轮播 *************************
    $("#myCarousel").carousel({
        interval:3000
    });

   //关闭视频弹窗 视屏停止
    $scope.releaseTaskVideo=function(){
        $("#releaseTaskVideo").modal("hide");
        var myVideo=document.getElementById("releaseTask");
        myVideo.pause();
    };
    $scope.getTaskVideo=function(){
        $("#getTaskVideo").modal("hide");
        var myVideo=document.getElementById("getTask");
        myVideo.pause();
    };
    $scope.uploadTaskVideo=function(){
        $("#uploadTaskVideo").modal("hide");
        var myVideo=document.getElementById("uploadTask");
        myVideo.pause();
    };


    //******************* 飞机 *************************
    $scope.planeColor = true;
    $scope.changePlaneColor = function(){
        $scope.planeColor = !$scope.planeColor;
    };


    //************** 初始,可优化 ****************
    $scope.noApp = false;
    $scope.isLoadingMyApp = true;

    $scope.disableTaskCount = 0;

    $scope.hasMoreDic = {   'allTask':1,
                            'commentTask':1,
                            'downTask':1,
                            'inactiveTask':1
                            };

    var myAppCountDic = {   'allTask':0,
        'commentTask':0,
        'downTask':0
    };

    $scope.taskDisplayed = [];
    $scope.commentTask = [];
    $scope.downTask = [];
    $scope.inactiveTask = [];

    function getTaskData(taskType, pageCount){
        var url = 'doTask/taskHall/' + pageCount + '/' + taskType;
        $http.get(url).success(function(response) {
            console.log(response.allTask);

            $scope.isLoadingMyApp = false;
            //请求回App之后, 初始, mode: 代表标记已换, hasChanged: 代表出现本版本已换灰色按钮
            for(var i = 0; i < response.allTask; i++){
                response.allTask[i].mode = false;
            }
            for(var j=0;j<response.allTask;i++){
                response.allTask[j].hasChanged = false;
            }
            for(var j=0;j<response.allTask;i++){
                response.allTask[j].hasTaken = false;
            }

            if(pageCount == 0){
                //第一页时保存我的App个数
                if(response.myAppCount != undefined){
                    myAppCountDic[taskType] = response.myAppCount;
                }
            }

            if (taskType == 'allTask'){
                $scope.taskDisplayed = $scope.taskDisplayed.concat(response.allTask);

                $scope.disableTaskCount = response.disableTaskCount;

                if( $scope.taskDisplayed .length > 0){
                    $scope.noApp = false;
                }else {
                    $scope.noApp = true;
                }


            }else if(taskType == 'commentTask'){

                $scope.commentTask = $scope.commentTask.concat(response.allTask);

                if( $scope.commentTask.length > 0){
                    $scope.noApp = false;
                }else {
                    $scope.noApp = true;
                }

            }else if(taskType == 'downTask'){
                $scope.downTask = $scope.downTask.concat(response.allTask);

                if( $scope.downTask.length > 0){
                    $scope.noApp = false;
                }else {
                    $scope.noApp = true;
                }

            }else if(taskType == 'inactiveTask'){
                $scope.inactiveTask = $scope.inactiveTask.concat(response.allTask);
                $scope.disableTaskCount = response.disableTaskCount;

                if($scope.inactiveTask.length > 0){
                    $scope.noApp = false;
                }else {
                    $scope.noApp = true;
                }
            }

            $scope.hasMoreDic[taskType] = response.hasMore;
        });
    }

    //默认请求所有
    getTaskData('allTask', 0);
    $scope.displayAll = function(){

        if($scope.taskDisplayed == undefined || $scope.taskDisplayed.length == 0){
            getTaskData('allTask', 0);



        }else {
            if ($scope.hasMoreDic['allTask'] == 1){
                getTaskData('allTask', $scope.taskDisplayed.length - myAppCountDic['allTask']);
            }
            else {
                $scope.isLoadingMyApp = false;
                $scope.noApp = false;
            }
        }
    };

    ////评论任务
    $scope.commentTasksOnly = function(){
        $scope.isLoadingMyApp = true;

        if($scope.commentTask == undefined || $scope.commentTask.length == 0){
            getTaskData('commentTask', 0);

        }else {
            if ($scope.hasMoreDic['commentTask'] == 1) {
                getTaskData('commentTask', $scope.commentTask.length - myAppCountDic['commentTask']);

            }
            else {
                $scope.isLoadingMyApp = false;
                $scope.noApp = false;
            }
        }
    };

    ////下载任务
    $scope.downloadTasksOnly = function(){
        $scope.isLoadingMyApp = true;

        if($scope.downTask == undefined || $scope.downTask.length == 0){
            getTaskData('downTask', 0);

        }else {
            if ($scope.hasMoreDic['downTask'] == 1) {
                getTaskData('downTask', $scope.downTask.length - myAppCountDic['downTask']);
            }
            else {
                $scope.isLoadingMyApp = false;
                $scope.noApp = false;
            }
        }
    };

    ////已做过任务
    $scope.inactiveTasksOnly = function(){
        $scope.isLoadingMyApp = true;

        if($scope.inactiveTask == undefined || $scope.inactiveTask.length == 0){
            getTaskData('inactiveTask', 0);
        }else {
            if ($scope.hasMoreDic['inactiveTask'] == 1) {
                getTaskData('inactiveTask', $scope.inactiveTask.length - myAppCountDic['inactiveTask']);
            }
            else {
                $scope.isLoadingMyApp = false;
                $scope.noApp = false;
            }
        }
    };

    //*********领取任务弹窗逻辑*****************
    //点击确认按钮激发
    $scope.getTaskMarkStr = undefined; //bugbug

    $scope.getTask = function(currentApp){
        var username = getCookie('username');
        //报错条件
        if (username == ''){
            currentApp.getTaskErrorId = -200;
            currentApp.errorMsg = '请先登陆帐号后再领取任务';
        }
        else if (parseInt(currentApp.receiveCount) != currentApp.receiveCount) {
            currentApp.getTaskErrorId = -200;
            currentApp.errorMsg = '请填写正确的领取条目';
        }
        else if (currentApp.receiveCount > currentApp.remainCount){
            currentApp.getTaskErrorId = -200;
            currentApp.errorMsg = '此任务无法领取更多';
        }
        else if (currentApp.receiveCount > 10) {
            currentApp.getTaskErrorId = -200;
            currentApp.errorMsg = '每个任务最多领取10条';
        }
        //通过前端效验
        else {
            currentApp.isGetingTask = true;
            var url = 'doTask/postUsertask/' + currentApp.objectId + '/' + currentApp.rateUnitPrice + '/' + currentApp.appObjectId;
            var postData = {'receiveCount': currentApp.receiveCount, 'detailRem': currentApp.detail,
                'excUniqueCode': currentApp.excUniqueCode};

            $http.post(url, postData).success(function(response){
                console.log(response);

                currentApp.getTaskErrorId = response.errorId;

                if(response.errorId != 0){
                    currentApp.errorMsg = response.errorMsg;
                    currentApp.isGetingTask = false;
                }else {
                    //需要通知系统才可以,不在一个contoroller里的
                    //$scope.refusedCount += currentApp.receiveCount;
                    currentApp.hasTaken = true;
                    currentApp.errorMsg = '';
                }

                //处理领取任务成功的前端逻辑 (标记几个标签下相同任务)
                var dataAllTypeList = [$scope.taskDisplayed, $scope.commentTask, $scope.downTask];
                for (var i = 0; i < dataAllTypeList.length; i++){
                    var taskList = dataAllTypeList[i];

                    for (var j = 0; j < taskList.length; j++){
                        var taskObect = taskList[j];

                        if (taskObect.appleId == currentApp.appleId)
                        {
                            taskList.disable = true;
                            $scope.inactiveTask.push(taskObect);
                            $scope.disableTaskCount = $scope.disableTaskCount + 1;
                        }
                    }
                }
            });
        }
    };

    //*******关闭弹窗自动刷新*********
    $scope.refresh = function(){
        location.reload()
    };


   //出现筛选图标
    $scope.showDiv = function(app){
        //自己的任务不用筛选
        if(app.myTask != true){

            app.mode = true;
        }
    };
    $scope.hideDiv = function(app){
        app.mode = false;
    };

    //筛选已经做过的任务
    $scope.filtrateApp = function(appInfo){
        //$("#markApp").modal("show");
        var needToSave = {'appObjectId': appInfo.appObjectId, 'excUniqueCode': appInfo.excUniqueCode,
            'taskObjectId':appInfo.objectId};

        // 筛选任务, 当我点击确认时 保存
        $scope.confirmAdd = function(app){
            var fiterAppUrl = 'doTask/fiterApp';
            $http.post(fiterAppUrl, needToSave).success(function(response){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                //TODO: 成功还是失败
                if (response.errorId == 0){
                    app.hasChanged = true;

                }
            })

        }
    };

});