const infoServices = require("../services/infoServices");
const responses = require("../vitals/responses");
const moment = require("moment");

module.exports = {
    /**
     * 获取站点信息（资源存量、用户数量等）
     * @param {*} req 
     * @param {*} res 
     */
    async getSiteInfo(req, res) {
        try {
            let siteInfo = await infoServices.getSiteFileInfo();
            res.status(200).json(responses.SUCCESS(siteInfo));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 获取账户信息（包括用量信息）
     * @param {*} req 
     * @param {*} res 
     */
    async getClientInfo(req, res) {
        try {
            let clientInfo = await infoServices.getClientInfo(req.authInfo.user.user_id);
            res.status(200).json(responses.SUCCESS(clientInfo));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getVisitStatisticsByDay(req, res) {
        try {
            const result = [];
            const date = new Date(); // 获取当前日期  
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); // 获取当天的开始时间  
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - 1; // 获取下一天的开始时间  
            for (let i = 0; i < 30; i++) {
                const startTime = new Date(startOfDay - i * 24 * 60 * 60 * 1000); // 调整日期，获取前一天的开始时间  
                const endTime = new Date(endOfDay - i * 24 * 60 * 60 * 1000); // 调整日期，获取前一天的结束时间
                result.unshift({ label: moment(startTime).format("MM-DD"), value: await infoServices.getVisitLogSizeSum(req.authInfo.user.user_id, startTime, endTime) });
            }
            res.status(200).json(responses.SUCCESS(result));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getVisitStatisticsByWeek(req, res) {
        try {
            const result = [];
            const date = new Date(); // 获取当前日期  
            const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1).getTime();
            const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000 - 1;
            for (let i = 0; i < 12; i++) {
                const startTime = new Date(startOfWeek - i * 7 * 24 * 60 * 60 * 1000);
                const endTime = new Date(endOfWeek - i * 7 * 24 * 60 * 60 * 1000);
                let firstDayOfYear = new Date(new Date(startTime).getFullYear(), 0, 1);
                let firstWeekDayOfYear = new Date(firstDayOfYear.getFullYear(), firstDayOfYear.getMonth(), firstDayOfYear.getDate() - firstDayOfYear.getDay() + 1).getTime();
                // 计算两个日期之间的天数差  
                let dayDiff = Math.floor((startTime - firstWeekDayOfYear) / (1000 * 60 * 60 * 24));
                // 计算今年的周数  
                let weekDiff = Math.ceil(dayDiff / 7) + 1;
                result.unshift({ label: `${weekDiff}周（${moment(startTime).format("MM-DD")}）`, value: await infoServices.getVisitLogSizeSum(req.authInfo.user.user_id, startTime, endTime) });
            }
            res.status(200).json(responses.SUCCESS(result));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getVisitStatisticsByMonth(req, res) {
        try {
            let result = []; //先创建一个空数组，方便后面存储日期数据
            let d = new Date();  // 当前时间
            let year = d.getFullYear(); // 当前年份
            d.setMonth(d.getMonth() + 1, 1); //设置月份,设置当前日为1号 （避免出现31号时候，其他月份没有31号的bug）
            for (let i = 0; i < 12; i++) { //开始循环
                d.setMonth(d.getMonth() - 1); //月份值-1  循环的时候在当前月份上减一 来获取上个月的月份（0 ~ 11）
                let m = d.getMonth() + 1;  // 月份 + 1 来获取真正的月份 （1 ~ 12）
                m = m < 10 ? "0" + m : m;  //三元表达式来判断 如果小于10月 给前面 +0 如果大于等于10月 则不变输出
                result.push(d.getFullYear() + "-" + m); //将 循环出来的 年月 一次 存放进 result 数组中
            }
            let statistics = [];
            for(let month of result){
                const startOfMonth = moment(month + "-01");
                const endOfMonth = new Date(startOfMonth).getTime() + startOfMonth.daysInMonth() * 1000 * 60 * 60 * 24 - 1;
                statistics.unshift({ label: moment(startOfMonth).format("YYYY-MM"), 
                value: await infoServices.getVisitLogSizeSum(req.authInfo.user.user_id, startOfMonth.format("YYYY-MM-DD HH:mm:ss"), moment(endOfMonth).format("YYYY-MM-DD HH:mm:ss")) });
            }
            res.status(200).json(responses.SUCCESS(statistics));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getVisitLogByPage(req, res) {
        try {
            let statistics = await infoServices.getVisitLogByPage(req.authInfo.user.user_id, Number(req.query.pageSize), Number(req.query.pageNum));
            res.status(200).json(responses.SUCCESS(statistics));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getApiLogByVisitLogId(req, res) {
        try {
            let results = await infoServices.getApiLogByVisitLogId(req.authInfo.user.user_id, req.query.visitLogId);
            res.status(200).json(responses.SUCCESS(results));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
}