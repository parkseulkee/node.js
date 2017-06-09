var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var bodyParser = require('body-parser');
var multer = require('multer');

// image store variable
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
var postStorage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null,'post_image/')
  },
  filename: function(req,file,cb){
    var sql = 'select id from posts order by id desc limit 1';
    conn.query(sql,function(err, results){
      var id = 1;
      if(results.length) id = results[0].id+1;
      cb(null,id + '-' + file.originalname);
    })
  }
});

var studyroom_upload = multer({storage:studyroomStorage});
var room_upload = multer({storage:roomStorage});
var post_upload = multer({storage:postStorage});
// database variable
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
app.use(bodyParser.json());
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

// test rendering file setting
app.set('views','./views_file');
app.set('view engine','jade');

function urldecode (str) {
   return decodeURIComponent((str + '').replace(/\+/g, '%20'));  // 공백 문자인 + 를 처리하기 위해 +('%20') 을 공백으로 치환
 }
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
        // email.phone number get redirection
        res.status(300).end();
      });
    });
  });
};

app.post('/auth/facebook',function(req, res){
  console.log(req.body);
  var authId = "facebook:"+req.body.id;
  var displayName = req.body.name
  storeUser(req,res,authId,displayName);
});
app.post('/auth/naver', function(req, res){
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


app.get('/my/info', function(req, res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId], function(err, results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var user = results[0];
    var sql = 'SELECT DISTINCT reservations.*, studyRooms.img, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomName\
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
          img: results[i].img,
          studyroom : results[i].studyroomName,
          room: results[i].roomName,
          address: results[i].address,
          date: year + '-' + month + '-' + day,
          time: results[i].start_time + '~' + results[i].end_time,
          number: results[i].number + '명'
        }
        reservations.push(item);
      }
      var info = {
        user: user,
        reservations: reservations
      }
      console.log(info);
      res.status(200).json(info);
    });
  });
});

