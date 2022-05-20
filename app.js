const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require('mongoose');
const fs = require('fs');
const multer = require('multer');
const resTime = require('response-time');
const chalk = require('chalk');

dotenv.config();

const webSocket = require('./socket');
const connect = require('./schemas');

const Room = require('./schemas/room');
const Chat = require('./schemas/chat');
const Friend = require('./schemas/friend');

const app = express();

app.set('port', process.env.PORT || 3001);
app.set('view engine', 'njk');

nunjucks.configure('views', {
  express: app,
  watch: true,
});

const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
});

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use('/file', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(sessionMiddleware);
app.use(resTime((req, res, time) => {
  if(time >= 1000) {
    console.log('\x1b[1m',chalk.white.bgRed(`1초 이상(${time/1000}초) 걸린 요청: ${req.method} ${req.url}`))
  }
}))

app.use(passport.initialize());
app.use(passport.session());

connect();

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route('/').get(async (req, res, next) => {
  if (req.isUnauthenticated()) {
    res.redirect('login');
  } else {
    try {
      const un = req.session.username;
      const rooms = await Room.find({
        isDM: false
      });
      const friendreqs = await Friend.find({ 
        receiver: req.session.username, 
        isAccepted: false 
      });
      const accfriends = await Friend.find({
        $or: [{
          sender: req.session.username
        }, {
          receiver: req.session.username
        }],
        isAccepted: true
      })
      res.render('main', { un, rooms, friendreqs, accfriends, title: 'UsualChat' });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

app.route('/register')
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, newUser) => {
        if (err) {
          console.log(err);
          res.redirect('/login');
        } else {
          passport.authenticate('local')(req, res, () => {
            req.session.username = req.body.username;
            res.redirect('/');
          });
        }
      }
    );
  })

app.route('/friend')
  .post(async (req, res, next) => {
    let tmp = await User.findOne({ username: req.body.friend })
    try {
      if(!tmp) {
        res.redirect('/?error=존재하지 않는 유저입니다.')
      } else {
        await Friend.create({ 
          sender: req.session.username, 
          receiver: req.body.friend 
        })
        res.send('ok')
      }
    } catch (error) {
      console.error(error);
      next(error);
    }})

app.route('/friend/:id')
  .get((req, res) => {
    res.send('ok')
  })
  .post(async (req, res) => {
    await Friend.findByIdAndUpdate({
      _id: req.params.id
    }, {
      isAccepted: true
    })
    res.redirect('/')
  })

app.post('/friend/:id/deletereq', async (req, res) => {
  await Friend.findByIdAndDelete({
    _id: req.params.id
  })
  res.redirect('/')
})

app.post('/friend/:id/delete', async (req, res, next) => {
  try {
    const tmp = await Friend.findByIdAndDelete({
      _id: req.params.id
    })
    await Room.findByIdAndDelete({
      _id: tmp.dm
    })
  res.redirect('/')
  } catch(error) {
    console.log(error)
    next(error)
  }
})

app.get('/unregister', async (req, res) => {
  await User.remove({ username: req.session.username });
  res.redirect('/login')
})

app.route('/login')
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate('local')(req, res, () => {
          req.session.username = req.body.username;
          res.redirect('/');
        });
      }
    });
  });

app.route('/logout')
  .get((req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect('/');
  });

