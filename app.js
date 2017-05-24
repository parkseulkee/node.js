var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
// var session = require('cookie-session');
var MySQLStore = require('express-mysql-session')(session);
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
// OAuth API - login variable
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var NaverStrategy = require('passport-naver').Strategy;
// Image variable
var multer = require('multer');
var studyroomStorage = multer.diskStorage({
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
});
var roomStorage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null,'rooms_image/')
  },
  filename: function(req,file,cb){
    var sql = 'select id from rooms order by id desc limit 1';
    conn.query(sql,function(err, results){
      var id = 1;
      if(results.length) id = results[0].id+1;
      cb(null,id + '-' + file.originalname);
    })
  }
});
var studyroom_upload = multer({storage:studyroomStorage});
var room_upload = multer({storage:roomStorage});
var mysql = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'qlrqodtmfrl2',
  database : 'team25'
});
conn.connect();
var app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('.'));
app.use(session({
  key: 'sid',
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
        res.status(200).end();
        // console.log(res);
        // res.status(200).json(results);
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
        //res.status(200).json(newuser);
        res.status(200).end();
      })
    });
  });
};
app.get('/auth/facebook', jsonParser,function(req, res){
  console.log(req.body);
  var access_token = req.body.access_token;
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
app.post('/auth/google', jsonParser, function(req, res){
});
app.post('/auth/naver', jsonParser, function(req, res){
  console.log(req.body);
  var access_token = req.body.access_token;
  var api_url = 'https://openapi.naver.com/v1/nid/me';
  var request = require('request');
  var header = "Bearer " + access_token;
  var options = {
    url: api_url,
    headers: {'Authorization': header}
  };
  request.get(options, function (error, response, body){
    if(error){
      console.log(error);
      return res.status(500).end();
    }
    console.log(body);
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
  // var authId = 'naver:13109991';
  console.log(req.session);
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId], function(err, results){
    if(err){
      console.log(err);
      res.status(500).end();
    }
    var user = results[0];
    var sql = 'SELECT reservations.*, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomsName\
    FROM studyRooms, rooms, reservations, users \
    WHERE reservations.userId=? and studyRooms.id=rooms.studyroomId and rooms.id=reservations.roomId and reservations.date >= CURDATE()';
    conn.query(sql,[user.id],function(err,results){
      var reservations = new Array();
      for(var i in results){
        var date = results[i].date;
        var year  = date.getFullYear();
        var month = date.getMonth() + 1;
        var day   = date.getDate();

        if (("" + month).length == 1) { month = "0" + month; }
        if (("" + day).length   == 1) { day   = "0" + day;   }
        var item = {
          id: results[i].id,
          studyroom : results[i].studyroomName,
          room: results[i].roomName,
          address: results[i].address,
          date: year+'-'+month+'-'+day,
          time: results[i].start_time + '~' + results[i].end_time,
          number: results[i].number
        }
        reservations.push(item);
      }
      var info = {
        user: user,
        reservations: reservations
      }
      res.status(200).json(info);
    });
  });
});

app.get('/key/test', function(req,res){
  // parameter SET
  var api_url = 'http://192.168.0.57:80?pin=0';
  var request = require('request');
  var options = {
    url: api_url
  };
  request.get(options, function (err, response, body){

  });
  res.status(200).end();
});
app.get('/key/info', function(req,res){
  if(!req.session.authId){
    return res.status(404).send();
  }
  var authId = req.session.authId;
  // var authId = 'naver:13109991';
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var user = results[0];
    var sql = 'SELECT reservations.*, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomsName\
    FROM studyRooms, rooms, reservations, users \
    WHERE reservations.userId=? and studyRooms.id=rooms.studyroomId and rooms.id=reservations.roomId \
    and reservations.date >= CURDATE() and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
    conn.query(sql,[user.id],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(200).json({});
      }
      var date = results[0].date;
      var year  = date.getFullYear();
      var month = date.getMonth() + 1;
      var day   = date.getDate();

      if (("" + month).length == 1) { month = "0" + month; }
      if (("" + day).length   == 1) { day   = "0" + day;   }
      var item = {
        id: results[0].id,
        studyroom : results[0].studyroomName,
        room: results[0].roomName,
        address: results[0].address,
        date: year+'-'+month+'-'+day,
        time: results[0].start_time + '~' + results[0].end_time,
        number: results[0].number
      }
      var info = {
        key: item
      }
      res.status(200).json(info);
    });
  });
});
app.get('/key/open', function(req,res){

});
app.get('/key/lock', function(req,res){

});
app.get('/key/return', function(req,res){

});
// home
app.get('/home/list', function(req, res){
  // console.log(req);
  var sql = 'SELECT * FROM studyRooms';
  conn.query(sql, function(err, results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var info = {
      list: results
    }
    res.status(200).json(info);
  });
});
app.get('/home/info/:studyroomId',function(req, res){
  var studyroomId = req.params.studyroomId;
  var sql = 'SELECT * FROM rooms WHERE studyroomId=?';
  conn.query(sql,[studyroomId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var rooms = new Array();
    for(var i in results){
      rooms.push(results[i]);
    }
    var sql = 'SELECT * FROM studyRooms WHERE id=?';
    conn.query(sql,[studyroomId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      var info = {
        studyroom: results[0],
        rooms: rooms
        // host: host~
      }
      res.status(200).json(info);
    });
  });
});
app.get('/home/reservation/:roomId',function(req, res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var roomId = req.params.roomId;
  var sql = 'SELECT * FROM reservations WHERE roomId=?';
  conn.query(sql,[roomId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    res.status(200).json(results);
  });
});
app.post('/home/reservation/:roomId',jsonParser,function(req, res){
  // body - date, start_time, end_time, number
  console.log(req.body);
  var roomId = req.params.roomId;
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      consol.log(err);
      return res.status(500).end();
    }
    var reservation = {
      userId: results[0].id,
      date: req.body.date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      number: req.body.number,
      roomId: roomId
    }
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    res.status(200).end();
  });
});

