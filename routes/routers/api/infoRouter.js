let express = require('express');
let router = express.Router();
let auth = require("../middlewares/auth");

const infoControllers = require("../../../controllers/infoControllers");

router.get("/getSiteInfo", infoControllers.getSiteInfo);

router.get('/getClientInfo', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getClientInfo);

router.get('/getVisitStatisticsByDay', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getVisitStatisticsByDay);

router.get('/getVisitStatisticsByWeek', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getVisitStatisticsByWeek);

router.get('/getVisitStatisticsByMonth', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getVisitStatisticsByMonth);

router.get('/getVisitLogByPage', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getVisitLogByPage);

router.get('/getApiLogByVisitLogId', auth.authInitialize, auth.tokenAuth, auth.authFinalize, infoControllers.getApiLogByVisitLogId);

module.exports = router;