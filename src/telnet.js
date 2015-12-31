
var assert = require('assert');
var dns = require('dns');
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var telnetutil = require('./telnetutil');


var log = function() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, args.unshift("Telnet: "));
};


var OP = {
    SE:   0xf0,
    SB:   0xfa,
    WILL: 0xfb,
    WONT: 0xfc,
    DO:   0xfd,
    DONT: 0xfe,
    IAC:  0xff,
};


var STATE_READ   = 0;
var STATE_IAC    = 1;
var STATE_WILL   = 2;
var STATE_WONT   = 3;
var STATE_DO     = 4;
var STATE_DONT   = 5
var STATE_SB     = 6;
var STATE_SB_IAC = 7;


var Telnet = function() {
    this._socket = null;
    this._connected = false;
    this._closed = false;
    this._options = {};
    this._dataState = STATE_READ;
    this._prevBuffers = [];
};

util.inherits(Telnet, EventEmitter);


// PUBLIC METHODS

Telnet.prototype.connect = function(params) {
    assert(!this._socket, "Connection already open");
    assert(typeof params.host === "string", "Invalid host");
    assert(typeof params.port === "number", "Invalid port");

    this._socket = new net.Socket();
    this._socket.on("connect", this._onSocketConnect.bind(this));
    this._socket.on("lookup",  this._onSocketLookup.bind(this));
    this._socket.on("error",   this._onSocketError.bind(this));
    this._socket.on("data",    this._onSocketData.bind(this));
    this._socket.on("close",   this._onSocketClose.bind(this));

    this._socket.connect({
        host: params.host,
        port: params.port,
    });
};

Telnet.prototype.close = function() {
    assert(this._socket, "Connection is already closed");
    this._socket.end();
};

Telnet.prototype.requestOption = function(option, onOff) {
    assert(false, "Not implemented");
};

Telnet.prototype.subnegotiateOption = function(option, buffer) {
    assert(false, "Not implemented");
};

Telnet.prototype.send = function(buffer) {
    assert(this._socket && this._connected, "Not connected");

    this._socket.write(telnetutil.escapeSendData(buffer));
};

// PRIVATE METHODS

Telnet.prototype._onSocketConnect = function() {
    log("connect");
    this.emit("connect");
};

Telnet.prototype._onSocketLookup = function(err, address) {
    log("lookup", err, "address:", address);
};

Telnet.prototype._onSocketError = function(buffer) {
    log("error", buffer);
    this.emit("error", buffer);
};

Telnet.prototype._onSocketData = function(buffer) {
    log("data", buffer);
    this._processData(buffer);
};

Telnet.prototype._onSocketClose = function(buffer) {
    log("close");
    this.emit("close");
};


Telnet.prototype._processData = function(buffer) {
    assert(buffer.length > 0);

    var startIndex = 0;
    for (var i = 0; i < buffer.length; ++i) {
        var val = buffer[i];
        switch (this._dataState) {
            case STATE_READ:
                if (val === OP.IAC) {
                    state = STATE_IAC;
                }
                break;

            case STATE_WILL:
            case STATE_DO:
                this._prevBuffers.push(buffer.slice(startIndex, i - startIndex));
                this._acceptOption(val);
                startIndex = i + 1;
                state = STATE_READ;
                break;

            case STATE_WONT:
            case STATE_DONT:
                this._prevBuffers.push(buffer.slice(startIndex, i - startIndex));
                this._rejectOption(val);
                startIndex = i + 1;
                state = STATE_READ;
                break;

            case STATE_IAC:
                switch (val) {
                    // Double IAC is an escaped one, continue
                    case OP.IAC:  state = STATE_READ; break;
                    case OP.WILL: state = STATE_WILL; break;
                    case OP.WONT: state = STATE_WONT; break;
                    case OP.DO:   state = STATE_DO;   break;
                    case OP.DONT: state = STATE_DONT; break;
                    case OP.SB:   state = STATE_SB;   break;

                    default:
                        log("Prev buffers: ", this._prevBuffers);
                        log("Cur buffer: ", buffer.slice(startIndex));
                        assert(false, "Invalid val", val, "after IAC");
                }
                break;

            case STATE_SB:
                if (val === OP.IAC) {
                    state = STATE_SB_IAC;
                }
                break;

            case STATE_SB_IAC:
                if (val === OP.IAC) {
                    state = STATE_SB;
                }
                else {
                    assert(val === OP.SE, "Expected SE after SB IAC");
                    this._prevBuffers.push(buffer.slice(startIndex, i - startIndex));
                    this._emitSubnegotiation();
                }
                break;

            default:
                assert(false, "Invalid state: ", this._dataState);
        }
    }

    // If there are still pieces of the buffer that we haven't sent out
    // need to keep what is left until we get more data to know what
    // to do with it.
    if (startIndex < buffer.length) {
        this._prevBuffers.push(buffer.slice(startIndex));
    }

    // Any other state than STATE_READ and we have to wait for more
    // data to know for sure what to do with what is left.  End on
    // STATE_READ and we should emit to observers what we have
    if (state === STATE_READ) {
        this._emitData();
    }

};

Telnet.prototype._emitData = function(buffer, startIndex, endIndex) {
    assert(startIndex >= 0);

    var bufPiece = buffer.slice(startIndex, length);
    this.emit("data", bufPiece);
};



module.exports = Telnet;