app.get('/key/test',function(req,res){
  console.log("key test");
  var url = 'http://192.168.0.57:80?pin=1';
  var request = require('request');
  var options = {
    url: url
  };
  request.get(options,function(err,responce,body){
    res.status(200).end();
  });
});
app.get('/key/info', function(req,res){
  if(!req.session.authId){
    return res.status(404).send();
  }
  var authId = req.session.authId;
  console.log("key info : "+authId);
  var sql = 'SELECT * FROM users WHERE authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var user = results[0];
    var sql = 'SELECT DISTINCT reservations.*, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomName\
    FROM studyRooms, rooms, reservations, users \
    WHERE reservations.userId=? and studyRooms.id=rooms.studyroomId and rooms.id=reservations.roomId \
    and reservations.date = CURDATE() and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
    conn.query(sql,[user.id],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(400).end();
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
      console.log(info);
      res.status(200).json(info);
    });
  });
});
app.get('/key/open/', function(req,res){
  console.log(req);
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users where authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var userId = results[0].id;
    var sql = 'SELECT rooms.ip FROM reservations, rooms\
    WHERE reservations.roomId = rooms.id and reservations.userId=? and reservations.date = CURDATE() \
    and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
    conn.query(sql,[userId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(404).end();
      }
      var ip = results[0].ip;
      var api_url = 'http://' + ip +':80?pin=1';
      var request = require('request');
      var options = {
        url: api_url
      };
      request.get(options, function (err, response, body){
        res.status(200).end();
      });
    });
  });
});
app.get('/key/lock', function(req,res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users where authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var userId = results[0].id;
    var sql = 'SELECT rooms.ip FROM reservations, rooms\
    WHERE reservations.roomId = rooms.id and reservations.userId=? and reservations.date = CURDATE() \
    and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
    conn.query(sql,[userId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(404).end();
      }
      var ip = results[0].ip;
      var api_url = 'http://' + ip +':80?pin=0';
      var request = require('request');
      var options = {
        url: api_url
      };
      request.get(options, function (err, response, body){
        res.status(200).end();
      });
    });
  });
});
app.get('/key/return', function(req,res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
  var sql = 'SELECT * FROM users where authId=?';
  conn.query(sql,[authId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var userId = results[0].id;
    var sql = 'SELECT reservations.id, rooms.ip FROM reservations, rooms\
    WHERE reservations.roomId = rooms.id and reservations.userId=? and reservations.date = CURDATE() \
    and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
    conn.query(sql,[userId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      if(!results.length){
        return res.status(404).end();
      }
      var ip = results[0].ip;
      var id = results[0].id;
      var api_url = 'http://' + ip +':80?pin=0';
      var request = require('request');
      var options = {
        url: api_url
      };
      request.get(options, function (err, response, body){
        var sql = 'DELETE FROM reservations WHERE id=?';
        console.log("delete reservations : "+id);
        conn.query(sql,[id],function(err,results){
          res.status(200).end();
        });
      });
    });
  });
});
app.post('/key/camera',post_upload.single('image'), function(req,res){
  if(!req.session.authId){
    return res.status(404).send();
  }
  console.log(req.file.originalname);
  var authId = req.session.authId;
  var sql = 'select id from posts order by id desc limit 1';
  conn.query(sql,function(err, results){
    var id = 1;
    if(results.length) var id = results[0].id+1;
    var image = '/post_image/'+ id + '-' + req.file.originalname;
    var sql = 'SELECT * FROM users WHERE authId=?';
    conn.query(sql,[authId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      var user = results[0];
      var sql = 'SELECT DISTINCT reservations.*\
      FROM studyRooms, rooms, reservations, users \
      WHERE reservations.userId=? and studyRooms.id=rooms.studyroomId and rooms.id=reservations.roomId \
      and reservations.date = CURDATE() and HOUR(NOW()) >= reservations.start_time and HOUR(NOW()) <=  reservations.end_time';
      conn.query(sql,[user.id],function(err,results){
        var reservationId = results[0].id;
        var item = {
          img: image,
          reservationId: reservationId
        };
        var sql = 'INSERT INTO posts SET ?';
        conn.query(sql,item,function(err,results){
          if(err){
            console.log(err);
            return res.status(200).end();
          }
          res.status(200).end();
        });
      });
    });
  });
});

app.get('/home/list', function(req, res){
  var sql = 'SELECT * FROM studyRooms';
  conn.query(sql, function(err, results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var info = {
      list: results
    }
    console.log(info);
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
      var client_id = 'H5SkK1jCLdUe4Q9S_MHJ';
      var client_secret = '44ysQHEvj0';
      var api_url = 'https://openapi.naver.com/v1/map/geocode?query=' + encodeURI(results[0].address);
      var request = require('request');
      var options = {
          url: api_url,
          headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
       };
      request.get(options, function (error, response, body){
        var object = JSON.parse(body);
        var map = object.result.items[0].point;
        var point = {
          x: map.x,
          y: map.y
        }
        var info = {
          studyroom: results[0],
          rooms: rooms,
          point: point
        }
        console.log(info);
        res.status(200).json(info);
      });
    });
  });
});
app.get('/home/reservation/:roomId/:date',function(req,res){
  var roomId = req.params.roomId;
  var date = req.params.date;
  var sql = 'SELECT start_time,end_time FROM reservations WHERE roomId=? and date=?';
  conn.query(sql,[roomId,date],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    res.status(200).json(results);
  });
});
app.post('/home/reservation/:roomId',function(req, res){
  // body - date, start_time, end_time, number
  if(!req.session.authId){
    return res.status(404).end();
  }
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
    var sql = 'INSERT INTO reservations SET ?';
    conn.query(sql,reservation,function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      res.status(200).end();
    });
  });
});

