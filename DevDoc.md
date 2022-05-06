# 현존하는 문제점
- 이미지가 아닌 파일들도 chat.njk, app.js에서 file이 아닌 img로 처리되고 있음(이후 파일 다운로드 버튼 등 제작 시 문제 발생)
- 파일 업로드 시 다운로드 버튼이 바로 생성되지 않음(새로고침 하거나 다른 클라이언트들은 바로 볼 수 있음)
- 방 삭제 시 방장 및 다른 연결된 클라이언트들에게 뜨는 메시지 변경 필요

# commit 별 수정 사항
## b014819
- 방 삭제 시 연결된 모든 유저 새로고침(로직 개선 필요)
- Room.owner, req.username이 undefined이어서 방장이 아니어도 /room/:id/delete의 if문 실행. 후자를 req.session.username으로 수정

## ee5fb4d
- 방 삭제 요청을 /room/:id/delete - GET에서 /room/:id - DELETE로 수정(방장 전용 버튼에 이벤트 리스너 등록, axios.delete로 요청)
- 방장이 아닐 시 방 삭제 요청을 보낼 수 없도록 수정
- Room.owner -> findByID를 통해 owner 속성을 DB에서 쿼리하도록 수정

##
- 취약점 개선을 위한 임시 커밋