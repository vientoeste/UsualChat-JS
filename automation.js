const fs = require('fs');
const path = require('path');
const readline = require('readline');

function nodemonapp() {
    //Windows 환경에서 nodemon으로 서버 실행하는 batch파일 생성
    let string =
`cd ${path.dirname(__filename)}
nodemon app`;
    fs.appendFile('launchServer.bat', string, err => {
        if(err) throw err;
        console.log(`nodemon app complete`);
    })
}
nodemonapp();

function mongo(ver) {
//test용 mongodb 실행
    let string1 = `cd C:\\program files\\mongodb\\server\\${ver}\\bin
mongod`
    let string2 = `cd C:\\program files\\mongodb\\server\\${ver}\\bin
mongo`
    fs.appendFile('mongod.bat', string1, err => {
        if (err)
            throw err;
        console.log(`mongod complete; --auth needed`);
    })
    fs.appendFile('mongo.bat', string2, err => {
        if (err)
            throw err;
        console.log(`mongo complete; --auth & id/pw needed`);
    })
}
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// })
// let dbver;
// rl.on('line', async(line) => {
//     dbver = line;       
//     mongo(dbver);   
//     console.log(`입력된 버전은 ${dbver}입니다.`, line);    
//     rl.close();    
 
// })
// rl.on('close', () => {
//     process.exit();
// })
fs.appendFile('.env', `COOKIE_SECRET=usualchat
MONGO_ID=
MONGO_PASSWORD=`, err => {
    if(err) throw(err);
    console.log(`dotenv complete; Please add mongodb\`s ID/PW to start the server`);
});
mongo('5.0')