app.get('/host/info',function(req,res){
  if(!req.session.authId){
    return res.status(404).end();
  }
  var authId = req.session.authId;
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
      var studyrooms = new Array();
      for(var i in results){
        studyrooms.push(results[i]);
      }
      var sql = 'SELECT reservations.*, users.*, studyRooms.name as studyroomName, studyRooms.address, rooms.name as roomName\
      FROM studyRooms, rooms, reservations, users \
      WHERE users.id=reservations.userId and studyRooms.adminId=? and studyRooms.id=rooms.studyroomId  and rooms.id=reservations.roomId and reservations.date >= CURDATE()';
      conn.query(sql,[adminId],function(err,results){
        if(err){
          console.log(err);
          return res.status(500).end();
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
            date: year + '-' + month + '-' + day,
            time: results[i].start_time + '~' + results[i].end_time,
            number: results[i].number + '명'
          }
          reservations.push(item);
        }
        var info = {
          studyrooms: studyrooms,
          reservations : reservations
        }
        console.log(info);
        res.status(200).json(info);
      });
    })
  });
});
app.get('/host/add',function(req,res){
  res.render('upload');
});
app.post('/host/add', studyroom_upload.single('image'), function(req,res){
  // body - image, name, address
  console.log(req.body);
  if(!req.session.authId){
    return res.status(404).end();
  }
  console.log("host studyroom add : "+req.session.authId);
  var sql = 'select id from studyRooms order by id desc limit 1';
  conn.query(sql,function(err, results){
    var id = 1;
    if(results.length) var id = results[0].id+1;
    var image = '/studyrooms_image/'+ id + '-' + req.file.originalname;
    var authId = req.session.authId;
    var sql = 'SELECT * FROM users WHERE authId=?';
    conn.query(sql,[authId],function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      var studyroom = {
        'name' : urldecode(req.body.name),
        'img' : image,
        'address' : urldecode(req.body.address),
        'adminId' : results[0].id
      };
      console.log(studyroom);
      conn.query('INSERT INTO studyRooms SET ?', studyroom, function(err,results){
        if(err){
          console.log(err);
          return res.status(500).end();
        }
        res.status(200).end();
      });
    });
  })
});
app.post('/host/add/:studyroomId',room_upload.single('image'), function(req,res){
  // body - name, image, max, ip, description
  if(!req.session.authId){
    return res.status(404).end();
  }
  console.log(req.params.studyroomId);
  console.log("host room add : "+req.session.authId);
  console.log(req.body);
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
      'name' : urldecode(req.body.name),
      'img' : image,
      'max' : parseInt(urldecode(req.body.max)),
      'studyroomId' : req.params.studyroomId,
      'ip' : urldecode(req.body.ip),
      'description' : urldecode(req.body.description)
    };
    console.log(room);
    conn.query('INSERT INTO rooms SET ?', room, function(err,results){
      if(err){
        console.log(err);
        return res.status(500).end();
      }
      res.status(200).end();
    });
  });
});
app.get('/host/info/:studyroomId',function(req,res){
  var studyroomId = req.params.studyroomId;
  var sql = 'SELECT * FROM rooms WHERE studyroomId=?';
  conn.query(sql,[studyroomId],function(err,results){
    if(err){
      console.log(err);
      return res.status(500).end();
    }
    var rooms = new Array();
    for(var i in results){
      var item = {
        id: results[i].id,
        name: results[i].name,
        img: results[i].img,
        ip: results[i].ip,
        max: results[i].max,
        description: results[i].description
      }
      rooms.push(item);
    }
    var info = {
      rooms: rooms
    }
    res.status(200).json(info);
  });
});
app.get('/host/camera/:reservationId',function(req,res){
  var reservationId = req.params.reservationId;
  var camera = new Array();
  var sql = 'SELECT * FROM posts WHERE reservationId=?';
  console.log(reservationId);
  conn.query(sql,[reservationId],function(err,results){
    for(var i in results){
      var img = {
        img: results[i].img
      }
      camera.push(results[i]);
    }
    var info = {
      camera: camera
    }
    console.log(info);
    res.status(200).json(info);
  });
});


app.listen(3003, function(){
  console.log('Connected http://127.0.0.1:3003/ server.');
});
