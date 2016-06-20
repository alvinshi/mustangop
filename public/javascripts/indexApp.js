/**
 * Created by cailong on 16/5/31.
 */

var app = angular.module('yemaWebApp', []);

app.directive("thNav",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/navbar.html/2'
        //replace: true
    };
});

app.controller('indexAppCtrl', function($scope, $http, $location){

    var paramsList = $location.absUrl().split('/');
    var index = paramsList[paramsList.length - 1];
    $scope.myColors = ['white', 'white', 'white', 'white','white'];
    $scope.myColors[index] = '#3498db';

    var indexUrl = '/index';

    $http.get(indexUrl).success(function(response){
        $scope.userObjectId = response.userObjectId;
        $scope.tracknameAPPs = response.tracknameAPPs;
    });


    function logout(){

        clearCookie('userIdCookie');
        clearCookie('username');

        location.href='/';
    }

});