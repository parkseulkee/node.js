var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/',function(req,res){
  var request = require('request');
  var message = "park seul kee : web test 'hi'";
  var access_token = "EAAGSax5pVXYBAHyevjsPPQZCuoGBMSR5HePy0muOHUNTSmnvqAEGQYSRC1L3m5znHhEPzZBhR014LZCVV2xXwI5DdcJVdTozTpEReSgvqtkGCe8IZAw0T3M5ek7klgh82ZBmcgETfLn5JtIADInz4bZBnGoYjZAaSZCqGTzjYZBhn1FK6NwiBpuvBOJhsLpUr1GcZD";
  var url = 'https://graph.facebook.com/me/feed?message=' + message + '&access_token=' + access_token;
  var options = {
    url: url
  };
  request.post(options,function(error, response, body){
    console.log(body);
    res.end();
  });
});
app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
