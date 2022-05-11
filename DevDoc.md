# 개선 사항
## 현존하는 문제점
- 이미지가 아닌 파일들도 chat.njk, app.js에서 file이 아닌 img로 처리되고 있음(이후 파일 다운로드 버튼 등 제작 시 문제 발생)
- 파일 업로드 시 다운로드 버튼이 바로 생성되지 않음(새로고침 하거나 다른 클라이언트들은 바로 볼 수 있음) -> chat.njk에서 img 생성할 때 만들도록
- 방 삭제 시 방장 및 다른 연결된 클라이언트들에게 뜨는 메시지 변경 필요(현재 메시지를 아예 삭제한 상태)
- socket.io v2.4.1에서 4.x로 마이그레이션 필요
- mongoose v5.13.15에서 6.x로 마이그레이션 필요
## 추후 수정할 기능들
- User - N:M 관계로 친구 추가 기능 구현
- 메인('/')화면에서 친구 목록 및 1:1 채팅 기능 구현(1:1 채팅방은 방 목록에 보이지 않도록)
- MongoDB ODM 로직 개선
- 유저 프로필 사진(혹은 아이콘) 설정
- electron으로 Window app publish / cordova 사용 고려(Android Studio SDK 사용을 원칙으로 하나 구현 실패 시 cordova 사용)
- 파일 구조 개선 필요
- 회원 탈퇴 기능 중 라우팅 구조 수정 필요(/deluser에 GET 요청으로 처리 중)


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