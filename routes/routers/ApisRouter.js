let express = require('express');
let router = express.Router();
let userRouter = require("./api/userRouter.js");
let infoRouter = require("./api/infoRouter.js");
let resourceRouter = require("./api/resourceRouter.js");
let noticeRouter = require("./api/noticeRouter.js");

router.use('/user', userRouter);

router.use('/info', infoRouter);

router.use('/resource', resourceRouter);

router.use('/notice', noticeRouter);

module.exports = router;