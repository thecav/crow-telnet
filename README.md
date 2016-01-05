# crow-telnet

Node.js telnet client

[![Build Status](https://travis-ci.org/thecav/crow-telnet.svg?branch=master)](https://travis-ci.org/thecav/crow-telnet)

## Usage

```javascript
    var telnet = new Telnet();

    telnet.on("optionRequested", function(option) {
        console.log("Option Requested: ", option);
    });

    telnet.on("optionRejected", function(option) {
        console.log("Option Rejected: ", option);
    });

    telnet.on("data", function(buffer) {
        console.log("Data: ", buffer);
    });

    telnet.connect({
        host: "alteraeon.com",
        port: 3000
    });
```

