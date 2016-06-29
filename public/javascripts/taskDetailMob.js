/**
 * Created by cailong on 16/6/12.
 */

var app = angular.module('yemaWebApp', ['angularFileUpload']);
var navIndex = 2;

app.controller('taskDetailMobControl', function($scope, $http, $location, FileUploader) {
    var appurlList = $location.absUrl().split('/');
    var excTaskId = appurlList[appurlList.length - 1];

    var detailUrl = '/taskDetailMobile/single' + '/' + excTaskId;
    $http.get(detailUrl).success(function (response) {
        $scope.oneAppInfo = response.oneAppInfo;
        $scope.images = response.macTask;

    });

    var imageArray = new Array();
    var index = 0;
    var uploadIndex = 0;

    function blobToDataURI(file){
        console.log("runned");
        var reader = new FileReader();
        reader.onload = function(event) {
            $scope.$apply(function(){
                //compress img
                var aImg = event.target.result;
                var compressImgData = compression(aImg);
                var compressImg = dataURItoBlob(compressImgData);
                $scope.addedFileItems[index]._file = compressImg;

                index++;

                //if compress all, upload all
                if (index == $scope.addedFileItems.length){
                    uploader.uploadAll();
                }
            });
        };
        reader.readAsDataURL(file);
    };

    function compression(dataURI) {
        var source_img = new Image();
        source_img.src = dataURI;

        //创建画布
        var cvs = document.createElement('canvas');
        cvs.width = source_img.naturalWidth;
        cvs.height = source_img.naturalHeight;

        //把原始照片转移到画布上
        var ctx = cvs.getContext('2d').drawImage(source_img, 0, 0);

        //图片压缩质量0到1之间可调
        var quality = 0.1;

        //默认图片输出格式png，可调成jpg
        var new_img = cvs.toDataURL("image/jpeg", quality);
        return new_img;
    };

    function dataURItoBlob(dataURI) {
        var binary = atob(dataURI.split(',')[1]);
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var array = [];
        for(var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {type: mimeString});
    };

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3,
        removeAfterUpload:true,
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });

    $scope.deletFile = function () {
        index = 0;
        uploader.clearQueue();
    };

    var fileUrls = new Array();

    uploader.onAfterAddingFile = function (fileItem) {
        //blobToDataURI(fileItem._file);
    };

    uploader.onAfterAddingAll = function (addedFileItems) {
        $scope.progressNum = 50;
        $scope.addedFileItems = addedFileItems;
        for (var i = 0; i < addedFileItems.length; i++){
            blobToDataURI(addedFileItems[i]._file);
        }
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

        $scope.progressNum = 80;

        $http.post(appUrl, {
                'uploadName':$scope.uploadName,
                'requirementImgs': fileUrls
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                $scope.oneAppInfo.uploadName = response.uploadName;
                $scope.images = response.requirementImgs;

                $scope.progressNum = 0;
                
                index = 0;
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
            $scope.uploadNameError = '';
            $scope.normalBtnShow = 0;
        }else {
            $scope.uploadNameError = '昵称不能为空';
        }
    };

    $scope.commitConfirm = function(){
        location.href='/dailyTask/' + $scope.oneAppInfo.userObjectId;
    }

});