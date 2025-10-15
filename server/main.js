// Import required modules
const bodyParser = require("body-parser");
const express = require("express");
const formidable = require("formidable");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { PythonShell } = require('python-shell');
const holojam = require('holojam-node')(['relay']);
const ttDgram = require('dgram');
const { spawn } = require('child_process');

// Import the drone socket control module using a relative path
const droneSocketControl = require('./DroneSocketControl.js');

// UDP server for tracking data
let ttServer = ttDgram.createSocket('udp4');
ttServer.on('listening', function () { });
ttServer.on('message', function (message, remote) { ttData.push(message); });
ttServer.bind(9090, '127.0.0.1');
let ttData = [];

// Initialize variables
let gbr = 0;
let gbp = [];
let qrangle = [];
let qrdist = -1;
let objinfo = {};
let trackInfo = {};
trackInfo["1"] = [0,0,0,0,0,0,0];
trackInfo["2"] = [0,0,0,0,0,0,0];
trackInfo["3"] = [0,0,0,0,0,0,0];
trackInfo["4"] = [0,0,0,0,0,0,0];
let trackMessage = "";

// Express app setup
const app = express();
const port = process.argv[2] || 8000;
const wsPort = process.argv[3] || 22346;

// Serve static files from dist directory (webpack output)
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// File upload handler
app.route("/upload").post(function(req, res, next) {
   const form = new formidable.IncomingForm();
   form.uploadDir = path.join(__dirname, 'sketches');
   form.keepExtensions = true;

   form.parse(req, function(err, fields, files) {
      res.writeHead(200, {"content-type": "text/plain"});
      res.write('received upload:\n\n');

      let filename = fields.sketchName;
      const suffix = ".js";
      if (filename.indexOf(suffix, filename.length - suffix.length) == -1)
         filename += suffix;

      fs.writeFile(path.join(form.uploadDir, filename), fields.sketchContent, function(err) {
         if (err) {
            console.log(err);
         } else {
            //console.log("file written");
         }
      });

      res.end();
   });
});

// Log endpoint
app.route("/log").post(function(req, res, next) {
   const form = new formidable.IncomingForm();
   form.parse(req, function(err, fields, files) {
      console.log(fields.log);
      res.end();
   });
});

// TT data endpoint
app.route("/getTT").post(function(req, res, next) {
   const form = new formidable.IncomingForm();
   form.parse(req, function(err, fields, files) {
      if (ttData.length > 0) {
         returnString(res, ttData[0]);
         ttData = [];
      }
   });
});

// Set data endpoint
app.route("/set").post(function(req, res, next) {
   const form = new formidable.IncomingForm();
   form.parse(req, function(err, fields, files) {
      res.writeHead(200, {"content-type": "text/plain"});
      res.write('received upload:\n\n');

      let key = fields.key.toString();
      if (!key.endsWith('.json'))
         key += '.json';

      try {
         fs.writeFile(key, fields.value, function(err) {
            if (err) {
               console.log(err);
            }
            else {
               //console.log("file written");
            }
         });
      } catch(e) { 
         console.log('FS.WRITEFILE ERROR', key, fields.value); 
      }

      res.end();
   });
});

// Pack function for opti-track
let pack = (array, lo, hi) => {
   if (lo === undefined) { lo = 0; hi = 1; } else if (hi === undefined) { hi = lo ; lo = 0; }
   let C = " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
   let pack = t => C[92 * t >> 0] + C[92 * (92 * t % 1) + .5 >> 0];
   let s = '';
   for (let n = 0 ; n < array.length ; n++)
      s += pack((array[n] - lo) / (hi - lo));
   return s;
};

// Opti-track endpoints
app.route("/opti-track-external").put(function (req, res) {
   req.on('data', d => {
      trackMessage = d.toString('utf8');
   });
   res.end();
});

app.route("/opti-track").get(function (req, res) {
   res.send(trackMessage);
});

// Python and data endpoints
app.route("/spawnPythonThread").post(function(req, res) {
   const form = new formidable.IncomingForm();
   form.parse(req, function(err, fields, files) {
      const fileName = fields.fileName;
      const input = fields.input;
      const python = spawn('python3',[path.join(__dirname, 'python', fileName), input]);

      console.log(path.join(__dirname, 'python', fileName));
      console.log(input);

      python.stdout.on('data',function (data) {
         res.send(data.toString());
      });

      python.on('close',(code) => {
         console.log('closed');
      });
   });
});

app.route("/greenball-python").post(function (req, res) {
   gbr = req.body.radius;
   gbp = req.body.position;
   res.end();
});

app.route("/greenball").post(function (req, res) {
   const info = {};
   info['radius'] = gbr;
   info['position'] = gbp;
   res.send(info);
});

