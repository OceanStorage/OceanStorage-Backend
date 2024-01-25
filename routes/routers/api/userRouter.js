let express = require('express');
let router = express.Router();
let auth = require("../middlewares/auth");

// TODO：注册的时候默认用户的用户组和过期时间设置成config中的默认设置

const userControllers = require("../../../controllers/userControllers");

router.post('/register', userControllers.register);

router.post('/login', userControllers.login);

router.post('/checkUserName', userControllers.checkUsername);

router.get('/getValidateMethods', userControllers.getValidateMethods);

router.post('/sendValidateCode', auth.unforcedAuthInitialize, auth.tokenAuth, auth.authFinalize, userControllers.sendValidateCode);

router.post('/verifyValidateCode', auth.unforcedAuthInitialize, auth.tokenAuth, auth.authFinalize, userControllers.verifyValidateCode);

router.post('/changePassword', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.changePassword);

router.post('/createNewServiceKey', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.createNewServiceKey);

router.get('/getUserGroupInfo', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.getUserGroupInfo);

router.get('/getUserUsageInfo', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.getUserUsageInfo);

router.get('/getAllServiceKeys', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.getAllServiceKeys);

router.post('/deleteServiceKey', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.deleteServiceKey);

router.post('/useGiftCard', auth.authInitialize, auth.tokenAuth, auth.authFinalize, userControllers.useGiftCard);


module.exports = router;