app.route('/room')
  .get((req, res) => {
    res.render('room', { title: 'UsualChat 채팅방 생성' });
  })
  .post(async (req, res, next) => {
    try {
      console.log(!!req.body.friend)
      if(!!req.body.friend) {
        req.body.title=req.body.friend;
      }
      const newRoom = await Room.create({
        title: req.body.title,
        max: req.body.max,
        owner: req.session.username,
        password: req.body.password,
        isDM: false,
      });
      const io = req.app.get('io');
      io.of('/room').emit('newRoom', newRoom);
      res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

app.route('/dm')
  .post(async (req, res, next) => {
    try {
      let dmroomid = 0;
      const tmp1 = await Room.find({
        isDM: true, 
        $or: [{
          owner: req.session.username,
          target: req.body.friend,
        }, {
          owner: req.body.friend,
          target: req.session.username
        }]
      }).then((rooms) => {
        if(rooms.length === 0) {
          return false;
        } else {
          dmroomid = rooms[0]._id;
          return true;
        }
      })
      const tmp3 = await Friend.find({ 
        $or: [{
          sender: req.body.friend,
          receiver: req.session.username
        }, {
          sender: req.session.username,
          receiver: req.body.friend
        }]
      }).then((friends) => {
        return friends[0]._id
      })
      if(tmp1===false) {
        const newRoom = await Room.create({
          title: 'Direct Message',
          max: 2,
          owner: req.session.username,
          isDM: true,
          target: req.body.friend,
        })
        await Friend.findOneAndUpdate({
          _id: tmp3
        }, {
          dm: newRoom._id,
        })
        console.log(`dm 생성 - id: ${newRoom._id}`)
        res.redirect(`/room/${newRoom._id}`);
      } else {
        res.redirect(`/room/${dmroomid}`);
      }
    } catch(error) {
      console.log(error);
      next(error);
    }
  })

app.route('/room/:id')
  .get(async (req, res, next) => {
    try {
      const room = await Room.findOne({ _id: req.params.id });
      const io = req.app.get('io');
      if (!room) {
        return res.redirect('/');
      }
      if (room.password && room.password !== req.query.password) {
        return res.redirect('/?error=비밀번호가 틀렸습니다.');
      }
      const { rooms } = io.of('/chat').adapter;
      if (
        rooms &&
        rooms[req.params.id] &&
        room.max <= rooms[req.params.id].length
      ) {
        return res.redirect('/?error=허용 인원을 초과하였습니다.');
      }
      const tmp = await User.find({
        username: req.session.username,
        [req.params.id]: { $exists: true, $ne: null }
      })
      console.log(!!tmp)
      let chats;
      if(!!tmp) {
        chats = await Chat.find({ room: room._id }).sort('createdAt');
      }
      else {
        const tmp2 = User.find({
          username: req.session.username
        }).then((items) => {
          let tmp3 = req.params.id
          return items[0].tmp3
        })
        console.log(tmp2)
        chats = await Chat.find({ room: room._id }).sort('createdAt')
      }
      return res.render('chat', {
        room,
        title: room.title,
        chats,
        user: req.session.username,
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  })
  .delete(async (req, res, next) => {
    let roomid = await Room.findById({ _id: req.params.id });
    if (roomid.owner === req.session.username) {
      try {        
        await req.app.get('io').of('/room').emit('removeRoom', req.params.id);
        const io = req.app.get('io');
        io.of('/chat').emit('reload');
        await Room.remove({ _id: req.params.id });
        await Chat.remove({ room: req.params.id });
        res.redirect('/')
      } catch (error) {
        console.error(error);
        next(error);
      }
    }
  })

app.post('/room/:id/clearchat', async (req, res, next) => {
  try {
    if(room.owner === req.session.username) {
      await Chat.deleteMany({
        room: req.params.id
      })      
    } else {
      await User.findOneAndUpdate({
        username: req.session.username
      }, {
        [req.params.id]: Date.now
      })
    }
    res.send('ok')
  } catch(error) {
    console.log(error);
    next(error);
  }
})

app.route('/room/:id/chat').post(async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.username,
      chat: req.body.chat,
    });
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

try {
  fs.readdirSync('uploads');
} catch (err) {
  console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
  fs.mkdirSync('uploads');
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, 'uploads/');
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      done(null, path.basename(file.originalname, ext) + Date.now() + ext);
      console.log(`${path.basename(file.originalname, ext)} / ${Date.now()} / ${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
});

app.post('/room/:id/img', upload.single('img'), async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.username,
      img: req.file.filename,
    });
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.post('/room/:id/file', upload.single('file'), async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.username,
      file: req.file.filename,
    })
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
})

app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error'); 
});

const server = app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});

webSocket(server, app, sessionMiddleware);
