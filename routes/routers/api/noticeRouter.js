let express = require('express');
let router = express.Router();
let auth = require("../middlewares/auth");

const noticeControllers = require("../../../controllers/noticeControllers");

router.get("/getNotices", noticeControllers.getNotices);

module.exports = router;