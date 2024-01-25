const {query} = require("../vitals/sqlconn");

const infoServices = {
    async getNotices(first, rows){
        let result = await query("SELECT * FROM notices LIMIT ?, ?", [Number(first), Number(rows)]);
        return result;
    },
}

module.exports = infoServices;