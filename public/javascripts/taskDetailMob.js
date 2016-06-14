/**
 * Created by cailong on 16/6/12.
 */

var app = angular.module('taskDetailMobContent', ['angularFileUpload']);
app.controller('taskDetailMobControl', function($scope, $http, $location, FileUploader) {
    var appurlList = $location.absUrl().split('/');
    var appleId = appurlList[appurlList.length - 1];

    var detailUrl = '/taskDetail/detail' + '/' + appleId;
    $http.get(detailUrl).success(function (response) {
        $scope.oneAppInfo = response.oneAppInfo;
    });

    $scope.Confirm = function(){
        var userUrl = '/taskDetailMobile/add/' + appleId;
        $http.post(userUrl,{'extUserName':$scope.extUserName}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

        })
    };


    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3
    });

    $scope.saveImage = function () {

        //一次只能保存一个任务,不支持多个同时保存
        if (!uploader.isUploading) {
            $scope.saveMgs = '';

            //上传成功的回掉里,保存换评参数
        } else {
            $scope.saveMgs = '请等待上个任务保存成功';
        }

    };

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

        var appUrl = '/taskDetailMobile/addTask/' + appleId;

        $http.post(appUrl, {
                'requirementImg': response.fileUrlList[0]
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            });
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');
    };

    console.info('uploader', uploader);

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


    







