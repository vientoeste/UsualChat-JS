**<span style="font-size:250%">Development Document</span>**

------------------------

# 개선 사항
## 현존하는 문제점
- 이미지가 아닌 파일들도 chat.njk, app.js에서 file이 아닌 img로 처리되고 있음(이후 파일 다운로드 버튼 등 제작 시 문제 발생)
- 파일 업로드 시 다운로드 버튼이 바로 생성되지 않음(새로고침 하거나 다른 클라이언트들은 바로 볼 수 있음) -> chat.njk에서 img 생성할 때 만들도록
- 방 삭제 시 방장 및 다른 연결된 클라이언트들에게 뜨는 메시지 변경 필요(현재 메시지를 아예 삭제한 상태)
- socket.io v2.4.1에서 4.x로 마이그레이션 필요
- mongoose v5.13.15에서 6.x로 마이그레이션 필요
## 추후 수정할 기능들
- MongoDB ODM 로직 개선
- 유저 프로필 사진(혹은 아이콘) 설정
- electron으로 Window app publish / cordova 사용 고려(Android Studio SDK 사용을 원칙으로 하나 구현 실패 시 cordova 사용)
- 파일 구조 개선 필요
- 회원 탈퇴 기능 중 라우팅 구조 수정 필요(/deluser에 GET 요청으로 처리 중)
- 다크 테마
- 채팅 시간 띄우기
- 대화 내역 내보내기(xlsx 사용)
- 메일 서비스를 통해 친구 추가 시 메일 발송 등의 기능 추가하기
- /friend/:id/delete 로직 수정 필요

-----------------------------

# commit 별 수정 사항
## b014819
- 방 삭제 시 연결된 모든 유저 새로고침(로직 개선 필요)
- Room.owner, req.username이 undefined이어서 방장이 아니어도 /room/:id/delete의 if문 실행. 후자를 req.session.username으로 수정

## ee5fb4d
- 방 삭제 요청을 /room/:id/delete - GET에서 /room/:id - DELETE로 수정(방장 전용 버튼에 이벤트 리스너 등록, axios.delete로 요청)
- 방장이 아닐 시 방 삭제 요청을 보낼 수 없도록 수정
- Room.owner -> findByID를 통해 owner 속성을 DB에서 쿼리하도록 수정

## 2b19de9, dee99c3
- 취약점 개선을 위한 임시 커밋
- socket.io 버전이 2.4.1에서 3.x로 마이그레이션됨에 따라 기본 쿠키를 사용하지 않아 오류 발생(socket.js에서 req.session.username 등 인식 불가). 다시 2.4.1 사용 중
- nunjucks.configure의 watch 속성에서 chokidar를 사용해 패키지 재포함
- mongoose 버전이 5에서 6으로 마이그레이션됨에 따라 더 이상 useCreateIndex 속성을 사용하지 않음. 다시 5.13.14 사용 중
- socket.io, mongoose 외 다른 패키지들은 모두 버전 올림(2022-05-06 기준)

## 29ef107
- index.html 제거(테스트 용도로 사용했음)
- 친구 관리를 위해 main.html 및 css 수정
- 존재하지 않는 방 액세스 시 메인 화면으로 리다이렉트(오류 메시지 삭제)
- 로그아웃 버튼 클릭 시 세션 destroy

## 236ec68
- 방장이 아닌 참가자들의 채팅이 제대로 라우팅되지 않는 문제 해결(queryselector 순서 바꿈으로 해결됨. 이유 조사 및 문서화 필요)

## 3f7758d
- 회원가입 관련 html 수정

## d3524f7
- 채팅방 참여자 이미지 업로드 문제 해결
- 회원 탈퇴 기능 구현(라우팅 구조 수정 필요)
- Friend 다큐먼트 구성

## ff77b4f
- file queryselector에서 오류가 발생해 해당 라인들 주석 처리
- 친구 요청 전송 데이터베이스 구현(스키마: sender, receiver, isAccepted, date)

## 0358409
- 친구 요청 list 제공
- 라우터('/') 내 기능 일부 구현(DB 쿼리, render parameter 설정 등)

## e760a51
- 친구 요청 수락/거절 기능 구현
- 친구 list 제공

## 76fca14
- Room schema에 isDM(boolean) 속성을 추가해 1:1 채팅 기능의 기반 생성
- 간단한 로직 수정

## ee1e188
- 친구 삭제 기능 구현
- DM 로직(Room 사용 로직이랑 직접적인 연관) 수정 중
- schema 오류 수정

## 69795b0
- DM 구현 성공(main - 1:1 채팅 - 입장 버튼을 통해 사용자와 친구만 있는 방 이용 가능)(조건 부합 시 id를 DB에 쿼리하여 `redirect('/room/:id')`하는 로직)

## 09a994e
- 친구 삭제 시 DM 삭제
- DM 관련 로직 개선(mongoose - $or을 사용해 쿼리 횟수를 줄임)

## cd33f56
- 서비스 고도화를 위해 response-time 미들웨어를 추가해 1초 이상 걸린 요청 logging
- Readme.md 수정
- package-lock.json 삭제

## 87f2e46
- 친구 표시 오류 수정
- ODM 사용 일부 로직 개선(불필요한 객체 배열을 빼 복잡도 감소)

## 360419d
- Indent 일부 수정(login.njk) 및 비명시적 변수명 변경
- 로그인 화면 css 일부 수정
- (방장 한정)대화 내역 삭제 기능 추가

## 182ae7f, ce838a7, f4b7258
- 방장 외 참가자 대화 내역 삭제 기능 추가(flag 컬렉션 생성)
- 친구 삭제 시 Flag, Chat, Room(dm) 모두 제거
- 회원 탈퇴 시 친구 제거

## bf3e84b
- nodemon 버전 업
- indent, space 조정
- public domain 구축, 포트포워딩 설정 후 open 및 테스트 완료

## 
- jwt 인증을 위한 임시 커밋
----------------------------------------

# ref info
- HTML form 태그 등에서는 HTTP METHOD 중 PUT, DELETE 등을 지원하지 않는다
    * sol. socket.io 사용 시, 소켓 이벤트 발생 시 delete 요청을 보내도록 처리
        + 현재 DELETE 요청을 사용할 수 없어 모두 새로운 하위 경로에 POST 요청으로 처리하고 있음
        + HTML 사이드에서 DELETE 요청을 보내는 방법을 찾을 필요가 있음
            * `document.querySelector(#__).addEventListener('submit', () => { axios.delete ~~ })`으로 처리할 수 있는지 확인해야 함
            * `<button action='/경로' method='delete'>` 등으로 DELETE 요청을 보내고자 해도 자동으로 GET 요청으로 처리
- /:id 경로(MongoDB 기준 _id 항목) 사용 시 req.params.id로 해당 id에 접근할 수 있다
- form 태그에서 POST 요청을 생성할 때 'input 내의 값'을 서버에 전달한다 - `req.body.{input.name}`로 접근