/**
 * Created by cailong on 16/6/12.
 */

var app = angular.module('taskDetailMobContent', []);
app.controller('taskDetailMobControl', function($scope, $http, $location) {
    var appurlList = $location.absUrl().split('/');
    var appleId = appurlList[appurlList.length - 1];

    var detailUrl = '/taskDetail/detail' + '/' + appleId;
    $http.get(detailUrl).success(function (response) {
        $scope.oneAppInfo = response.oneAppInfo;
    });

    var prepareSaveApp = undefined;

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });

    uploader.onAfterAddingAll = function (addedFileItems) {
        $scope.files = addedFileItems;
        console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function (item) {
        console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function (fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function (progress) {
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function (fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function (fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);

        var appUrl = 'addTask/' + prepareSaveApp.appExcTaskObjectID;

        $http.post(appUrl, {
                'extUserName':response.extUserName,
                'requirementImg': response.fileUrlList
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            });
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');
    };

    $scope.normalBtnShow = 0;
    if (getCookie('uploadImgName').length == 0) {
        normalBtnShow = 0;
    } else {
        normalBtnShow = 1;
    }

    console.log('start' + getCookie('uploadImgName'));
    setCookie('uploadImgName', 'wujiangwei', 365);
    console.log('end' + getCookie('uploadImgName'))

});


    







