'use strict';

var assert = require('chai').assert;
var util = require('util');
var Telnet = require('../src/telnet');
var TestSocket = require("./testsocket");


var testForEach = function(cases, callback) {
    cases.forEach(function(testCase, index) {
        try {
            callback.call(null, testCase, index, cases);
        }
        catch (e) {
            throw new Error("Case #" + index +
                            "\n Error: " + e.message +
                            "\n Stack: " + e.stack);
        }
    });
};

describe("Telnet", function() {

    var B = function() {
        var args = Array.prototype.slice.call(arguments);
        return new Buffer(args);
    };


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

        var sentData = null;
        socket.on("testWrite", function(data) {
            sentData = data;
        })

        var bufA = new Buffer([1, 2]);
        telnet.send(bufA);
        assert.equal(socket.bytesWritten, 2);
        assert(bufA.compare(socket.sent) === 0);
        assert(sentData.compare(bufA) === 0);
        socket.resetStats();

        var bufB = new Buffer([1, 255, 2]);
        telnet.send(bufB);
        assert.equal(socket.bytesWritten, 4);
        assert((new Buffer([1, 255, 255, 2])).compare(socket.sent) === 0);
        assert(sentData.compare(bufB) !== 0);
        socket.resetStats();

        var bufC = new Buffer(0);
        telnet.send(bufC);
        assert.equal(socket.bytesWritten, 0);
        assert(sentData.compare(bufC) === 0);
    });

    it("method: requestOption(option)", function() {
        var socket = new TestSocket();
        socket.autoConnect = false;
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.requestOption(42);
        });

        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        socket.connectSuccess();

        assert.throws(function() {
            // Not impl
            telnet.requestOption(42);
        });
    });

    it("method: rejectOption(option)", function() {
        var socket = new TestSocket();
        socket.autoConnect = false;
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.rejectOption(42);
        });

        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        socket.connectSuccess();

        assert.throws(function() {
            // Not impl
            telnet.rejectOption(42);
        });
    });

    it("method: subnegotiateOption(option)", function() {
        var socket = new TestSocket();
        socket.autoConnect = false;
        var telnet = new Telnet();

        assert.throws(function() {
            telnet.subnegotiateOption(42, null);
        });

        telnet.connect({ host: "abc.com", port: 1234 }, socket);
        socket.connectSuccess();

        assert.throws(function() {
            // Not impl
            telnet.subnegotiateOption(42, null);
        });
    });

    it("data: simple data", function() {

        var B = function() {
            var args = Array.prototype.slice.call(arguments);
            return new Buffer(args);
        };

        var cases = [
            {
                inputData:  [B(1, 2, 3)],
                outputData: [B(1, 2, 3)],
            },
            {
                inputData:  [B(1, 2), B(3)],
                outputData: [B(1, 2), B(3)],
            },
            {
                // Escaped IAC in the data
                inputData:  [B(1, 0xff, 0xff, 3)],
                outputData: [B(1, 0xff, 3)],
            },
            {
                // No data event emitted because we're stuck
                // waiting to see this last IAC is going to
                // be escaped or the start of a command
                inputData:  [B(1, 2, 0xff)],
                outputData: [],
            },
            {
                // Escaped IAC split over 2 packets
                inputData:  [B(1, 2, 0xff), B(0xff, 3)],
                outputData: [B(1, 2, 0xff, 3)],
            },
            {
                // NOP split across packets
                inputData:  [B(1, 2, 0xff), B(0xf1, 3)],
                outputData: [B(1, 2), B(3)],
            },
        ];

        testForEach(cases, function(item) {
            var socket = new TestSocket();
            var telnet = new Telnet();
            telnet.connect({ host: "abc.com", port: 1234 }, socket);

            var outputData = [];
            telnet.on("data", function(buffer) {
                outputData.push(buffer);
            });

            socket.input(item.inputData);

            assert.deepEqual(outputData, item.outputData);
        });

    });

    it("data: accept/reject options", function() {

        var cases = [
            {
                inputData:     [B(1, 2, 3)],
                outputData:    [B(1, 2, 3)],
                acceptOptions: [],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb, 0x46)],
                outputData:    [],
                acceptOptions: [0x46],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb), B(0x46)],
                outputData:    [],
                acceptOptions: [0x46],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff), B(0xfb, 0x46)],
                outputData:    [],
                acceptOptions: [0x46],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff), B(0xfb), B(0x46)],
                outputData:    [],
                acceptOptions: [0x46],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb, 0x46,
                                  0xff, 0xfb, 0x5a)],
                outputData:    [],
                acceptOptions: [0x46, 0x5a],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb, 0x46),
                                B(0xff, 0xfb, 0x5a)],
                outputData:    [],
                acceptOptions: [0x46, 0x5a],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb, 0x46,
                                  3,
                                  0xff, 0xfb, 0x5a)],
                outputData:    [B(3)],
                acceptOptions: [0x46, 0x5a],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb),
                                B(0x46, 3),
                                B(0xff, 0xfb, 0x5a)],
                outputData:    [B(3)],
                acceptOptions: [0x46, 0x5a],
                rejectOptions: [],
            },
            {
                inputData:     [B(0xff, 0xfb),
                                B(0x46, 3, 0xff),
                                B(0xfb, 0x5a)],
                outputData:    [B(3)],
                acceptOptions: [0x46, 0x5a],
                rejectOptions: [],
            },
        ];

        testForEach(cases, function(item, index) {
            var socket = new TestSocket();
            var telnet = new Telnet();
            telnet.connect({ host: "abc.com", port: 1234 }, socket);

            var outputData = [];
            telnet.on("data", function(buffer) {
                outputData.push(buffer);
            });

            var acceptOptions = [];
            telnet.on("optionRequested", function(option) {
                acceptOptions.push(option);
            });

            var rejectOptions = [];
            telnet.on("optionRejected", function(option) {
                rejectOptions.push(option);
            });

            socket.input(item.inputData);

            assert.deepEqual(outputData,    item.outputData);
            assert.deepEqual(acceptOptions, item.acceptOptions);
            assert.deepEqual(rejectOptions, item.rejectOptions);
        });

    });

    it("command: NOP", function() {
        var socket = new TestSocket();
        var telnet = new Telnet();
        telnet.connect({ host: "abc.com", port: 1234 }, socket);

        socket.input(B(0xff, 0xf1));

    });

    it("command: AYT", function() {
        var socket = new TestSocket();
        var telnet = new Telnet();
        telnet.connect({ host: "abc.com", port: 1234 }, socket);

        var numCalled = 0;
        telnet.on("areYouThere", function() {
            ++numCalled;
        });

        socket.input(B(0xff, 0xf6));
        assert.equal(numCalled, 1);
    });

    it("command: GA", function() {
        var socket = new TestSocket();
        var telnet = new Telnet();
        telnet.connect({ host: "abc.com", port: 1234 }, socket);

        var numCalled = 0;
        telnet.on("goAhead", function() {
            ++numCalled;
        });

        socket.input(B(0xff, 0xf9));
        assert.equal(numCalled, 1);
    });

    it("command: SB", function() {

        var cases = [
            {
                inputData:  [B(0xff, 0xfa, 0x46, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B()]
            },
            {
                inputData:  [B(0xff), B(0xfa, 0x46, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B()]
            },
            {
                inputData:  [B(0xff, 0xfa), B(0x46, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B()]
            },
            {
                inputData:  [B(0xff, 0xfa), B(0x46, 0xff), B(0xf0)],
                option:     [0x46],
                subnegData: [B()]
            },
            {
                inputData:  [B(0xff, 0xfa, 0x46, 1, 2, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B(1, 2)]
            },
            {
                inputData:  [B(0xff, 0xfa, 0x46, 1), B(2, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B(1, 2)]
            },
            {
                // Embedded 255 in SB data
                inputData:  [B(0xff, 0xfa, 0x46, 0xff, 0xff, 0xff, 0xf0)],
                option:     [0x46],
                subnegData: [B(0xff)]
            },
            {
                inputData:  [B(0xff, 0xfa, 1, 5, 0xff, 0xf0,
                               0xff, 0xfa, 2, 6, 0xff, 0xf0)],
                option:     [1, 2],
                subnegData: [B(5), B(6)]
            },
            {
                inputData:  [B(0xff, 0xfa, 1, 5, 0xff), B(0xf0,
                               0xff, 0xfa, 2, 6, 0xff, 0xf0)],
                option:     [1, 2],
                subnegData: [B(5), B(6)]
            },
        ];
        testForEach(cases, function(item) {
            var socket = new TestSocket();
            var telnet = new Telnet();
            telnet.connect({ host: "abc.com", port: 1234 }, socket);

            telnet.on("data", function(buffer) {
                assert(false, "Unexpected data: ", buffer);
            });

            telnet.on("error", function(err) {
                assert(err.indexOf("Received subnegotiation data before agreed") === 0);
            });

            var gotOptions = [];
            var gotBuffers = [];
            telnet.on("subnegotiateData", function(option, buffer) {
                gotOptions.push(option);
                gotBuffers.push(buffer);
            });

            socket.input(item.inputData);

            assert.deepEqual(gotOptions, item.option);
            assert.deepEqual(gotBuffers, item.subnegData);
        });

    });

    it("commands not implemented", function() {
        var socket = new TestSocket();
        var telnet = new Telnet();
        telnet.connect({ host: "abc.com", port: 1234 }, socket);

        var numErrors = 0;
        telnet.on("error", function(err) {
            ++numErrors;
        });

        var data = null;
        telnet.on("data", function(buffer) {
            data = buffer;
        });

        var cases = [
            0xf2,  // Data-mark
            0xf3,  // Break
            0xf4,  // Suspend
            0xf5,  // Abort output
            0xf7,  // Erase character
            0xf8,  // Erase line
        ];

        testForEach(cases, function(command, index) {
            socket.input(B(0xff, command, 10 + index));
            assert.equal(numErrors, index + 1);
            assert.equal(B(10+index).compare(data), 0);
        });

    });


});



