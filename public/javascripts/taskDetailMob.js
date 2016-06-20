/**
 * Created by cailong on 16/6/12.
 */

var app = angular.module('taskDetailMobContent', ['angularFileUpload']);
app.controller('taskDetailMobControl', function($scope, $http, $location, FileUploader) {
    var appurlList = $location.absUrl().split('/');
    var appleId = appurlList[appurlList.length - 1];

    var detailUrl = '/taskDetailMobile/single' + '/' + appleId;
    $http.get(detailUrl).success(function (response) {
        $scope.oneAppInfo = response.oneAppInfo;
        console.log('--------++++++' + response.macTask);
        $scope.taskInfo = response.macTask;

    });

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3,
        removeAfterUpload:true
    });


    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });

    var fileUrls = new Array();

    uploader.onAfterAddingAll = function (addedFileItems) {
        uploader.uploadAll();
        console.info('onAfterAddingAll', addedFileItems);
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
        fileUrls.push(response.fileUrlList[0]);
        console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');

        var appUrl = '/taskDetailMobile/addTask/' + $scope.oneAppInfo.taskObjectId;

        $http.post(appUrl, {
                'uploadName':getCookie('uploadImgName'),
                'requirementImgs': fileUrls
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                $scope.uploadName = response.uploadName;
                $scope.images = response.requirementImgs;

                uploader.clearQueue();
                fileUrls = new Array();
            });
    };

    console.info('uploader', uploader);

    $scope.normalBtnShow = 1;
    if (getCookie('uploadImgName').length > 0) {
        $scope.normalBtnShow = 0;
    } else {
        $scope.normalBtnShow = 1;
    }

    $scope.saveUploadName = function() {
        if ($scope.uploadName != undefined && $scope.uploadName.length > 0) {
            setCookie('uploadImgName', $scope.uploadName, 365);
            $scope.uploadNameError = '';
            $scope.normalBtnShow = 0;
        }else {
            $scope.uploadNameError = '昵称不能为空';
        }
    };

});