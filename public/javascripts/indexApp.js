/**
 * Created by cailong on 16/5/31.
 */

var app = angular.module('indexApp', []);

app.controller('indexAppCtrl', function($scope, $http){
    var indexUrl = '/index';
    $http.get(indexUrl).success(function(request){
        $scope.tracknameAPPs = request.tracknameAPPs;
    })
});