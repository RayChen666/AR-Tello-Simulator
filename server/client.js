// server/client.js - Server communication class
// Supports both CommonJS and ES Module import
function Server(wsPort) {
   // Initialize internal variables
   this.counter = 0;
   this.time = 0;
   this.clients = []; // Add clients array to store connected clients
   this.clientID = null; // Initialize clientID as null
   this.needToUpdate = null; // Initialize needToUpdate
   this.updatedValue = null; // Initialize updatedValue
   
   // Use dynamic hostname when running in browsers
   const hostname = window.location.hostname || 'localhost';

   // Create a map for event handlers
   this.events_canvas = {}; // Initialize events_canvas as an object

   this.call = (name, callback) => {
      var request = new XMLHttpRequest();
      request.open('GET', name);
      request.onloadend = () => callback(request.responseText);
      request.send();
   }

   this.upload = (sketchName, sketchContent) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'upload');

      var form = new FormData();
      form.append('sketchName', sketchName);
      form.append('sketchContent', sketchContent);

      request.send(form);
   }

   this.getTT = callback => {
      if (! this.getTT_request)
         this.getTT_request = new XMLHttpRequest();
      var request = this.getTT_request;

      request.open('POST', 'getTT');
      request.onloadend = () => callback(request.responseText);
      var form = new FormData();
      request.send(form);
   }

   this.set = (key, val) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'set');

      var form = new FormData();
      form.append('key', key + '.json');
      form.append('value', JSON.stringify(val));
      request.send(form);
   }

   this.get = (key, callback, onErr) => {
      var request = new XMLHttpRequest();
      request.open('GET', key + '.json');
      request.onloadend = () => {
         if (request.responseText.indexOf('Cannot ') != 0)
            try {
               callback(JSON.parse(request.responseText));
            } catch (_) {
               if (onErr !== undefined) onErr("Error parsing JSON");
            }
         else if (onErr !== undefined)
            onErr(request.responseText);
      }
      request.send();
   }

   this.spawnPythonThread = (fileName, input) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'spawnPythonThread');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const text = request.responseText;
            window.imageResult = text;
            this.broadcastGlobal('imageResult');
            console.log('Output from python script: ' + text);
         }
         else
            console.log('error ' + request.status);
      }

      var form = new FormData();
      form.append('fileName', fileName);
      form.append('input', input);
      request.send(form);
   }

   this.track = () => {
      var request = new XMLHttpRequest();
      request.open('GET', 'opti-track');

      request.onloadend = () => {
         try {
            const info = request.responseText;
            window.trackInfo = info;
            this.broadcastGlobal('trackInfo');
         }
         catch (err) { console.log(err); }
      }

      request.send();
   }

   this.qrcode = () => {
      var request = new XMLHttpRequest();
      request.open('POST', 'qrcode');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const info = request.responseText;
            window.qrinfo = info;
            this.broadcastGlobal('qrinfo');
         }
         else
            console.log('error ' + request.status);
      }

      var form = new FormData();
      request.send(form);
   }

   this.objdetect = () => {
      var request = new XMLHttpRequest();
      request.open('POST', 'obj');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const info = request.responseText;
            window.objinfo = info;
            this.broadcastGlobal('objinfo');
         }
         else
            console.log('error ' + request.status);
      }

      var form = new FormData();
      request.send(form);
   }
   
   // Updated drone control methods
   
   this.connectDrone = () => {
      return new Promise((resolve, reject) => {
         var request = new XMLHttpRequest();
         request.open('POST', '/drone/connect');
         request.setRequestHeader('Content-Type', 'application/json');
         
         request.onloadend = () => {
           if (request.status >= 200 && request.status < 300) {
             try {
               const response = JSON.parse(request.responseText);
               console.log('Drone connection response:', response);
               window.isDroneConnected = response.connected;
               resolve(response.connected);
             } catch (e) {
               console.error('Error parsing drone connection response:', e);
               reject(e);
             }
           } else {
             console.error('Drone connection request failed:', request.status);
             reject(new Error(`HTTP error ${request.status}`));
           }
         };
         
         request.onerror = (err) => {
           console.error('Network error during drone connection:', err);
           reject(err);
         };
         
         request.send(JSON.stringify({}));
      });
   };

   this.sendDroneCommand = (command) => {
      return new Promise((resolve, reject) => {
         var request = new XMLHttpRequest();
         request.open('POST', '/drone/control');
         request.setRequestHeader('Content-Type', 'application/json');
         
         request.onloadend = () => {
           if (request.status >= 200 && request.status < 300) {
             try {
               const response = JSON.parse(request.responseText);
               console.log(`Drone command '${command}' response:`, response);
               resolve(response.success);
             } catch (e) {
               console.error(`Error parsing drone command '${command}' response:`, e);
               reject(e);
             }
           } else {
             console.error(`Drone command '${command}' request failed:`, request.status);
             reject(new Error(`HTTP error ${request.status}`));
           }
         };
         
         request.onerror = (err) => {
           console.error(`Network error during drone command '${command}':`, err);
           reject(err);
         };
         
         request.send(JSON.stringify({ command: command }));
      });
   };

   this.getDroneStatus = () => {
      return new Promise((resolve, reject) => {
         var request = new XMLHttpRequest();
         request.open('GET', '/drone/status');
         
         request.onloadend = () => {
           if (request.status >= 200 && request.status < 300) {
             try {
               const response = JSON.parse(request.responseText);
               window.isDroneConnected = response.connected;
               resolve(response.connected);
             } catch (e) {
               console.error('Error parsing drone status response:', e);
               reject(e);
             }
           } else {
             console.error('Drone status request failed:', request.status);
             reject(new Error(`HTTP error ${request.status}`));
           }
         };
         
         request.onerror = (err) => {
           console.error('Network error during drone status check:', err);
           reject(err);
         };
         
         request.send();
      });
   };
   
   this.writeFile = (fileName, contents) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'writeFile');
      var form = new FormData();
      form.append('fileName', fileName);
      form.append('contents', JSON.stringify(contents));
      request.send(form);
   }
   
   this.socket = null;

   this.construct = data => {
      let obj = data;
      if (Array.isArray(data)) {
         obj = [];
         for (let i = 0; i < data.length; i++)
            obj.push(this.construct(data[i]));
      }
      else if (data && data.constructorName) {
         // Use Function constructor for dynamic evaluation
         // This is more webpack-friendly than eval
         obj = new (Function('return ' + data.constructorName))();
         for (let f in data)
            obj[f] = this.construct(data[f]);
      }
      return obj;
   }

   this.log = (a,b,c,d,e,f,g,h,i,j) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'log');
      var form = new FormData();
      let C = (a,b) => b===undefined ? a : a + ' ' + b;
      form.append('log', C(a,C(b,C(c,C(d,C(e,C(f,C(g,C(h,C(i,j))))))))));
      request.send(form);
   }

   this.connectSocket = wsPort => {
      // Use dynamic hostname when running in browsers
      this.socket = new WebSocket(`ws://${hostname}:${wsPort}`);
      //this.socket = new WebSocket(`wss://${hostname}:${wsPort}`);
      this.socket.binaryType = "arraybuffer";

      this.socket.onmessage = event => {
         if (event.data instanceof ArrayBuffer)
            return;

         var obj = JSON.parse(event.data);

         if (obj.eventType) {
            obj.event.preventDefault = () => { };
            if (this.events_canvas[obj.eventType]) {
               this.events_canvas[obj.eventType](obj.event);
            }
            return;
         }

         if (obj.global) {
            try {
               if (obj.start !== undefined)
                  for (let i = 0; i < obj.value.length; i++)
                     window[obj.global][obj.start + i] = this.construct(obj.value[i]);
               else if (obj.element !== undefined)
                  window[obj.global][obj.element] = this.construct(obj.value);
               else
                  window[obj.global] = this.construct(obj.value);
            }
            catch (error) { 
               console.log("Error processing global object:", error);
            }
            return;
         }

         if (obj.code) {
            try {
               // Use Function constructor instead of eval
               (new Function(obj.code))();
            }
            catch (error) { 
               console.log("Error executing code:", error);
            }
            return;
         }
      };
      return this.socket;
   };

   this.broadcastGlobalSlice = (name, start, end) =>
      this.broadcastObject({ global:name, start:start, value:window[name].slice(start,end) });
   this.broadcastGlobalElement = (name, element) =>
      this.broadcastObject({ global:name, element:element, value:window[name][element] });
   this.broadcastGlobal = name => {
      if (typeof name !== 'string')
         console.log('ERROR: argument to server.broadcastGlobal must be of type string');
      else
         this.broadcastObject({ global:name, value:window[name] });
   }
   this.broadcastCode = code => this.broadcastObject({ code:code });
   this.broadcastObject = object => this.broadcast(JSON.stringify(object));
   this.broadcast = message => {
      if (this.socket == null) {
         console.log("socket is null, can't broadcast");
         return;
      }
      if (this.socket.readyState != 1) {
         console.log("socket is not open, can't broadcast");
         return;
      }
      this.socket.send(message);
   };

   let msngr_name = name => name + '_updates';
   let index_name = name => name + '_updates_index';

   this.init = (name, default_value) => {
      if (window[name] === undefined)
         window[name] = default_value;
      window[msngr_name(name)] = {};
      window[index_name(name)] = 0;
   }

   this.send = (name, msg_obj) => window[msngr_name(name)][window[index_name(name)]++] = msg_obj;

   let syncInterval = 3;

   this.syncInterval = value => syncInterval = value;

   this.sync = (name, callback) => {
      window[name] = this.synchronize(name, syncInterval);
      let m_name = msngr_name(name);
      let isNotEmpty = name => window[name] && Object.keys(window[name]).length > 0;
      let addID = (name, id) => '__' + name + '__' + id;
      if (isNotEmpty(m_name)) {
         let m_nameID = addID(m_name, this.clientID);
         window[m_nameID] = window[m_name];
         window[m_name] = {};
         this.broadcastGlobal(m_nameID);
      }
      if (window.clients)
         for (let n = 0; n < this.clients.length; n++) {
            let m_nameID = addID(m_name, this.clients[n]);
            if (isNotEmpty(m_nameID)) {
               callback(window[m_nameID], this.clients[n]);
               window[m_nameID] = {};
            }
         }
   }

   let alwaysLoadFromStorage = false;
   this.alwaysLoadFromStorage = () => alwaysLoadFromStorage = true;

   let neverLoadOrSave = false;
   this.neverLoadOrSave = () => neverLoadOrSave = true;

   this.synchronize = (name, interval) => {
      if (window.clients === undefined) {                // DO NOT DO ANYTHING UNTIL THE
         this.clients = [];                             // Initialize clients if undefined
         return window[name];                           // SERVER PROVIDES A CLIENT LIST.
      }
      
      // Set clients from window.clients
      this.clients = window.clients || [];

      if (this.clientID === undefined && this.clients.length > 0) {  // ON START-UP, ASSIGN A UNIQUE
         this.clientID = this.clients[this.clients.length-1];        // ID TO THIS CLIENT.
      }

      let isSceneLoaded = name + '__' + this.clientID;
      if (! neverLoadOrSave && ! window[isSceneLoaded]) {       // IF THE SCENE ISN'T LOADED:
         window[isSceneLoaded] = true;
         if (this.clients.length == 1 || alwaysLoadFromStorage) {    // IF THIS IS THE ONLY CLIENT
            console.log('client', this.clientID, 'is the first client -- loading from storage');
            this.get(name, s => window[name]=this.construct(s)); // INITIALIZE ITS STATE VALUE
                                                            // FROM PERSISTENT STORAGE.
         }
         else
            for (let i = 0; i < this.clients.length; i++)          // ELSE WHEN THE NEW CLIENT
               if (this.clients[i] != this.clientID) {                   // JOINS THIS SCENE, IT SENDS
                  window.needToUpdate = { name: name, client: this.clients[i] };
                  this.needToUpdate = window.needToUpdate;
                  this.broadcastGlobal('needToUpdate');         // A NEED_TO_UPDATE INDICATOR
                  delete window.needToUpdate;                   // TO SOME OTHER CLIENT, THEN
                  delete this.needToUpdate;
                  window['waitForFirstUpdate__' + name] = true; // WAITS FOR A FIRST UPDATE.
                  break;
               }
      }

      if (! neverLoadOrSave && window.needToUpdate) {           // WHEN A CLIENT RECEIVES THE
         this.needToUpdate = window.needToUpdate;
         if (this.clientID == this.needToUpdate.client) {                 // NEED_TO_UPDATE INDICATOR, IT
            window.updatedValue = window[this.needToUpdate.name];    // BROADCASTS AN UPDATED VALUE
            this.updatedValue = window.updatedValue;
            this.broadcastGlobal('updatedValue');               // TO EVERY CLIENT, AND DELETES
            delete window.updatedValue;                         // ITS UPDATED_VALUE FLAG.
            delete this.updatedValue;
         }
         delete window.needToUpdate;
         delete this.needToUpdate;
      }

      if (window.updatedValue) {                        // WHEN A CLIENT GETS AN UPDATED_VALUE,
         this.updatedValue = window.updatedValue;
         window[name] = this.updatedValue;                   // IT SETS ITS OWN VALUE TO THAT VALUE.
         delete window.updatedValue;                    // ALSO, IF IT WAS WAITING FOR A FIRST
         delete this.updatedValue;
         delete window['waitForFirstUpdate__' + name];  // UPDATE, IT CAN NOW STOP WAITING.
      }

      let i = interval === undefined ? 3 : Math.abs(interval); // DEFAULT interval IS 3 SECS
      let counter = Date.now() / (1000 * i) >> 0;
      if (! neverLoadOrSave && ! window['waitForFirstUpdate__' + name] // IF NOT WAITING FOR A
          && counter > this.counter                     // FIRST UPDATE, THEN AT EVERY interval
          && window.clientID == window.clients[0]) {    // COUNT THE OLDEST CLIENT SAVES ITS
         this.set(name, window[name]);                  // CURRENT VALUE TO PERSISTENT STORAGE.
         if (interval > 0)                              // IF THE INTERVAL IS POSITIVE THEN
            this.broadcastGlobal(name);                 // IT ALSO UPDATES ALL OTHER CLIENTS.
      }
      this.counter = counter;

      return window[name];
   }

   this.updateTimestamp = () => {
      let time = Date.now() / 1000 >> 0;
      if (time > this.time)
         this.set('timestamp', time);
      this.time = time;
   }
   
   // Connect to WebSocket when instantiated
   this.connectSocket(wsPort);
}

// ES Module export only - simpler approach to avoid ESLint errors
export default Server;

