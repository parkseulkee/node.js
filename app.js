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
// test rendering file setting
app.set('views','./views_file');
app.set('view engine','jade');

var storeUser = function(req,res,authId,displayName){
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    if(results.length > 0){
      req.session.authId = authId;
      return req.session.save(function(){
        res.status(200).send(results);
      });
    }
    var newuser = {
      'authId':authId,
      'displayName':displayName
    };
    var sql = 'INSERT INTO users SET ?';
    conn.query(sql,newuser,function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      req.session.authId = authId;
      return req.session.save(function(){
        res.status(200).send(newuser);
      })
    });
  });
};
app.get('/auth/facebook', function(req, res){
  //var object = JSON.parse(req.body);
  //var access_token = object.access_token;
  var access_token = "EAABjP67478MBACdCTvOQUZBtDxNLFhUpgCG37KeU6XhzhNovGavRFaZB5BBGEJ6RmFhufJQZB1QMyvoNDvVu4bcsbpkVwy3dLrbZCJzgawcACOPeTCdPYKBcw62t0ZCA9gbvLVau4SMJha4ez239QV99v3pgkjZBwZD";
  var api_url = 'https://graph.facebook.com/v2.9/me?fields=id,name&access_token='+access_token;
  var request = require('request');
  var options = {
    url: api_url
  };
  request.get(options,function(err,response,body){
    var object = JSON.parse(body);
    var authId = "facebook:"+object.id;
    var displayName = object.name;
    storeUser(req,res,authId,displayName);
  });
});
app.post('/auth/google', function(req, res){
});
app.get('/auth/naver', function(req, res){
  //console.log(req.body);
  //var object = JSON.parse(req.body);
  //var access_token = object.access_token;
  var access_token = "AAAAN6ZOe+LkwmYdefUsMn1C7GH+p3OyvXUG0BqnM4sDR3ibdkf9KWfCfuL0DN+NGiwKo5/P1Z6B/pvBRQI90WCWNiE=";
  var api_url = 'https://openapi.naver.com/v1/nid/me';
  var request = require('request');
  var header = "Bearer " + access_token;
  var options = {
    url: api_url,
    headers: {'Authorization': header}
  };
  request.get(options, function (error, response, body){
    var object = JSON.parse(body);
    var authId = "naver:"+object.response.id;
    var displayName = object.response.name;
    storeUser(req,res,authId,displayName);
  });
});
app.get('/auth/logout', function(req, res){
  delete req.session.authId;
  req.session.save(function(){
    res.status(200).end();
  });
});

// my page
app.get('/my/info', function(req, res){
  if(!req.session.authId){
    return res.status(400).end();
  }
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId], function(err, results){
    if(err){
      console.log(err);
      res.status(500).end();
    }
    else{
      res.status(200).send(results);
    }
  });
});

// home
app.get('/home', function(req, res){
  console.log(req);
  var sql = 'SELECT * FROM studyRooms';
  conn.query(sql, function(err, results){
    res.status(200).send(results);
  });
});
app.get('/home/:studyroom_id',function(req, res){
  var studyroom_id = req.params.studyroom_id;
});
app.get('/home/:studyroom_id/:room_id',function(req, res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var studyroom_id = req.params.studyroom_id;
  var room_id = req.params.room_id;
});
app.post('/home/:studyroom_id/:room_id',function(req, res){
  // body - data, time, people
});

app.post('/host/insert', studyroom_upload.single('image'), function(req,res){
  var sql = 'select id from studyRooms order by id desc limit 1';
  conn.query(sql,function(err, results){
    var id = 1;
    if(results.length) var id = results[0].id+1;
    var image = '/studyrooms_image/'+ id + '-' + req.file.originalname;
    var authId = req.session.authId;
    var sql = 'SELECT id FROM users WHERE authId=?';
    conn.query(sql,[authId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      var studyroom = {
        'name' : req.body.name,
        'img' : image,
        'address' : req.body.address,
        'adminId' : results[0].id
      };
      conn.query('INSERT INTO studyRooms SET ?', studyroom, function(err,results){
        if(err){
          console.log(err);
          return res.status(500).end();
        }
        else{
          res.status(200).end();
        }
      });
    });
  })
});

app.listen(3003, function(){
  console.log('Connected http://127.0.0.1:3003/ server.');
});
