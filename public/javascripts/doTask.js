/**
 * Created by tanghui on 16/7/6.
 */


var app=angular.module('yemaWebApp',[]);
var navIndex = 0;


app.controller('doTaskCtrl', function($scope, $http) {
    //自动轮播
    $("#myCarousel").carousel({
        interval:5000
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


    //发布任务飞机颜色
    $scope.planeColor = true;

    $scope.changePlaneColor = function(){
        $scope.planeColor = !$scope.planeColor;
    };
    $scope.noApp = false;

    //初始,可优化
    $scope.disableTaskCount = 0;

    $scope.hasMoreDic = {   'allTask':1,
                            'commentTask':1,
                            'downTask':1,
                            'inactiveTask':1
                            };
    $scope.taskDisplayed = [];
    $scope.commentTask = [];
    $scope.downTask = [];
    $scope.inactiveTask = [];

    function getTaskData(taskType, pageCount){
        var url = 'doTask/taskHall/' + pageCount + '/' + taskType;
        $http.get(url).success(function(response) {
            if (taskType == 'allTask'){
                $scope.taskDisplayed = $scope.taskDisplayed.concat(response.allTask);
                for(var i=0;i<response.allTask;i++){
                    response.allTask[i].mode = true;
                }
                $scope.disableTaskCount = response.disableTaskCount;
            }else if(taskType == 'commentTask'){
                $scope.commentTask = $scope.commentTask.concat(response.allTask);
            }else if(taskType == 'downTask'){
                $scope.downTask = $scope.downTask.concat(response.allTask);
            }else if(taskType == 'inactiveTask'){
                $scope.inactiveTask = $scope.inactiveTask.concat(response.allTask);
                $scope.disableTaskCount = response.disableTaskCount;
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
            getTaskData('allTask', $scope.taskDisplayed.length);

        }
    };

    ////评论任务
    $scope.commentTasksOnly = function(){
        if($scope.commentTask == undefined || $scope.commentTask.length == 0){
            getTaskData('commentTask', 0);
        }else {
            getTaskData('commentTask', $scope.commentTask.length);
        }
    };

    ////下载任务
    $scope.downloadTasksOnly = function(){
        if($scope.downTask == undefined || $scope.downTask.length == 0){
            getTaskData('downTask', 0);
        }else {
            getTaskData('downTask', $scope.downTask.length);
        }
    };

    ////已做过任务
    $scope.inactiveTasksOnly = function(){
        if($scope.inactiveTask == undefined || $scope.inactiveTask.length == 0){
            getTaskData('inactiveTask', 0);
        }else {
            getTaskData('inactiveTask', $scope.inactiveTask.length);
        }
    };

    //*********领取任务弹窗逻辑*****************
    $scope.getTaskFormData = {};
    $scope.getTaskFormData.receiveCount = undefined;
    $scope.getTaskFormData.detailRem = undefined;

    $scope.errorMsg = '';
    $scope.errorId = -1;

    //点击确认按钮激发
    var getTaskLocked = false;
    $scope.getTask = function(currentApp){
        if (getTaskLocked == true){
            //已经在领取中...
            return;
        }
        var username = getCookie('username');
        //报错条件
        if (username == ''){
            $scope.errorId = -1;
            $scope.errorMsg = '请先登陆帐号后再领取任务';
        }
        else if ($scope.getTaskFormData.receiveCount == 0) {
            $scope.errorId = -1;
            $scope.errorMsg = '请正确填写领取条目';
        }
        else if (parseInt($scope.getTaskFormData.receiveCount) != $scope.getTaskFormData.receiveCount) {
            $scope.errorId = -1;
            $scope.errorMsg = '请正确填写领取条目';
        }
        else if ($scope.getTaskFormData.receiveCount > parseInt(currentApp.remainCount)){
            $scope.errorId = -1;
            $scope.errorMsg = '此任务剩余条数不足';
        }
        else if ($scope.getTaskFormData.receiveCount > 3) {
            $scope.errorId = -1;
            $scope.errorMsg = '每个账户一次只能领取3条'
        }
        //通过前端效验
        else {
            getTaskLocked = true;
            $scope.errorId = 0;
            $scope.errorMsg = '领取任务中......'

            var url = 'doTask/postUsertask/' + currentApp.objectId + '/' + currentApp.rateUnitPrice + '/' + currentApp.appObjectId;
            var postData = {'receiveCount': $scope.getTaskFormData.receiveCount, 'detailRem': $scope.getTaskFormData.detailRem,
                'latestReleaseDate': currentApp.latestReleaseDate};
            $http.post(url, postData).success(function(response){
                console.log(response);
                $scope.errorMsg = response.errorMsg;
                $scope.errorId = response.errorId;

                //处理领取任务成功的前端逻辑
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

                getTaskLocked = false;
            });
        }
    };

    //*******关闭弹窗自动刷新*********
    $scope.refresh = function(){
        location.reload()
    };


   //出现筛选图标
    $scope.showDiv=function(app){
        app.mode=true;
    };
    $scope.hideDiv=function(app){
        app.mode=false;
    };
    //
    $scope.filtrateApp=function(appInfo){
        $("#markApp").modal("show");

        var needToSave = {'appObjectId': appInfo.appObjectId, 'latestReleaseDate': appInfo.latestReleaseDate,
            'taskObjectId':appInfo.objectId};

        // 筛选任务, 当我点击确认时 保存
        $scope.confirmAdd = function(){
            var fiterAppUrl = 'doTask/fiterApp';
            $http.post(fiterAppUrl, needToSave).success(function(response){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;

                //TODO: 成功还是失败
                if (response.errorId == 0){

                }

            })

        }
    };

});