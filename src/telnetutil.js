'use strict';

var assert = require('assert');
var util = require('util');


module.exports = {

    /**
     * Call with a data buffer to be written to ensure any sequences
     * that need escaping (like 0xff) are escaped before sending.
     * If the input buffer needs no escaping, the input buffer will be
     * returned with no copy made.  If escaping is necessary a newly
     * allocated buffer will be returned having a copy of the original
     * input buffer with any additional escaping bytes needed.
     *
     *     var buffer = new Buffer([1, 2, 255]);
     *
     *     send(TelnetUtil.escapeSendData(buffer));
     *
     */
    escapeSendData: function(buffer) {
        assert(buffer);

        var numFF = 0;
        for (var i = 0; i < buffer.length; ++i) {
            if (buffer[i] === 0xff) {
                ++numFF;
            }
        }

        if (numFF === 0) {
            return buffer;
        }

        var newBuf = new Buffer(buffer.length + numFF);
        var index = 0;
        for (i = 0; i < buffer.length; ++i) {
            if (buffer[i] === 0xff) {
                newBuf[index++] = 0xff;
            }
            newBuf[index++] = buffer[i];
        }

        return newBuf;
    },

    /**
     * Call with a data buffer that came off the wire and may need
     * to be unescaped before user processing (like 0xff).
     * If the input buffer needs no unescaping, the input buffer will be
     * returned with no copy made.  If unescaping is necessary a newly
     * allocated buffer will be returned having a copy of the original
     * input buffer with any unescaping that was needed.
     *
     *     var buffer = new Buffer([1, 255, 255]);
     *
     *     process(TelnetUtil.unescapeSendData(buffer));
     *
     */
    unescapeSendData: function(buffer) {
        assert(buffer);

        var numFF = 0;
        for (var i = 0; i < buffer.length; ++i) {
            if (buffer[i] === 0xff) {
                ++numFF;
            }
        }

        if (numFF === 0) {
            return buffer;
        }

        // Should be even since there should never be a lone IAC within
        // an escaped data buffer
        assert(numFF % 2 === 0, "Single IAC, Buffer: " + util.inspect(buffer));

        var newBuf = new Buffer(buffer.length - (numFF / 2));
        var index = 0;
        for (i = 0; i < buffer.length; ++i) {
            if (buffer[i] === 0xff) {
                ++i;
            }
            newBuf[index++] = buffer[i];
        }

        return newBuf;
    }
};



