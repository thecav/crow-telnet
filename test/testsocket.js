
var assert = require("assert");
var util = require("util");
var EventEmitter = require('events').EventEmitter;

var BufferList = require("../src/bufferlist");


/**
 * Basic, bare bones mock Socket implementation for use in test
 * drivers.  It largely doesn't attempt to mimic every bit of
 * sockets, but enough to push data through it and you can create
 * the incoming data packets you want.
 *
 *     var socket = new TestSocket();
 *     someObj.connectWithSocket(socket);
 *
 *     socket.read(new Buffer([1, 2, 3])); // This will fire "data"
 *     socket.bytesRead === 6;
 *
 *     socket.on("write", function(buffer) {
 *         // React to someone writing on this test socket
 *     });
 *
 *     someObj.writeBytes(42);
 *     socket.bytesWritten === 42;
 *
 *     socket.close();
 *
 */
function TestSocket() {
    this.host = null;
    this.port = null;
    this.autoConnect = true;
    this.resetStats();
}

util.inherits(TestSocket, EventEmitter);


TestSocket.prototype.connect = function(params) {
    this.host = params.host;
    this.port = params.port;

    this.emit("testConnect");

    if (this.autoConnect) {
        this.connectSuccess();
    }
};

TestSocket.prototype.connectSuccess = function() {
    this.emit("connect");
};

TestSocket.prototype.end = function() {
    this.host = null;
    this.port = null;
    this.emit("close");
};

TestSocket.prototype.write = function(buffer) {
    this.bytesWritten += buffer.length;
    this._sentBuf.push(buffer);
    this.emit("testWrite", buffer);
};

TestSocket.prototype.read = function(buffer) {
    this.bytesRead += buffer.length;
    this._receivedBuf.push(buffer);
    this.emit("data", buffer);
};

TestSocket.prototype.resetStats = function() {
    this.bytesRead = 0;
    this.bytesWritten = 0;
    this._sentBuf = new BufferList();
    this._receivedBuf = new BufferList();
};

Object.defineProperty(TestSocket.prototype, "sent", {
    get: function() {
        return this._sentBuf.getBuffer();
    },
    enumerable: true
});

Object.defineProperty(TestSocket.prototype, "received", {
    get: function() {
        return this._receivedBuf.getBuffer();
    },
    enumerable: true
});


module.exports = TestSocket;






