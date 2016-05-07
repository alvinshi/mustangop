/**
 * Created by wujiangwei on 16/5/5.
 */
var app=angular.module('myApp',[]);

app.controller('namesCtrl', function($scope) {
    $scope.names = [
        {name:'Jani',country:'Test'},
        {name:'Hege',country:'Sweden'},
        {name:'Kai',country:'Denmark'}
    ];
    $scope.name = 'First ';
});

app.directive('exampleDirective', function() {
    return {
        restrict: 'E',
        template: '<p>Hello {{name}}!</p>',
        controller: function($scope, $element){
            $scope.name = $scope.name + "Second ";
        },
        link: function(scope, el, attr) {
            scope.name = scope.name + "Third ";
        }
    }
})

