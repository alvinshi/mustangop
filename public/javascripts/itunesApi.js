/**
 * Created by wujiangwei on 16/5/9.
 */


var app=angular.module('itunesSearch',[]);

app.controller('itunesSearchControl', function($scope, $http) {

    $scope.searchKey = '11';

    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = 'api/itunes/search/' + $scope.searchKey;

            console.log(searchUrl);

            $http.get(searchUrl).success(function(response){
                console.log('angular search end');
                console.log(response);
                $scope.appResults = response.appResults;
                $scope.errorMsg = 'wwwwww沙盒';

                $scope.testResults = ['test0', 'test1', 'test2'];
            });
        }
    };



});

//app.directive('itunesSearchDirective', function() {
//    return {
//        restrict: 'AE',
//        template: '<p>Hello {{name}}!</p>',
//        controller: function($scope, $element){
//            $scope.name = $scope.name + "Second ";
//        },
//        link: function(scope, el, attr) {
//            scope.name = scope.name + "Third ";
//        }
//    }
//})