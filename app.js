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

dotenv.config();

const webSocket = require('./socket');
const connect = require('./schemas');

const Room = require('./schemas/room');
const Chat = require('./schemas/chat');
const room = require('./schemas/room');

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
      const rooms = await Room.find({});
      res.render('main', { rooms, title: 'UsualChat' });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

app.route('/register').post((req, res) => {
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
});
app
  .route('/login')
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

app.route('/logout').get((req, res) => {
  req.logout();
  res.redirect('/');
});

app
  .route('/room')
  .get((req, res) => {
    res.render('room', { title: 'UsualChat 채팅방 생성' });
  })
  .post(async (req, res, next) => {
    try {
      const newRoom = await Room.create({
        title: req.body.title,
        max: req.body.max,
        owner: req.session.username,
        password: req.body.password,
      });
      const io = req.app.get('io');
      io.of('/room').emit('newRoom', newRoom);
      res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

app
  .route('/room/:id')
  .get(async (req, res, next) => {
    try {
      const room = await Room.findOne({ _id: req.params.id });
      const io = req.app.get('io');
      if (!room) {
        return res.redirect('/?error=존재하지 않는 방입니다.');
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
        return res.redirect('/?error=허용 인원이 초과하였습니다.');
      }
      const chats = await Chat.find({ room: room._id }).sort('createdAt');
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
        const io = req.app.get('io');
        io.of('/chat').emit('reload');
        setTimeout(() => {
          req.app.get('io').of('/room').emit('removeRoom', req.params.id);
        }, 100);
        await Room.remove({ _id: req.params.id });
        await Chat.remove({ room: req.params.id });
        res.redirect('/');
      } catch (error) {
        console.error(error);
        next(error);
      }
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

/*--업로드 구현부--*/
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

app.post('/room/:id/file', upload.single('another'), async (req, res, next) => {
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
  console.log(app.get('port'), '번 포트에서 대기중');
});

webSocket(server, app, sessionMiddleware);
