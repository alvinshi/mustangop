/**
 * Created by cailong on 16/5/20.
 */

var app=angular.module('userCenterAPP', []);

app.controller('userCenterCtrl', function($scope, $http){

});

function logout(){

    clearCookie('userIdCookie');
    clearCookie('username');

    location.href='/';
}