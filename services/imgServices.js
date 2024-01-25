const {query} = require("../vitals/sqlconn");
const imgExts = [
    ".JPG", ".JPEG", ".PNG", ".GIF", ".SVG", ".WEBP", ".BMP", ".ICO", ".APNG", ".AVIF", ".TIFF"
]

const imgServices = {
    async getImgCount(containerId){
        let count = await query('SELECT COUNT(*) c FROM resources WHERE container_id = ? AND file_ext IN (?)', [containerId, imgExts]);
        return count[0].c;
    },
    async getAllImgs(userInfo, containerId, page, pageSize){
        let o_result = await query('SELECT * FROM resources WHERE container_id = ? AND file_ext IN (?) LIMIT ?, ?',
        [containerId, imgExts, (page - 1) * pageSize, pageSize]);
        let results = [];
        for(let item of o_result){
            let result = {
                img_id: item.resource_id,
                user_name: userInfo.user_name,
                file_ext: item.file_ext.split(".")[1],
                distribute_url: "None",
                create_time: item.create_time,
                allow_distribute: 0,
                allow_compress: 0
            }
            results.push(result);
        }
        return results;
    },
    async getApiKeyByContainerId(containerId){
        let api_keys = await query('SELECT * FROM api_keys WHERE container_id = ?', [containerId]);
        return api_keys[0];
    },
}

module.exports = imgServices;