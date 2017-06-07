var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/home',function(req,res){
  console.log(req.body.name);
  console.log(req.body.country);
  res.status(200).end();
});
app.listen(3003, function(){
  console.log('running http://127.0.0.1:3003 server');
});
