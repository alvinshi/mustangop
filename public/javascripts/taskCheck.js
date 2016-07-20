var app=angular.module('yemaWebApp',[]);
var navIndex =3;

app.controller('taskCheckCtrl', function($scope, $http, $location) {
    var taskUrl = '/taskCheck/taskAudit';
    $http.get(taskUrl).success(function(response){
        $scope.taskAudit = response.taskAudit;
        //$scope.taskInfo = response.taskInfo;
    })
});
