/**
 * Created by apple on 6/30/16.
 */

var app=angular.module('indexAPP', ['angular-scroll-animate']);

app.directive("mynav",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/zy/navbar.html'
    };
});

app.controller('scrollController', ['$scope', '$location', '$anchorScroll',
    function ($scope, $location, $anchorScroll) {
        $scope.goToNextWindow = function() {
            // set the location.hash to the id of
            // the element you wish to scroll to.
            $location.hash('scrollerMarker');
            // call $anchorScroll()
            $anchorScroll();
        };
    }]);

app.controller('scrollHide', ['$scope', function($scope, $window) {
    $scope.showUp = true;
    var heightOfNav = 51;
    var height = $(window).innerHeight() - heightOfNav;
    console.log(height);
    //detect scroll
    $(window).scroll(function (event) {
        var scroll = $(window).scrollTop();
        if(scroll> 50 || scroll==undefined){
            $scope.showUp = false;
        }else{
            $scope.showUp = true;
        }
        $scope.$apply();
    });
}]);