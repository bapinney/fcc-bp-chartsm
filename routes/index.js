var express = require('express');
var router = express.Router();
var chalk = require('chalk');
console.log(chalk.bgBlue.white("Initializing Socket.IO..."));
var io = require("socket.io")(3000);
var yahooFinance = require('yahoo-finance');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'StockWatch' });
});

router.post('/fetchCharts', function(req, res, next) {
    console.log("Echoing out req body");
    console.dir(req.body);
    var queryArr = [];
    var objKeys = Object.keys(req.body);
    for (var i=0; i < objKeys.length; i++) {
        //The data from the client must be in an Object, but the data we query stocks for must be an array...
        queryArr.push(req.body[objKeys[i]]);
    }
    console.log(queryArr);
    /*
    yahooFinance.historical({
        symbols: queryArr,
        from: '2012-01-01',
        to: '2012-12-31',
        // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    }, function (err, quotes) {
        res.json(quotes);
    });
    */
})

io.on('connection', function(socket) {
    console.log("Client connected.");
    socket.on('stockadd', function(stockSymbol) {
        console.log(`Someone added a stock: ${stockSymbol}`);
        //Send that broadcast to everyone...
        io.emit('stockadd', stockSymbol);
    });
    socket.on('stockremove', function(stockSymbol) {
        console.log(`Someone removed a stock: ${stockSymbol}`);
        //Send that broadcast to everyone...
        io.emit('stockremove', stockSymbol);
    });
});

module.exports = router;
