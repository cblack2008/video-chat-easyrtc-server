const express = require('express');
const serveStatic = require('serve-static');
const easyrtc = require('open-easyrtc');
const cors = require('cors');

const http = require('http');
const socketIo = require('socket.io');

// Set process name
process.title = 'node-easyrtc';

const app = express();
app.use(cors());
app.use(serveStatic('static', { index: ['index.html'] }));

app.get('/health-check', (req, res) => {
    res.json({ message: 'Server up and running' });
});

// if (local) {
// Start Express http server on port 8080
var webServer = http.createServer(app);

// Listen on port 8080
webServer.listen(5000, function () {
    console.log('listening on http://localhost:5000');
});
// }

// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, { 'log level': 1 });

var onAuthenticate = function (socket, easyrtcid, appName, username, credential, easyrtcAuthMessage, next) {
    console.log('username', username);
    console.log('credentials', credential);
    next(null);
};

easyrtc.events.on('authenticate', onAuthenticate);

// To test, lets print the credential to the console for every room join!
easyrtc.events.on('roomJoin', function (connectionObj, roomName, roomParameter, callback) {
    console.log(
        '[' + connectionObj.getEasyrtcid() + '] Credential retrieved!',
        connectionObj.getFieldValueSync('credential')
    );
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(
    app,
    socketServer,
    null,
    // { appAutoCreateEnable: false, demosEnable: false, logLevel: 'debug', logDateEnable: true },
    function (err, rtcRef) {
        console.log('Initiated');
        rtcRef.createApp('video_chat', { roomDefaultName: 'kh-chris' }, null);
    }
);

module.exports = app;
