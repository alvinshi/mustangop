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

    //*********获取任务列表*************
    var url = 'doTask/taskHall';
    $http.get(url).success(function(response){
        $scope.taskObject = response.doTask;
        console.log($scope.taskObject);
        console.log('showed');
        taskDisplayedInit();
        updateTaskDisplayed();
    });

    //获取任务列表总页数
    function taskDisplayedInit(){
        $scope.totalTaskNum = $scope.taskObject.length;
        $scope.taskPerPage = 5; //每页展示的任务数量
        if ($scope.totalTaskNum % $scope.taskPerPage == 0){
            $scope.totalPageNum = parseInt($scope.totalTaskNum / $scope.taskPerPage) + 1;
        }
        else{
            $scope.totalPageNum = parseInt($scope.totalTaskNum / $scope.taskPerPage) + 2;
        };
    };

    //任务列表翻页功能
    $scope.pageNum = 0;

    $scope.nextPage = function(){
        console.log('next');
        if ($scope.pageNum + 2 < $scope.totalPageNum){
            $scope.pageNum ++;
        }
        else{
            console.log("Already reached the last page");
        }
        updateTaskDisplayed();
    };

    $scope.prevPage = function(){
        console.log('prev');
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
});