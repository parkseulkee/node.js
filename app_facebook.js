var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var redirectURI = encodeURI("http://localhost:3003/callback");
var state = "RAMDOM_STATE";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/',function(req,res){
  var url = 'https://www.facebook.com/v2.9/dialog/oauth?client_id=109125169639363&redirect_uri='+redirectURI;
  res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
  res.end("<a href='"+ url + "'>login</a>");
});
app.get('/callback',function(req,res){
  var code = req.query.code;
  var url = 'https://graph.facebook.com/v2.9/oauth/access_token?client_id=109125169639363'+'&redirect_uri='+redirectURI+'&client_secret=e7b147e18eaaa000c90f9c5580889a1f&code='+code;
  var request = require('request');
  var options = {
    url: url
  };
  request.post(options,function (error, response, body){
    console.log(body);
  });
});
app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
