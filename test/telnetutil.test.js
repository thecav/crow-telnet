
var assert = require('chai').assert;
var TelnetUtil = require('../src/telnetutil');


describe("TelnetUtil", function() {

    it("structure", function() {
        assert.isObject(TelnetUtil);
        assert.deepEqual(Object.keys(TelnetUtil), [
            "escapeSendData",
            "unescapeSendData"
        ]);
    });

    it("method: escapeSendData(buffer)", function() {
        var bufA = new Buffer([]);
        assert(bufA === TelnetUtil.escapeSendData(bufA));

        var bufB = new Buffer([1, 2, 3]);
        assert.equal(bufB, TelnetUtil.escapeSendData(bufB));

        var bufC = new Buffer([255]);
        var result = TelnetUtil.escapeSendData(bufC);
        assert.notEqual(bufC, result);
        assert.equal(result.compare(new Buffer([255, 255])), 0);

        var bufD = new Buffer([1, 2, 255, 3, 4]);
        var result = TelnetUtil.escapeSendData(bufD);
        assert.notEqual(bufD, result);
        assert.equal(result.compare(new Buffer([1, 2, 255, 255, 3, 4])), 0);

        var bufE = new Buffer([255, 1, 255]);
        var result = TelnetUtil.escapeSendData(bufE);
        assert.notEqual(bufE, result);
        assert.equal(result.compare(new Buffer([255, 255, 1, 255, 255])), 0);
    });

    it("method: unescapeSendData(buffer)", function() {
        var bufA = new Buffer([]);
        assert(bufA === TelnetUtil.unescapeSendData(bufA));

        var bufB = new Buffer([1, 2, 3]);
        assert.equal(bufB, TelnetUtil.unescapeSendData(bufB));

        var bufC = new Buffer([255]);
        assert.throws(function() {
            TelnetUtil.unescapeSendData(bufC);
        });

        var bufD = new Buffer([255, 255]);
        var result = TelnetUtil.unescapeSendData(bufD);
        assert.notEqual(bufD, result);
        assert.equal(result.compare(new Buffer([255])), 0);

        var bufE = new Buffer([255, 255, 1, 255, 255]);
        var result = TelnetUtil.unescapeSendData(bufE);
        assert.notEqual(bufE, result);
        assert.equal(result.compare(new Buffer([255, 1, 255])), 0);
    });

});

