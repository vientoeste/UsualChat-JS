# UsualChat
Chatting application for Web, Mobile devices



# 서버를 실행하기 위한 프로세스
- code clone 후 `node automation`을 통해 batch 파일 3개 생성
- mongod - mongo 순서로 실행 후 mongo 콘솔에서
```
use admin
db.createUser({ user: '유저이름', pwd: '비밀번호', roles: ['root'] })
```
- 실행 후 콘솔에서 `mongod --auth, mongo -u 유저이름 -p 비밀번호` 입력을 통해 DB에 root 권한으로 접속

- .env 파일에 DB ID/PW 입력 후 launchServer.bat 실행 시 서버 실행