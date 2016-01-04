# crow-telnet

Node.js telnet client

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

