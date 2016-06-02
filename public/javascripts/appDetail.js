/**
 * Created by cailong on 16/5/30.
 */

var app = angular.module('myAppContent', []);
app.controller('myAppControl', function($scope, $http){

    var myappUrl = 'baseinfo/';

    $http.get(myappUrl).success(function(response){
        $scope.AppDetail = response.AppDetail;
    })

})