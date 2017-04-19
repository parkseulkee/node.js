var express = require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var bodyParser = require('body-parser');
// OAuth API - login variable
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var NaverStrategy = require('passport-naver').Strategy;
// Image variable
var multer = require('multer');
var storage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null,'studyrooms_image/')
  },
  filename: function(req,file,cb){
    var sql = 'select id from studyRooms order by id desc limit 1';
    conn.query(sql,function(err, results){
      var id = 1;
      if(results.length) id = results[0].id+1;
      cb(null,id + '-' + file.originalname);
    })
  }
})
var studyroom_upload = multer({storage:storage});
var mysql = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'qlrqodtmfrl2',
  database : 'team25'
});
conn.connect();
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: '1234DSFs@adf1234!@#$asd',
  resave: false,
  saveUninitialized: true,
  store:new MySQLStore({
    host:'localhost',
    port:3306,
    user:'root',
    password:'qlrqodtmfrl2',
    database:'team25'
  })
}));
app.use(passport.initialize());
app.use(passport.session());
// test rendering file setting
app.set('views','./views_file');
app.set('view engine','jade');

// session
passport.serializeUser(function(user, done) {
  console.log('serializeUser : ', user);
  done(null, user.authId);
});
passport.deserializeUser(function(id, done) {
  console.log('deserializeUser : ', id);
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql, [id], function(err, results){
    if(err){
      console.log(err);
      done('There is no user.');
    } else {
      done(null, results[0]);
    }
  });
});

// login information store form
var strategyForm = function(string,id,displayName,done){
  var authId = string+id;
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql, [authId], function(err, results){
    if(results.length > 0){
      done(null, results[0]);
    } else {
      var newuser = {
        'authId':authId,
        'displayName':displayName
      };
      var sql = 'INSERT INTO users SET ?';
      conn.query(sql, newuser, function(err, results){
        if(err){
          console.log(err);
          done('Error');
        } else {
          done(null, newuser);
        }
      })
    }
  });
};
passport.use(new FacebookStrategy({
    clientID: '109125169639363',
    clientSecret: 'e7b147e18eaaa000c90f9c5580889a1f',
    callbackURL: "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    strategyForm('facebook:',profile.id,profile.displayName,done);
  }
));
passport.use(new GoogleStrategy({
    clientID: '940990380262-rmfai8blkgks04v8v0aavlst5qsilksp.apps.googleusercontent.com',
    clientSecret: '92JqZmMIMFcHRj45TupdE6JU',
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    strategyForm('google:',profile.id,profile.displayName,done);
  }
));
passport.use(new NaverStrategy({
        clientID: '6tlUbrudYfoN0nTcQXe8',
        clientSecret:'IhTkoilALr',
        callbackURL: "/auth/naver/callback"
	},
    function(accessToken, refreshToken, profile, done) {
      console.log(profile);
      strategyForm('naver:',profile.id,profile.emails[0].value,done);
    }
));
app.get(
  '/auth/facebook',
  passport.authenticate(
    'facebook'
  )
);
app.get(
  '/auth/google',
  passport.authenticate(
    'google',
    { scope: ['https://www.googleapis.com/auth/plus.login'] }
  )
);
app.get(
  '/auth/naver',
	passport.authenticate(
    'naver'
  )
);
app.get(
  '/auth/facebook/callback',
  passport.authenticate(
    'facebook',
    {
      successRedirect: '/my',
      failureRedirect: '/auth/login'
    }
  )
);
app.get(
  '/auth/google/callback',
  passport.authenticate(
    'google',
    {
      failureRedirect: '/auth/login'
    }
  ),
  function(req, res) {
    res.redirect('/my');
  }
);
app.get(
  '/auth/naver/callback',
	passport.authenticate(
    'naver',
    {
        failureRedirect: '/auth/login'
    }
  ),
  function(req, res) {
  	res.redirect('/my');
  }
);
app.get('/auth/login', function(req, res){
  var output = `
  <h1>Login</h1>
  <p><a href="/auth/facebook">Sign In with facebook</a></p>
  <p><a href="/auth/google">Sign In with Google</a></p>
  <p><a href="/auth/naver">Sign In with Naver</a></p>`;
  res.send(output);
});
app.get('/auth/logout', function(req, res){
  req.logout();
  req.session.save(function(){
    res.redirect('/my');
  });
});

// my
app.get('/my', function(req, res){
  if(req.user){
    res.json(req.user);
  }
  res.send('not login');
});

// home
app.get('/home', function(req, res){
  var sql = 'SELECT * FROM studyRooms';
  conn.query(sql, function(err, results){
    // var jsonObj = JSON.parse(jsonString);
    //var list = JSON.stringify(results);
    res.json(results);
  });
});
app.get('/home/:room_id',function(req, res){
  var room_id = req.params.room_id;
});

// add studyroom
app.get('/insert', function(req,res){
  res.render('upload');
});
app.post('/insert', studyroom_upload.single('image'), function(req,res){
  var sql = 'select id from studyRooms order by id desc limit 1';
  conn.query(sql,function(err, results){
    var id = 1;
    if(results.length) var id = results[0].id+1;
    var image = '/studyrooms_image/'+ id + '-' + req.file.originalname;
    var studyroom = {
      'name' : req.body.name,
      'img' : image,
      'address' : req.body.address
    };
    conn.query('INSERT INTO studyRooms SET ?', studyroom);
    res.redirect('/insert')
  })
});

app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
