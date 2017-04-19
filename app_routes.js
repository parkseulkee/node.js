var express = require('express');
var app = express();

var router = express.Router();
router.get('/r1', function(req,res){
    res.send('Hello /p1/r1');
});
router.get('/r2', function(req,res){
    res.send('Hello /p1/r2');
});
app.use('/p1', router);

var p2 = express.Router();
router.get('//r1', function(req,res){
    res.send('Hello /p2/r1');
});
app.get('/r2', function(req,res){
    res.send('Hello /p2/r2');
});
app.use('/p2',p2);

app.listen(3003, function(){
  console.log('Connected 3003 port!!!');
});
