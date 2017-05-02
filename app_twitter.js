var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
   var request = require('request');
   var string = "27BkSpcqiRmb2zZMDRVjPwkg0:ozZHj9Cv8thuwgKPjvyf3JSMHNDMJ9rGGM7y61lji2LLoxw8fw";
   var encode = new Buffer(string).toString('base64');
   var basic = "Basic "+encode;
   var content = "application/x-www-form-urlencoded;charset=UTF-8";
   var options = {
     url: 'https://api.twitter.com/oauth2/token',
     headers: {'Authorization': basic, 'Content-Type': content},
     body: "grant_type=client_credentials"
   };

   request.post(options, function(error, response, body) {
     var object = JSON.parse(body);
     var bearer = "Bearer " + object.access_token;
     var options = {
       url: 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=psk21444&count=1',
       headers: {'Authorization': bearer}
     };
     request.get(options, function(error, response, body){
       res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
       res.end(body);
     });
   });
 });

app.listen(3003, function () {
  console.log('Connected app listening on port 3003!');
});
