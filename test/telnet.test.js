
var assert = require('chai').assert;
var util = require('util');
var Telnet = require('../src/telnet');
var TestSocket = require("./testsocket");


describe("Telnet", function() {

    it("structure", function() {
        assert.isFunction(Telnet);
        assert.deepEqual(
            Object.keys(Telnet.prototype).filter(function(name) {
                return name[0] !== "_";
            }), [
                "connect",
                "close",
                "requestOption",
                "rejectOption",
                "subnegotiateOption",
                "send",
                "isConnected"
            ]
        );
    });

    it("initial state", function() {
        var telnet = new Telnet();
        assert.equal(telnet.isConnected, false);
    });

    it("method: connect(params)", function() {
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.connect();
        });
        assert.throws(function() {
            telnet.connect({ host: 42 });
        });
        assert.throws(function() {
            telnet.connect({ port: "abc.com" });
        });

        var connectCalled = 0;
        telnet.on("connect", function() {
            connectCalled++;
        });

        var socket = new TestSocket();
        socket.autoConnect = false;
        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        assert.equal(socket.host, "abc.com");
        assert.equal(socket.port, 1234);
        assert.equal(telnet.isConnected, false);
        assert.equal(connectCalled, 0);

        socket.connectSuccess();
        assert.equal(telnet.isConnected, true);
        assert.equal(connectCalled, 1);
    });

    it("method: close()", function() {
        var socket = new TestSocket();
        socket.autoConnect = false;
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.close();
        });

        var connectCalled = 0;
        telnet.on("connect", function() {
            connectCalled++;
        });

        var closedCalled = 0;
        telnet.on("close", function() {
            closedCalled++;
        });

        // Close before the connection finished
        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        telnet.close();
        assert.equal(connectCalled, 0);
        assert.equal(closedCalled, 1);
        assert.equal(telnet.isConnected, false);

        // Close after the connection finished
        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        socket.connectSuccess();
        assert.equal(connectCalled, 1);
        assert.equal(telnet.isConnected, true);
        telnet.close();
        assert.equal(closedCalled, 2);
        assert.equal(telnet.isConnected, false);
    });

    it("method: send(buffer)", function() {
        var socket = new TestSocket();
        socket.autoConnect = false;
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.send(new Buffer(10));
        });

        telnet.connect({ host: "abc.com", port: 1234 }, socket);

        assert.throws(function() {
            telnet.send(new Buffer(10));
        });

        socket.connectSuccess();

        var bufA = new Buffer([1, 2]);
        telnet.send(bufA);
        assert.equal(socket.bytesWritten, 2);
        assert(bufA.compare(socket.sent) === 0);
        socket.resetStats();

        var bufB = new Buffer([1, 255, 2]);
        telnet.send(bufB);
        assert.equal(socket.bytesWritten, 4);
        assert((new Buffer([1, 255, 255, 2])).compare(socket.sent) === 0);
        socket.resetStats();
    });



});



