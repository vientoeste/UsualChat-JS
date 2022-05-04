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


# 현존하는 문제점
- 방 삭제 등의 이벤트가 socket.io 기반으로 돌아가게 설계되었으나 라우팅 기반으로 동작 중(socket 이벤트 발생 x)
- 방 삭제 시 연결되어 있던 클라이언트들을 메인 화면으로(방 접속을 끊거나 리다이렉트 혹은 새로고침)
- 이미지가 아닌 파일들도 chat.njk, app.js에서 file이 아닌 img로 처리되고 있음(이후 파일 다운로드 버튼 등 제작 시 문제 발생)
- 파일 업로드 시 다운로드 버튼이 바로 생성되지 않음(새로고침 하거나 다른 클라이언트들은 바로 볼 수 있음)