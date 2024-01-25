let express = require('express');
let router = express.Router();
let auth = require("../middlewares/auth");

const resourceControllers = require("../../../controllers/resourceControllers");

// 容器级操作（必须鉴权）
router.get("/getContainers", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.getContainers);

router.get("/getContainerInfoById", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.getContainerInfoById);

router.get("/getResourcesByContainerId", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.getResourcesByContainerId);

router.post("/rename/[0-9]{15,18}", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.renameResource);

router.post("/delete/[0-9]{15,18}", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.deleteResource);

//（必须使用账户类型的key）
router.post("/createNewContainer", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.createNewContainer);

router.post("/editContainerInfo", auth.authInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.editContainerInfo);

// 限制级操作（必须使用token鉴权）
router.post("/removeContainer", auth.authInitialize, auth.tokenAuth, auth.authFinalize, resourceControllers.removeContainer);

router.get('/getObjectInfoById', auth.authInitialize, auth.tokenAuth, auth.authFinalize, resourceControllers.getObjectInfoById);

router.get('/getImgApiKeys', auth.authInitialize, auth.tokenAuth, auth.authFinalize, resourceControllers.getImgApiKeys);

router.post('/createImgApiKey', auth.authInitialize, auth.tokenAuth, auth.authFinalize, resourceControllers.createImgApiKey);

router.post('/deleteImgApiKey', auth.authInitialize, auth.tokenAuth, auth.authFinalize, resourceControllers.deleteImgApiKey);

// 资源级操作（当默认权限级别宽松时，可以不鉴权）
router.post("/upload", auth.unforcedAuthInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, resourceControllers.beforeUploadCheck, 
            resourceControllers.multerMiddleware.single('file'), resourceControllers.uploadResource, resourceControllers.uploadResourceAfter);

router.get("/download/[0-9]{15,18}", auth.unforcedAuthInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, 
            resourceControllers.downloadResource);

router.get("/get/[0-9]{15,18}", auth.unforcedAuthInitialize, auth.tokenAuth, auth.serviceKeyAuth, auth.authFinalize, 
            resourceControllers.getResource, resourceControllers.getResourceAfter);

module.exports = router;