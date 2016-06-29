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

    function blobToDataURI(addedFileItems, dealIndex){
        console.log("runned");
        var reader = new FileReader();
        reader.addEventListener("load", function (event) {
            // Here you can use `e.target.result` or `this.result`
            // and `f.name`.
            var aImg = event.target.result;
            var compressImgData = compression(aImg);
            var compressImg = dataURItoBlob(compressImgData);
            addedFileItems[dealIndex]._file = compressImg;

            dealIndex++;
            console.log("compressed");
            //if compress all, upload all
            if (dealIndex == addedFileItems.length){
                $scope.progressNum = 50;
                uploader.uploadAll();
            }else {
                blobToDataURI(addedFileItems, dealIndex);
            }
        }, false);
        reader.readAsDataURL(addedFileItems[dealIndex]._file);
    }

    function compression(dataURI) {
        var source_img = new Image();
        source_img.src = dataURI;

        //创建画布
        var cvs = document.createElement('canvas');
        cvs.width = source_img.naturalWidth;
        cvs.height = source_img.naturalHeight;
        //把原始照片转移到画布上
        cvs.getContext('2d').drawImage(source_img, 0, 0);

        //图片压缩质量0到1之间可调
        var quality = 0.1;
        //默认图片输出格式png，可调成jpg
        var new_img = cvs.toDataURL("image/jpeg", quality);
        return new_img;
    }

    function dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {type:mimeString});
    }

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3
        //removeAfterUpload:true
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });

    $scope.deletFile = function () {
        uploader.clearQueue();
    };

    var fileUrls = new Array();

    uploader.onAfterAddingFile = function (fileItem) {

    };

    uploader.onAfterAddingAll = function (addedFileItems) {
        $scope.progressNum = 10;
        //递归函数 Fix Safari Bug
        blobToDataURI(addedFileItems, 0);
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