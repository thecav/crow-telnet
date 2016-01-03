
var assert = require('assert');
var dns = require('dns');
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var TelnetUtil = require('./telnetutil');
var BufferList = require('./bufferlist');

var DEBUG = false;

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


var log = function() {
    if (!DEBUG) {
        return;
    }
    var args = Array.prototype.slice.call(arguments);
    args.unshift("Telnet: ");
    console.log.apply(console, args);
};



var Telnet = function() {
    this._socket = null;
    this._connected = false;
    this._closed = false;
    this._options = {};
    this._dataState = STATE_READ;
    this._buffer = new BufferList();
};

util.inherits(Telnet, EventEmitter);

// PUBLIC METHODS

Telnet.prototype.connect = function(params, socket) {
    assert(!this._socket, "Connection already open");
    assert(typeof params.host === "string", "Invalid host");
    assert(typeof params.port === "number", "Invalid port");

    this._socket = socket || new net.Socket();
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

    this._connected = false;
    this._socket.end();
    this._socket.removeAllListeners();
    this._socket = null;
};

Telnet.prototype.requestOption = function(option) {
    assert(this._socket && this._connected, "Not connected");
    assert(false, "Not implemented");
};

Telnet.prototype.rejectOption = function(option) {
    assert(this._socket && this._connected, "Not connected");
    assert(false, "Not implemented");
};

Telnet.prototype.subnegotiateOption = function(option, buffer) {
    assert(this._socket && this._connected, "Not connected");
    assert(false, "Not implemented");
};

Telnet.prototype.send = function(buffer) {
    assert(this._socket && this._connected, "Not connected");

    this._socket.write(TelnetUtil.escapeSendData(buffer));
};

// PUBLIC PROPERTIES

Object.defineProperty(Telnet.prototype, "isConnected", {
    get: function() {
        return this._connected;
    },
    enumerable: true
});


// PRIVATE METHODS

Telnet.prototype._onSocketConnect = function() {
    log("connect");
    this._connected = true;
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
        log("  state: " + this._dataState + ", val: " + val + ", i: " + i + ", startIndex: " + startIndex);
        switch (this._dataState) {
            case STATE_READ:
                if (val === OP.IAC) {
                    this._dataState = STATE_IAC;
                }
                break;

            case STATE_WILL:
            case STATE_DO:
                assert(this._buffer.length === 0, "Buffer not empty: " + util.inspect(this._buffer));
                this._acceptOption(val);
                startIndex = i + 1;
                this._dataState = STATE_READ;
                break;

            case STATE_WONT:
            case STATE_DONT:
                assert(this._buffer.length === 0);
                this._rejectOption(val);
                startIndex = i + 1;
                this._dataState = STATE_READ;
                break;

            case STATE_IAC:
                switch (val) {
                    // Double IAC is an escaped one, continue
                    case OP.IAC:  this._dataState = STATE_READ; break;

                    case OP.WILL: this._dataState = STATE_WILL; break;
                    case OP.WONT: this._dataState = STATE_WONT; break;
                    case OP.DO:   this._dataState = STATE_DO;   break;
                    case OP.DONT: this._dataState = STATE_DONT; break;
                    case OP.SB:   this._dataState = STATE_SB;   break;

                    default:
                        log("Prev buffer: ", this._buffer);
                        log("Cur buffer: ", buffer.slice(startIndex));
                        assert(false, "Invalid val " + val + " after IAC");
                }

                if (val !== OP.IAC) {
                    // Since now we know that last IAC we got was actually the start
                    // of a command and not just an escaped IAC in the data, we need
                    // to emit the data that accumulated thus far up until this last
                    // IAC.
                    this._buffer.push(buffer.slice(startIndex, i + 1));
                    this._buffer.pop(2);
                    this._emitData();
                    startIndex = i + 1;
                }

                break;

            case STATE_SB:
                if (val === OP.IAC) {
                    this._dataState = STATE_SB_IAC;
                }
                break;

            case STATE_SB_IAC:
                if (val === OP.IAC) {
                    this._dataState = STATE_SB;
                }
                else {
                    assert(val === OP.SE, "Expected SE after SB IAC");
                    this._buffer.push(buffer.slice(startIndex, i + 1));
                    this._buffer.pop(2);
                    this._emitSubnegotiation();
                    startIndex = i + 1;
                    state = STATE_READ;
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
        this._buffer.push(buffer.slice(startIndex));
    }

    // Any other state than STATE_READ and we have to wait for more
    // data to know for sure what to do with what is left.  End on
    // STATE_READ and we should emit to observers what we have
    if (this._dataState === STATE_READ) {
        this._emitData();
    }

};

Telnet.prototype._emitData = function() {
    if (this._buffer.length > 0) {
        var buffer = this._buffer.getBuffer();
        this._buffer.clear();
        var outputData = TelnetUtil.unescapeSendData(buffer);
        log("Event data: ", outputData);
        this.emit("data", outputData);
    }
};

// Server accepts/wants this option
Telnet.prototype._acceptOption = function(option) {
    var opt = this._options[option];
    if (opt) {
        if (opt.state === "requested" || opt.state === "proposed") {
            opt.state = "done";
            opt.on = true;
            log("Event optionAccepted: ", option);
            this.emit("optionAccepted", option);
        }
        else {
            assert(false, "Changing option values after negotiated not impl", option);
        }
    }
    else {
        this._options[option] = {
            state: "proposed",
            on: true
        };
        log("Event optionRequested: ", option);
        this.emit("optionRequested", option);
    }

    this._buffer.clear();
};

// Server rejects/doesn't want this option
Telnet.prototype._rejectOption = function(option) {
    var opt = this._options[option];
    if (opt) {
        if (opt.state === "requested" || opt.state === "proposed") {
            opt.state = "done";
            opt.on = false;
            log("Event optionRejected: ", option);
            this.emit("optionRejected", option);
        }
        else {
            assert(false, "Changing option values after negotiated not impl", option);
        }
    }
    else {
        // Server gets the final say
        this._options[option] = {
            state: "done",
            on: false
        };
        log("Event optionRejected: ", option);
        this.emit("optionRejected", option);
    }

    this._buffer.clear();
};



module.exports = Telnet;


