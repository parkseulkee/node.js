var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var storage = multer.diskStorage({
  // 파일 경로 지정
  destination: function(req,file,cb){
    //if(파일의 형식이 이미지면~) cb(null,'/uploads/images/')
    cb(null,'uploads/')
  },
  // 파일 이름 지정
  filename: function(req,file,cb){
    //if(이미 파일이 존재한다면) cb(null, file.originalname에 동일 이름의 파일 중 가장 큰 숫자)
    cb(null,file.originalname)
  }
})
var upload = multer({storage:storage});
//var upload = multer({dest:'uploads/'});
var fs = require('fs');
var app = express();

app.use(bodyParser.urlencoded({extended:false}));
app.locals.pretty = true;
// http://localhost:3003/user/index.png 
app.use('/user',express.static('uploads'));
app.set('views','./views_file');
app.set('view engine','jade');

// upload.single('userfile') ? function이 실행되기 전,
// 사용자가 보내는 것에 file이 있다면 req객체 안에 file 프로퍼티 추가
app.post('/upload', upload.single('userfile'), function(req,res){
  console.log(req.file);
  res.send('Uploaded : ' + req.file.filename);
});
app.get('/upload',function(req,res){
  res.render('upload');
});
app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
