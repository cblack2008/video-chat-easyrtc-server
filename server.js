const express = require('express');
const serveStatic = require('serve-static');
const easyrtc = require('open-easyrtc');
const pub = require('open-easyrtc/lib/easyrtc_public_obj');
const cors = require('cors');

const http = require('http');
const socketIo = require('socket.io');

// Set process name
process.title = 'node-easyrtc';

const USERS = { test: '1234' };
let AGENT = '';

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
const socketServer = socketIo.listen(webServer, { 'log level': 1 });

const onDisconnect = function (connectionObj, next) {
    console.log('onDisconnect');
    delete USERS[connectionObj.getUsername()];

    // let conObj, socketCb, msg;
    // pub.getConnectionWithEasyrtcid(AGENT, function (err, rcon) {
    //     if (err) {
    //         console.log('Connect' + err);
    //     } else {
    //         conObj = rcon;
    //     }
    // });

    // if (conObj) {
    //     conObj.socket.on('emitEasyrtcMsg', function (msg, socketCallback) {
    //         socketCb = socketCallback;
    //     });

    //     msg = {
    //         msgType: 'userDisconnected',
    //         msgData: {
    //             easyrtcid: connectionObj.getEasyrtcid(),
    //             msgText: 'User Disconnected.',
    //             username: connectionObj.getUsername(),
    //         },
    //     };
    //     console.log('emitting message', msg);
    //     easyrtc.events.emit('emitEasyrtcMsg', conObj, msg.msgType, msg, socketCb, function (err) {
    //         if (err) {
    //             easyrtc.util.logError('[' + appName + '][' + easyrtcid + '] Unhandled easyrtcMsg listener error.', err);
    //         } else {
    //             easyrtc.util.log('User disconnected');
    //         }
    //     });
    // }
    next(null);
};

const onAuthenticate = function (socket, easyrtcid, appName, username, credential, easyrtcAuthMessage, next) {
    console.log('onAuthenticate', credential);

    let conObj, socketCb, msg;
    if (!credential || !credential.isAgent) {
        console.log('user not agent');
        USERS[username] = easyrtcid;

        msg = {
            msgType: 'userConnected',
            msgData: {
                easyrtcid: easyrtcid,
                msgText: 'User connected.',
                username: username,
            },
        };

        console.log('Geting connetion for ' + AGENT);
        pub.getConnectionWithEasyrtcid(AGENT, function (err, rcon) {
            if (err) {
                console.log('Connect' + err);
            } else {
                conObj = rcon;
            }
        });

        if (conObj) {
            conObj.socket.on('emitEasyrtcMsg', function (msg, socketCallback) {
                socketCb = socketCallback;
            });

            console.log('emitting message');
            easyrtc.events.emit('emitEasyrtcMsg', conObj, msg.msgType, msg, socketCb, function (err) {
                if (err) {
                    easyrtc.util.logError(
                        '[' + appName + '][' + easyrtcid + '] Unhandled easyrtcMsg listener error.',
                        err
                    );
                } else {
                    easyrtc.util.log('User connected');
                }
            });
        }
    } else {
        console.log('agent login');
        AGENT = easyrtcid;
    }
    console.log('USERS', USERS);
    next(null);
};

const onEasyrtcMsg = function (connectionObj, msg, socketCallback, next) {
    easyrtc.util.logInfo('Message Received', msg);
    const easyrtcid = connectionObj.getEasyrtcid();
    const appObj = connectionObj.getApp();

    if (msg.msgType === 'checkIsUserConnected') {
        // if (msg.msgData.username in USERS) {
        //     console.log('connectionObj', connectionObj.getEasyrtcid());
        //     connectionObj.events.emit(
        //         'emitEasyrtcMsg',
        //         connectionObj,
        //         'checkIsUserConnectedResponse',
        //         { test: 'data' },
        //         socketCallback,
        //         next
        //     );
        // }
        if (msg.msgData.username in USERS) {
            easyrtc.util.sendSocketCallbackMsg(
                easyrtcid,
                socketCallback,
                {
                    msgType: 'checkIsUserConnected',
                    msgData: {
                        isUserConnected: true,
                        easyrtcid: USERS[msg.msgData.username],
                        username: msg.msgData.username,
                    },
                },
                appObj
            );
        } else {
            easyrtc.util.sendSocketCallbackMsg(
                easyrtcid,
                socketCallback,
                {
                    msgType: 'checkIsUserConnected',
                    msgData: {
                        isUserConnected: false,
                    },
                },
                appObj
            );
        }
    }
    next();
};

easyrtc.events.on('authenticate', onAuthenticate);
easyrtc.events.on('easyrtcMsg', onEasyrtcMsg);
easyrtc.events.on('disconnect', onDisconnect);

// To test, lets print the credential to the console for every room join!
easyrtc.events.on('roomJoin', function (connectionObj, roomName, roomParameter, callback) {
    console.log(
        '[' + connectionObj.getEasyrtcid() + '] Credential retrieved!',
        connectionObj.getFieldValueSync('credential')
    );
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
easyrtc.listen(
    app,
    socketServer,
    null,
    // { appAutoCreateEnable: false, demosEnable: false, logLevel: 'debug', logDateEnable: true },
    function (err, rtcRef) {
        console.log('Initiated');
        rtcRef.createApp('video_chat', { roomDefaultName: 'default' }, null);
    }
);

module.exports = app;
