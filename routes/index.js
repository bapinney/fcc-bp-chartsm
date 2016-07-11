var express = require('express');
var router = express.Router();
var chalk = require('chalk');
console.log(chalk.bgBlue.white("Initializing Socket.IO..."));
var io = require("socket.io")(3000);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

io.on('connection', function(socket) {
    console.log("Client connected.");
    socket.on('stockadd', function(stockSymbol) {
        console.log(`Someone added a stock: ${stockSymbol}`);
        //Send that broadcast to everyone...
        io.emit('stockadd', stockSymbol);
    })
});

module.exports = router;
