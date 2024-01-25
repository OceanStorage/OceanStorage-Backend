let _idCounter = 0;
function generateUniqueID() {
    let parts = String(Date.now());
    let str = ('' + Math.floor(Math.random()*1000000)+1000000).substring(1, 2);
    let id = parts + str + String(_idCounter ++);
    if(_idCounter == 10) _idCounter = 0;
    return id;
}

module.exports = generateUniqueID;