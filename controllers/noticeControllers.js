const noticeServices = require("../services/noticeServices");
const responses = require("../vitals/responses");

module.exports = {
    /**
     * 获取站点公告
     * @param {*} req 
     * @param {*} res 
     */
    async getNotices(req, res) {
        try{
            let notices = await noticeServices.getNotices(req.query.first, req.query.rows);
            res.status(200).json(responses.SUCCESS(notices));
        } catch(e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
}