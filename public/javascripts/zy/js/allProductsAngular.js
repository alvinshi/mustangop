/**
 * Created by apple on 7/3/16.
 */
var app = angular.module("myApp", []);

app.directive("mynav",function(){
    return {
        restrict: 'E',
        templateUrl: 'navbar.html'
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

app.controller("myCtrl", ["$scope", function($scope){
    $scope.captionCtrl = new Array(6);
    for (var i=0; i<6; i++){
        $scope.captionCtrl[i] = false;
    };
    $scope.captionOn = function(num){
        $scope.captionCtrl[num] = true;
    };
    $scope.captionOff = function(num){
        $scope.captionCtrl[num] = false;
    };
}])