app.get('/host/info',function(req,res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
  // var authId = 'naver:24364688';
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var adminId = results[0].id;
    var sql = 'SELECT * FROM studyRooms WHERE adminId=?';
    conn.query(sql,[adminId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(200).json({});
      }
      var studyrooms = new Array();
      for(var i in results){
        studyrooms.push(results[i]);
      }
      var sql = 'SELECT reservations.*, users.displayName, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomsName\
      FROM studyRooms, rooms, reservations, users \
      WHERE users.id=? and studyRooms.id=rooms.studyroomId and rooms.id=reservations.roomId and reservations.date >= CURDATE()';
      // detail mysql - and reservations.date >= CURDATE()
      conn.query(sql,[adminId],function(err,results){
        if(err){
          console.log(err);
          return res.status(500).end();
        }
        if(!results.length){
          return res.status(200).json({});
        }
        var reservations = new Array();
        for(var i in results){
          var date = results[0].date;
          var year  = date.getFullYear();
          var month = date.getMonth() + 1;
          var day   = date.getDate();

          if (("" + month).length == 1) { month = "0" + month; }
          if (("" + day).length   == 1) { day   = "0" + day;   }

          var item = {
            id: results[i].id,
            user: results[i].displayName,
            studyroom : results[i].studyroomName,
            room: results[i].roomName,
            address: results[i].address,
            date: year+'-'+month+'-'+day,
            time: results[i].start_time + '~' + results[i].end_time,
            number: results[i].number
          }
          reservations.push(item);
        }
        var info = {
          studyrooms: studyrooms,
          reservations : reservations
        }
        res.status(200).json(info);
      });
    })
  });
});
app.get('/host/add', function(req,res){
  res.render('upload');
});
app.post('/host/add', studyroom_upload.single('image'), function(req,res){
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
app.get('/host/add/:studyroomId',function(req,res){
  res.render('roomUpload');
});
app.post('/host/add/:studyroomId',room_upload.single('image'), function(req,res){
  var sql = 'select id from rooms order by id desc limit 1';
  conn.query(sql,function(err, results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var id = 1;
    if(results.length) var id = results[0].id+1;
    var image = '/rooms_image/'+ id + '-' + req.file.originalname;
    var room = {
      'name' : req.body.name,
      'img' : image,
      'min' : parseInt(req.body.min),
      'max' : parseInt(req.body.max),
      'studyroomId' : req.params.studyroomId,
      'ip' : req.body.ip
    };
    conn.query('INSERT INTO rooms SET ?', room, function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      else{
        res.status(200).end();
      }
    });
  });
});

app.listen(3003, function(){
  console.log('Connected http://127.0.0.1:3003/ server.');
});
