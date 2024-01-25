let express = require('express');
let router = express.Router();
let auth = require("./middlewares/auth");
let apiKeyAuth = require('./middlewares/apiKeyAuth')
const imgControllers = require("../../controllers/imgControllers");
const resourceControllers = require('../../controllers/resourceControllers');

router.get("/image/get_img_count", auth.authInitialize, apiKeyAuth, auth.authFinalize, imgControllers.getImgCount);

router.get("/image/get_all_imgs", auth.authInitialize, apiKeyAuth, auth.authFinalize, imgControllers.getAllImgs);

router.get("/image/[0-9]{10, 18}", imgControllers.getImgPre, resourceControllers.getResource, imgControllers.getImgAfter);

router.get("/image/delete_img", auth.authInitialize, apiKeyAuth, auth.authFinalize, imgControllers.deleteImgPre, resourceControllers.deleteResource);

router.post("/upload/img", auth.authInitialize, apiKeyAuth, auth.authFinalize, imgControllers.uploadImgPre, resourceControllers.beforeUploadCheck,
             resourceControllers.multerMiddleware.single('img'), resourceControllers.uploadResource, imgControllers.uploadImgAfter);

router.post("/upload/imgbase64", auth.authInitialize, apiKeyAuth, auth.authFinalize, imgControllers.uploadImgPre, resourceControllers.beforeUploadCheck,
             imgControllers.uploadImgBase64, resourceControllers.uploadResource, imgControllers.uploadImgAfter);


module.exports = router;