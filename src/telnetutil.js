
var assert = require('assert');


module.exports = {

    /**
     * Call with a data buffer to be written to ensure any sequences
     * that need escaping (like 0xff) are escaped before sending.
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
    }
};



