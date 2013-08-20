/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  ;

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
  cache[req.params.callId] = req.body;
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
 onlineAgents = {},
 io = require('socket.io').listen(server,{log:false});
 
io.configure(function () { 

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging

// enable all transports (optional if you want flashsocket support, please note that some hosting
// providers do not allow you to create servers that listen on a port different than 80 or their
// default port)
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);
io.set("polling duration", 10); 
});

/********** socket.io work ***************/

function deleteOnlineAgent(socket){
    console.log(onlineAgents);
    console.log('----------------------------');
    var breakCheck = true;
    var tanent = -1;
    for(var tanentId in onlineAgents){
         if(breakCheck)
            for(var i = 0 ; i < onlineAgents[tanentId].length; i++){
                if(onlineAgents[tanentId][i].socket.id == socket.id){
                    onlineAgents[tanentId].splice(i, 1);
                    tanent = tanentId;
                    breakCheck = false;
                    break;
             }
         }
     }
     return tanent;
}

function broadcastOnlineAgentsByTanent(tanentId){
    console.log('broadcastOnlineAgentsByTanent');
    console.log('tanent :' +  tanentId);
    console.log(''+onlineAgents[tanentId]);
    if(typeof onlineAgents[tanentId] !== 'undefined' ){
      var arr =  onlineAgents[tanentId];
      var res = [];
      for(var i = 0 ; i < onlineAgents[tanentId].length ; i++){
        res.push(onlineAgents[tanentId][i].agent);
      }
      for(var i = 0 ; i < onlineAgents[tanentId].length ; i++){
         console.log('tanent for ici:');        
         console.log(""+onlineAgents[tanentId][i]);        
         onlineAgents[tanentId][i].socket.emit('online_agents',res);
     }  
    }
    
}

io.sockets.on('connection', function(socket) {
  console.log('io connection');
  
  socket.on('forward', function(forwardObject) {
      debugger;
      for(var i = 0 ; i < onlineAgents[forwardObject.tanentId].length; i++){
        console.log("onlineAgents[forwardObject.tanentId][i].agent.id = "+ onlineAgents[forwardObject.tanentId][i].agent.id );
        console.log("forwardObject.agentId = "+forwardObject.agentId);
        if(onlineAgents[forwardObject.tanentId][i].agent.id == forwardObject.id){
            console.log("if icinde incoming call emit edecek");
            onlineAgents[forwardObject.tanentId][i].socket.emit('incoming_call',forwardObject.url);
        }
       }
  });
  
  socket.on('online', function(agent) {
    var agentArr = onlineAgents[agent.tanentId];
    if(typeof agentArr == 'undefined'){
        console.log("typeof agentArr == 'undefined'");
        agentArr = [];
    }
    console.log(agentArr);
    deleteOnlineAgent(socket);
    
    agentArr.push(
        {
         agent:agent,
         socket:socket
        }
    );
    
    onlineAgents[agent.tanentId] = agentArr;
    console.log(onlineAgents);
    console.log('----------------------------');
    broadcastOnlineAgentsByTanent(agent.tanentId);
  });
  
  socket.on('disconnect', function() {
    var tenantId = deleteOnlineAgent(socket);
    broadcastOnlineAgentsByTanent(tenantId);
  });

  socket.on('call_customer', function(callId) {
    connections[callId+'c'] = socket;
    socket.emit('start',cache[callId]);
  });
  socket.on('call_support', function(callId) {
    connections[callId+'s'] = socket;
    socket.emit('start',cache[callId]);
  });
});
