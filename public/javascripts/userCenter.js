/**
 * Created by cailong on 16/5/20.
 */

function logout(){

    clearCookie('userIdCookie');
    clearCookie('username');

    location.href='/';
}

var app=angular.module('userCenterAPP', []);

app.controller('userCenterCtrl', function($scope, $http){

});