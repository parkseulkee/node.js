var express = require('express');
var app = express();

app.get('/',function(req,res){
  console.log(req);
  res.status(200).end();
});
app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
