let express = require('express');
let router = express.Router();

let apisRouter = require('./routers/ApisRouter')
let imgApisRouter = require('./routers/imgApisRouter')

router.use('/api', apisRouter);
router.use('/', imgApisRouter);

module.exports = router;
