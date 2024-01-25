const nodemailer = require("nodemailer");
const template = require('art-template');
const fs = require('fs');

const keywords = {
    inscribe: "智码携航CodesOcean",
    siteName: "OceanStorage"
}

let sendValidateCode = (to, validateCode, timeLimit) => new Promise((resolve, reject) => {
    try{
        const config = {
            host: "smtp.163.com",
            secure:false,
            auth: {
                user: 'peci_official@163.com',
                pass: 'UQYTIYMNIERYMJVI'
            }
        }
    
        const transporter = nodemailer.createTransport('SMTP',config);
    
        let data = fs.readFileSync("./vitals/mail.html");
        
        let ret = template.render(data + "", {
            validateCode: validateCode,
            timeLimit: timeLimit,
            inscribe: keywords.inscribe,
            siteName: keywords.siteName
        })
        const mail = {
            from: `"${keywords.inscribe}"<peci_official@163.com>`,
            subject: `[${keywords.siteName}] 电子邮箱验证码`,
            to: to,
            html: ret
        }
        transporter.sendMail(mail, (err, info) => {
            if(err){
                reject(err);
            } else {
                resolve();
            }
        })
    } catch(err){
        reject();
    }
})

module.exports = {
    sendValidateCode
};