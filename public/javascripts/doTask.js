/**
 * Created by tanghui on 16/7/6.
 */


var app=angular.module('yemaWebApp',[]);
var navIndex =0;


app.controller('doTaskCtrl', function($scope, $http, $location) {

    //发布任务飞机颜色
    $scope.planeColor = true;

    $scope.changePlaneColor = function(){
        $scope.planeColor = !$scope.planeColor;
    };
    $scope.noApp = false;
    //*********获取全部任务列表*************
    var url = 'doTask/taskHall';

    //初始,可优化
    $scope.pageNum = 0;
    $scope.totalPageNum = 0;
    $scope.inactiveTasks = new Array();

    $http.get(url).success(function(response) {
        if (response.doTask.length == 0){
            $scope.noApp = true
        }
        else {
            $scope.allTaskObjects = new Array();
            $scope.downloadTasks = new Array();
            $scope.commentTasks = new Array();
            $scope.inactiveTasks = new Array();
            for (var i = 0; i < response.doTask.length; i++){
                //做过的任务, 我的任务, 剩余条数为0
                if (response.doTask[i].inactive || response.doTask[i].myTask || response.doTask[i].remainCount == '0'){
                    $scope.inactiveTasks.push(response.doTask[i]);
                }
                else if (response.doTask[i].taskType == '下载'){
                    $scope.allTaskObjects.push(response.doTask[i]);
                    $scope.downloadTasks.push(response.doTask[i]);
                }
                else {
                    $scope.allTaskObjects.push(response.doTask[i]);
                    $scope.commentTasks.push(response.doTask[i]);
                }
            }
            $scope.taskObject = $scope.allTaskObjects;
            taskDisplayedInit();
            updateTaskDisplayed();
        }
    })

    //获取任务列表总页数
    function taskDisplayedInit(){
        $scope.totalTaskNum = $scope.taskObject.length;
        $scope.taskPerPage = 10; //每页展示的任务数量
        if ($scope.totalTaskNum % $scope.taskPerPage == 0){
            $scope.totalPageNum = parseInt($scope.totalTaskNum / $scope.taskPerPage) + 1;
        }
        else{
            $scope.totalPageNum = parseInt($scope.totalTaskNum / $scope.taskPerPage) + 2;
        };
    };

    //全部显示
    $scope.displayAll = function(){
        $scope.taskObject = $scope.allTaskObjects;
        $scope.pageNum = 0;
        taskDisplayedInit();
        updateTaskDisplayed();
    }

    //下载任务
    $scope.downloadTasksOnly = function(){
        $scope.taskObject = $scope.downloadTasks;
        $scope.pageNum = 0;
        taskDisplayedInit();
        updateTaskDisplayed();
    }

    //评论任务
    $scope.commentTasksOnly = function(){
        $scope.taskObject = $scope.commentTasks;
        $scope.pageNum = 0;
        taskDisplayedInit();
        updateTaskDisplayed();
    }

    //已做过任务
    $scope.inactiveTasksOnly = function(){
        $scope.taskObject = $scope.inactiveTasks;
        $scope.pageNum = 0;
        taskDisplayedInit();
        updateTaskDisplayed();
    }


    //任务列表翻页功能
    $scope.pageNum = 0;

    $scope.nextPage = function(){
        if ($scope.pageNum + 2 < $scope.totalPageNum){
            $scope.pageNum ++;
        }
        else{
            console.log("Already reached the last page");
        }
        updateTaskDisplayed();
    };

    $scope.prevPage = function(){
        if ($scope.pageNum > 0){
            $scope.pageNum --;
        }
        else{
            console.log("It is the first page");
        }
        updateTaskDisplayed();
    };

    function updateTaskDisplayed(){
        firstTaskIndex = $scope.pageNum * $scope.taskPerPage
        lastTaskIndex = Math.min(firstTaskIndex + $scope.taskPerPage, $scope.totalTaskNum);
        $scope.taskDisplayed = $scope.taskObject.slice(firstTaskIndex, lastTaskIndex);
    };

    //*********领取任务弹窗逻辑*****************
    $scope.getTaskFormData = {};
    $scope.getTaskFormData.receiveCount = undefined;
    $scope.getTaskFormData.detailRem = undefined;
    $scope.getTaskFormData.errorMsg = undefined;
    $scope.getTaskFormData.result = false;

    //点击确认按钮激发
    $scope.getTask = function(currentApp){
        var username = getCookie('username');
        //报错条件
        if (username == ''){
            $scope.getTaskFormData.errorMsg = '请先登陆帐号后再领取任务';
        }
        else if ($scope.getTaskFormData.receiveCount == 0) {
            $scope.getTaskFormData.errorMsg = '请正确填写领取条目';
        }
        else if (parseInt($scope.getTaskFormData.receiveCount) != $scope.getTaskFormData.receiveCount) {
            $scope.getTaskFormData.errorMsg = '请正确填写领取条目';
        }
        else if ($scope.getTaskFormData.receiveCount > parseInt(currentApp.remainCount)){
            $scope.getTaskFormData.errorMsg = '此任务剩余条数不足';
        }

        //通过前端效验
        else {
            var url = 'doTask/postUsertask/' + currentApp.objectId + '/' + currentApp.rateUnitPrice + '/' + currentApp.appObjectId;
            var postData = {'receiveCount': $scope.getTaskFormData.receiveCount, 'detailRem': $scope.getTaskFormData.detailRem,
                'latestReleaseDate': currentApp.latestReleaseDate};
            $http.post(url, postData).success(function(response){
                $scope.getTaskFormData.errorMsg = response.errorMsg;
                $scope.getTaskFormData.result = response.succeeded;
            });
        };
    };

    //*******关闭弹窗自动刷新*********
    $scope.refresh = function(){
        location.reload()
    };
});