/**
 * Created by tanghui on 16/7/6.
 */


var app=angular.module('yemaWebApp',[]);
var navIndex =0;


app.controller('doTaskCtrl', function($scope, $http) {


    //自动轮播
    $("#myCarousel").carousel({
        interval:2000,
    });





    //发布任务飞机颜色
    $scope.planeColor = true;

    $scope.changePlaneColor = function(){
        $scope.planeColor = !$scope.planeColor;
    };
    $scope.noApp = false;

    //初始,可优化
    $scope.pageIndex = 0;
    $scope.hasMore = 0;
    $scope.pageNum = 0;
    $scope.totalPageNum = 0;
    $scope.currentPage = 0; // 当前页

    //*********获取全部任务列表*************
    var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
    $http.get(url).success(function(response) {
        $scope.taskDisplayed = response.allTask;
        $scope.hasMore = response.hasMore;

        // 上一页
        $scope.prevPage = function () {
            $scope.pageIndex = $scope.pageIndex - 20;
            var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
            $http.get(url).success(function(response) {
                $scope.taskDisplayed = response.allTask;
                $scope.hasMore = response.hasMore;
            });
        };

        // 下一页
        $scope.nextPage = function () {
            $scope.pageIndex = $scope.pageIndex + 20;
            var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
            $http.get(url).success(function(response) {
                $scope.taskDisplayed = response.allTask;
                $scope.hasMore = response.hasMore;
            });
        };

    });

    $scope.displayAll = function(){
        var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
        $http.get(url).success(function(response) {
            $scope.taskDisplayed = response.allTask;
            $scope.hasMore = response.hasMore;

            // 上一页
            $scope.prevPage = function () {
                $scope.pageIndex = $scope.pageIndex - 20;
                var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
                $http.get(url).success(function(response) {
                    $scope.taskDisplayed = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

            // 下一页
            $scope.nextPage = function () {
                $scope.pageIndex = $scope.pageIndex + 20;
                var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'allTask';
                $http.get(url).success(function(response) {
                    $scope.taskDisplayed = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

        });
    };

    ////评论任务
    $scope.commentTasksOnly = function(){
        var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'commentTask';
        $http.get(url).success(function(response) {
            $scope.commentTask = response.allTask;
            $scope.hasMore = response.hasMore;

            // 上一页
            $scope.prevPage = function () {
                $scope.commentIndex = $scope.pageIndex - 20;
                var url = 'doTask/taskHall/' + $scope.commentIndex + '/' + 'commentTask';
                $http.get(url).success(function(response) {
                    $scope.commentTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

            // 下一页
            $scope.nextPage = function () {
                $scope.commentIndex = $scope.pageIndex + 20;
                var url = 'doTask/taskHall/' + $scope.commentIndex + '/' + 'commentTask';
                $http.get(url).success(function(response) {
                    $scope.commentTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

        });
    };

    ////下载任务
    $scope.downloadTasksOnly = function(){
        var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'downTask';
        $http.get(url).success(function(response) {
            $scope.downTask = response.allTask;
            $scope.hasMore = response.hasMore;

            // 上一页
            $scope.prevPage = function () {
                $scope.downTaskIndex = $scope.pageIndex - 20;
                var url = 'doTask/taskHall/' + $scope.downTaskIndex + '/' + 'downTask';
                $http.get(url).success(function(response) {
                    $scope.downTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

            // 下一页
            $scope.nextPage = function () {
                $scope.downTaskIndex = $scope.pageIndex + 20;
                var url = 'doTask/taskHall/' + $scope.downTaskIndex + '/' + 'downTask';
                $http.get(url).success(function(response) {
                    $scope.downTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

        });

    };

    ////已做过任务
    $scope.inactiveTasksOnly = function(){
        var url = 'doTask/taskHall/' + $scope.pageIndex + '/' + 'inactiveTask';
        $http.get(url).success(function(response) {
            $scope.inactiveTask = response.allTask;
            $scope.hasMore = response.hasMore;

            // 上一页
            $scope.prevPage = function () {
                $scope.inactiveTaskIndex = $scope.pageIndex - 20;
                var url = 'doTask/taskHall/' + $scope.inactiveTaskIndex + '/' + 'inactiveTask';
                $http.get(url).success(function(response) {
                    $scope.inactiveTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

            // 下一页
            $scope.nextPage = function () {
                $scope.inactiveTaskIndex = $scope.pageIndex + 20;
                var url = 'doTask/taskHall/' + $scope.inactiveTaskIndex + '/' + 'inactiveTask';
                $http.get(url).success(function(response) {
                    $scope.inactiveTask = response.allTask;
                    $scope.hasMore = response.hasMore;
                });
            };

        });

    };


    //function updateTaskDisplayed(){
    //    var firstTaskIndex = $scope.pageNum * $scope.taskPerPage;
    //    var lastTaskIndex = Math.min(firstTaskIndex + $scope.taskPerPage, $scope.totalTaskNum);
    //    $scope.taskDisplayed = $scope.taskObject.slice(firstTaskIndex, lastTaskIndex);
    //}

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
        //else if ($scope.getTaskFormData.receiveCount > 3) {
        //    $scope.getTaskFormData.errorMsg = '每个账户一次只能领取3条'
        //}

        //通过前端效验
        else {
            var url = 'doTask/postUsertask/' + currentApp.objectId + '/' + currentApp.rateUnitPrice + '/' + currentApp.appObjectId;
            var postData = {'receiveCount': $scope.getTaskFormData.receiveCount, 'detailRem': $scope.getTaskFormData.detailRem,
                'latestReleaseDate': currentApp.latestReleaseDate};
            $http.post(url, postData).success(function(response){
                console.log(response);
                $scope.getTaskFormData.errorMsg = response.errorMsg;
                $scope.getTaskFormData.result = response.succeeded;
            });
        }
    };

    //*******关闭弹窗自动刷新*********
    $scope.refresh = function(){
        location.reload()
    };
});