/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var cache ={};

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
app.post('/message/:action/:callId/:to', function (req, res) {
  console.log('app.post body:');
  console.log(req.body);
  console.log('app.post callId'+req.params.callId);
  cache[req.params.callId+req.params.to] = req.body;
  target = connections[req.params.callId+req.params.to];
  console.log(req.params);
  if (target) {
    target.emit(req.params.action, req.body);
    res.send(200);
  }
  else
    res.send(404);
});
 

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
}),
 connections = {},
 io = require('socket.io').listen(server);
/* 
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});
 */
/********** socket.io work ***************/
io.sockets.on('connection', function(socket) {
  console.log('io connection');
  socket.on('call_customer', function(callId) {
    connections[callId+'c'] = socket;
    socket.emit('start',cache[callId]);
  });
  socket.on('call_support', function(callId) {
    connections[callId+'s'] = socket;
    socket.emit('start',cache[callId]);
  });
});