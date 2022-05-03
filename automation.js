const fs = require('fs');
const path = require('path');

console.log(path.dirname(__filename));
let string = `cd ${path.dirname(__filename)}
nodemon app`;
fs.appendFile('launchServer.bat', string, err => {
    if(err) throw err;
    console.log(`complete`);
})