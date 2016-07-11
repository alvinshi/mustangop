/**
 * Created by tanghui on 16/7/6.
 */


var app=angular.module('yemaWebApp',[]);
var navIndex =0;


app.controller('doTaskCtrl', function($scope, $http, $location) {
    $scope.planeColor = true;

    $scope.changePlaneColor = function(){
        $scope.planeColor = !$scope.planeColor;
    };

    var url = 'doTask/taskHall';
    $http.get(url).success(function(response){
        $scope.taskObject = response.doTask;
    })
});