app.route("/qrcode-python").post(function (req, res) {
   qrangle = req.body.angle;
   qrdist = req.body.distance;
   res.end();
});

app.route("/qrcode").post(function (req, res) {
   const info = {};
   info['angle'] = qrangle;
   info['dist'] = qrdist;
   res.send(info);
});

app.route("/obj-python").post(function (req, res) {
   objinfo = req.body;
   res.end();
});

app.route("/obj").post(function (req, res) {
   res.send(objinfo);
});

app.route("/writeFile").post(function(req, res, next) {
   const form = new formidable.IncomingForm();
   form.parse(req, function(err, fields, files) {
      fs.writeFile(fields.fileName, JSON.parse(fields.contents),
         function(err) { if (err) console.log(err); }
      );
      res.end();
   });
});

// HTML endpoints
app.route("/talk").get(function(req, res) {
   res.sendFile(path.join(__dirname, "index.html"));
});

app.route("/listen").get(function(req, res) {
   res.sendFile(path.join(__dirname, "index.html"));
});

let time = 0;

// Time endpoint
app.route("/getTime").get(function(req, res) {
   time = (new Date()).getTime();
   returnString(res, '' + time);
});

// Directory listing endpoints
app.route("/ls_sketches").get(function(req, res) {
   readDir(res, "sketches", ".js");
});

app.route("/ls_sketchlibs").get(function(req, res) {
   readDir(res, "sketchlibs", ".js");
});

app.route("/ls_images").get(function(req, res) {
   readDir(res, "images");
});

app.route("/ls_state").get(function(req, res) {
   readDir(res, "state");
});

/* Drone control server setup */

// Initialize drone socket connection
droneSocketControl.initConnections();
let droneConnected = false;

// Drone connect endpoint
app.route("/drone/connect").post(function(req, res) {
   // If already connected, don't try to connect again
   if (droneConnected) {
     console.log("Drone already connected - returning connected status");
     return res.json({ 
       success: true, 
       message: 'Drone already connected', 
       connected: true 
     });
   }
 
   console.log("Attempting to connect to drone...");
   
   // Initialize socket connection and send command
   droneSocketControl.sendCommand('command')
     .then(result => {
       // Get battery level
       return droneSocketControl.sendCommand('battery?');
     })
     .then(result => {
       droneConnected = true;
       res.json({ 
         success: true, 
         message: 'Drone connected successfully', 
         connected: true,
         battery: result.result // Include battery level in response
       });
     })
     .catch(err => {
       droneConnected = false;
       res.json({ 
         success: false, 
         message: 'Failed to connect to drone: ' + err.message, 
         error: err.message,
         connected: false
       });
     });
 });
 
 // Drone command route
 app.route("/drone/control").post(function(req, res) {
   const command = req.body.command;
   
   if (!droneConnected && command !== 'command') {
     return res.status(400).json({ 
       success: false, 
       message: 'Drone not connected. Send "command" first to initialize connection.' 
     });
   }
   
   // Special handling for emergency command
   if (command === 'emergency') {
     // Reset command queue before sending emergency command
     droneSocketControl.resetCommandQueue();
   }
   
   droneSocketControl.sendCommand(command)
     .then(result => {
       // Set connected flag if this was the initial command
       if (command === 'command') {
         droneConnected = true;
       }
       
       // Special handling for battery command
       if (command === 'battery?') {
         res.json({ 
           success: true, 
           message: `Command ${command} executed successfully`, 
           result: result.result // The parsed battery percentage
         });
       } else {
         res.json({ 
           success: true, 
           message: `Command ${command} executed successfully`,
           response: result.response
         });
       }
     })
     .catch(err => {
       // Don't mark as disconnected on common errors
       if (err.message.includes('No valid imu') || 
           err.message.includes('Not joystick') ||
           err.message.includes('Auto land')) {
         
         res.status(202).json({ 
           success: false, 
           message: `Command ${command} received but failed with error`,
           error: err.message,
           connected: droneConnected
         });
       } else {
         // More serious errors might indicate connection issues
         res.status(500).json({ 
           success: false, 
           message: `Failed to execute command ${command}`,
           error: err.message
         });
       }
     });
 });
 
 // Drone status route with enhanced information
 app.route("/drone/status").get(function(req, res) {
   // Try to get battery status when checking status
   if (droneConnected) {
     droneSocketControl.sendCommand('battery?')
       .then(result => {
         const stateData = droneSocketControl.getStateData();
         res.json({ 
           connected: droneConnected,
           battery: result.result,
           state: stateData,
           commandQueue: (droneSocketControl.getQueueStatus && droneSocketControl.getQueueStatus()) || { 
             length: 'Queue status not available' 
           }
         });
       })
       .catch(err => {
         // Handle battery check failure, but still return status
         res.json({ 
           connected: droneConnected,
           error: "Failed to get battery status: " + err.message,
           state: droneSocketControl.getStateData()
         });
       });
   } else {
     res.json({ connected: false });
   }
 });
 
 // Command queue reset endpoint (for emergency situations)
 app.route("/drone/reset").post(function(req, res) {
   const count = droneSocketControl.resetCommandQueue();
   res.json({ 
     success: true, 
     message: `Command queue reset. ${count} pending commands removed.`
   });
 });



