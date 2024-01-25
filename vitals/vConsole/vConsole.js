let _console = console;
function getTime() {
    let date = new Date(); // 当前日期时间
    let year = date.getFullYear(); // 年份
    let month = ('0'+(date.getMonth()+1)).slice(-2); // 月份+1
    let day = ('0'+date.getDate()).slice(-2); // 日
    let hour = ('0'+date.getHours()).slice(-2); // 小时
    let minute = ('0'+date.getMinutes()).slice(-2); // 分钟
    let second = ('0'+date.getSeconds()).slice(-2); // 秒数
    let millisecond = ('000'+date.getMilliseconds()).slice(-3); // 毫秒数0-999
    return (year + '-' + month + '-' + day + ' ' + 
        hour + ':' + minute + ':' + second + '.' + millisecond);
}
let newConsole = {
    log() {
        _console.log("[LOG]", "[" + getTime() + "]", ...arguments);
    },
    info() {
        _console.log("\x1b[34m%s\x1b[0m", "[INFO]", "[" + getTime() + "]", ...arguments);
    },
    error() {
        _console.log("\x1b[31m%s\x1b[0m", "[ERROR]", "[" + getTime() + "]", ...arguments);
    },
    fatal_error() {
        _console.log("\x1b[31m%s", "[FATAL ERROR]", "[" + getTime() + "]", ...arguments);
    },
    warn() {
        _console.log("\x1b[33m%s", "[WARN]", "[" + getTime() + "]", ...arguments);
    }
}

console = newConsole;