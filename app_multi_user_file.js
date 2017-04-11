var express = require('express');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var bodyParser = require('body-parser');
var bkfd2Password = require("pbkdf2-password");
var hasher = bkfd2Password();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: '1234DSFs@adf1234!@#$asd',
  resave: false,
  saveUninitialized: true,
  store:new FileStore()
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/count', function(req, res){
  if(req.session.count) {
    req.session.count++;
  } else {
    req.session.count = 1;
  }
  res.send('count : '+req.session.count);
});
app.get('/auth/logout', function(req, res){
  req.logout();
  req.session.save(function(){
    res.redirect('/welcome');
  });
});
app.get('/welcome', function(req, res){
  // user 객체를 req객체가 갖게 해줌 deserializeUser 호출한 user 인자
  if(req.user && req.user.displayName) {
    res.send(`
      <h1>Hello, ${req.user.displayName}</h1>
      <a href="/auth/logout">logout</a>
    `);
  } else {
    res.send(`
      <h1>Welcome</h1>
      <ul>
        <li><a href="/auth/login">Login</a></li>
        <li><a href="/auth/register">register</a></li>
      </ul>
    `);
  }
});
passport.serializeUser(function(user,done){
  //user들 구별값 보통 id, 우리는 username 같은사람이 있으면 안됨
  //session에 user.username에 대한 정보 저장
  //dune(null,user) 불렸을때 !
  console.log('serializeUser',user);
  done(null, user.username);
});
passport.deserializeUser(function(id,done){
  console.log('deserializeUser' + id);
    for(var i=0;i<users.length;i++){
      var user = users[i];
      if(user.username == id){
        return done(null, user);
      }
    }
});
passport.use(new LocalStrategy(
  function(username,password,done){
    var uname = username;
    var pwd = password;
    for(var i=0;i<users.length;i++){
      var user = users[i];
      if(uname == user.username) {
        // password checking
        return hasher({password:pwd, salt:user.salt},
          function(err,pass,salt,hash){
            if(hash == user.password){
              console.log('LocalStrategy',user);
              done(null,user);
            } else{
              done(null,false);
            }
        });
      }
    }
    done(null,false);
  }
));
app.post('/auth/login',
  passport.authenticate(
    'local',
    {
      successRedirect: '/welcome',
      failureRedirect: '/auth/login',
      failureFlash: false
    }
  )
);

var users = [
  {
    username:'egoing',
    password:'wfYxeofz76qkkWCum6b/wXMmWq5T8+ifGsNG3wI/lGkXPsZWy/pInuNzGS3eUAkV+mg0le+j0rs824iq675SVnHKEycLC7HwHFQh5snCUGIyZ07TFY7ZdE/j2BVcR8mP3RVwfukpmbNrutcuDuhH1RIUdHRDswdYY0ktkTlebHg=',
    salt: '9oSx0yDwfFtN/nZ8+8L1NrgwaxaVYi0XF+I0SMA8ah3dKLyCKX2tw1qokKgaMjV367TQUyoGHrnnAciLvVUxXw==',
    displayName:'Egoing'
  }
];
app.post('/auth/register', function(req,res){
  hasher({password:req.body.password}, function(err,pass,salt,hash){
    var user = {
      username: req.body.username,
      password: hash,
      salt: salt,
      displayName: req.body.displayName,
    };
    users.push(user);
    // 가입하고 바로 welcom 사용자 정보로
    req.login(user,function(err){
      req.session.save(function(){
        res.redirect('/welcome');
      });
    });
  });
});
app.get('/auth/register', function(req,res){
  var output = `
  <h1>Register</h1>
  <form action="/auth/register" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="text" name="displayName" placeholder="displayName">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  `;
  res.send(output);
});
app.get('/auth/login', function(req, res){
  var output = `
  <h1>Login</h1>
  <form action="/auth/login" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  `;
  res.send(output);
});
app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