/* END of drone connect endpoint */

 
// Drone test interface
app.route("/droneTest").get(function(req, res) {
   res.sendFile(path.join(__dirname, "DroneTest.html"));
});

// Helper functions
function returnString(res, str) {
   res.writeHead(200, { "Content-Type": "text/plain" });
   res.write(str + "\n");
   res.end();
}

function readDir(res, dirName, extension) {
   fs.readdir(path.join(__dirname, dirName), function(err, files) {
      if (err) {
         if (err.code === "ENOENT") {
            // Directory not found, return empty string
            res.writeHead(200, { "Content-Type": "text/plain" });
         }
         else {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.write(err.message);
            console.log("error listing the " + dirName + " directory" + err);
         }
         res.end();
         return;
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      for (var i = 0; i < files.length; i++) {
         if (!extension || files[i].toLowerCase().endsWith(extension.toLowerCase())) {
            res.write(files[i] + "\n");
         }
      }
      res.end();
   });
}

// Utility string methods
String.prototype.endsWith = function(suffix) {
   return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function(substr) {
   return this.indexOf(substr) > -1;
};

function readHeader(data) {
   let header = data.toString('ascii', 1, 2);
   header += data.toString('ascii', 0, 1);
   header += data.toString('ascii', 3, 4);
   header += data.toString('ascii', 2, 3);
   header += data.toString('ascii', 5, 6);
   header += data.toString('ascii', 4, 5);
   header += data.toString('ascii', 7, 8);
   header += data.toString('ascii', 6, 7);
   return header;
}

// Server creation
let server;

// IF SECURE, CREATE AN HTTPS SERVER
if (process.argv[4] == 'https') {
   const https = require('https');
   const options = {
      key: fs.readFileSync(path.join(__dirname, 'key.key')),
      cert: fs.readFileSync(path.join(__dirname, 'cert.cer'))
   };
   server = https.createServer(options, app);
} 
// ELSE CREATE AN HTTP SERVER
else {
   server = http.Server(app);
}

// WEBSOCKET ENDPOINT SETUP
try {
   const WebSocketServer = require("ws").Server;

   const wss = new WebSocketServer({ server: server });
   const websockets = [];
   const clients = [];

   wss.on("connection", function(ws) {
      ws.index = websockets.length;
      for (let n = 0; n < websockets.length; n++)
         if (websockets[n] == null)
            ws.index = n;
      websockets[ws.index] = ws;
      clients.push(ws.index);

      let sendClients = () => {
         let data = JSON.stringify({ global: "clients", value: clients });
         for (var index = 0; index < websockets.length; index++)
            if (websockets[index])
               websockets[index].send(data);
      }
      sendClients();

      ws.on("message", data => {
         for (var index = 0; index < websockets.length; index++)
            if (websockets[index] && index != ws.index)
               websockets[index].send(data);
         if (readHeader(data) == 'CTdata01') {
            holojam.Send(holojam.BuildUpdate('ChalkTalk', [{
               label: 'Display',
               bytes: data
            }]));
         }
      });

      ws.on("close", function() {
         websockets[ws.index] = null;        // REMOVE THIS WEBSOCKET
         for (let n = 0; n < clients.length; n++)
            if (clients[n] == ws.index)
               clients.splice(n--, 1);
         sendClients();
      });
   });
} catch (err) {
   console.log("\x1b[31mCouldn't load websocket library. Disabling event broadcasting."
         + " Please run 'npm install' from Chalktalk's server directory\x1b[0m");
   console.log(err);
}

// START THE HTTP OR HTTPS SERVER
server.listen(parseInt(port, 10), function() {
   let mode = process.argv[4] == 'https' ? 'HTTPS' : 'HTTP';
   console.log(mode + " server listening on port %d", server.address().port);
});

const io = require("socket.io")(server);

io.on('connection', (socket) => {
   console.log("Got connection!");
   
   socket.on('Event', (data) => {
      console.log("Received test Event " + data);
   });
   
   soc = socket;
   socket.emit("Event", "Sending");
});

// Export the app for potential use with webpack
module.exports = app;