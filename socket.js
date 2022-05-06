const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');

module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });
  app.set('io', io);
  const room = io.of('/room');
  const chat = io.of('/chat');

  io.use((socket, next) => {
    cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, next);
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', (socket) => {
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    const { headers: { referer } } = req;
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
    socket.join(roomId);
    socket.to(roomId).emit('join', {
      user: 'system',
      chat: `${req.session.username}님이 입장하셨습니다.`,
    });

    // const connectSID = `${cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`;
    socket.on('deleteroom', () => { //when it raises?
            socket.broadcast.emit('reload');
            console.log('메인 화면으로 사용자 보냄');      
        //     axios.get(`http://localhost:3001/room/${roomId}/delete`, {
        //   headers: {
        //     Cookie: `connect.sid=s%3A${connectSID}`
        //   } 
        // })
        //   .then(() => {
            console.log(`방 ${roomId} 제거 요청 성공`);          

          // })
          // .catch((error) => {
          //   console.error(error);
          // });

    })

    socket.on('disconnect', () => {``
      console.log('chat 네임스페이스 접속 해제');
      socket.leave(roomId);
      socket.to(roomId).emit('exit', {
        user: 'system',
        chat: `${req.session.username}님이 퇴장하셨습니다.`,
      });
    });

    // socket.on('roomdeleted', () => {
    //   socket.broadcast.emit('reload');
    //   console.log('메인 화면으로 보냄')
    // });

    socket.on('chat', (data) => {
      socket.to(data.room).emit(data);
      console.log('socket-chat event 생성')
    });
  });
};