var express = require('express');
var router = express.Router();
var chalk = require('chalk');
console.log(chalk.bgBlue.white("Initializing Socket.IO..."));
var io = require("socket.io")(3000);
var yahooFinance = require('yahoo-finance');
var mongoose = require('mongoose');
var Stocklist = require('../models/stocklist.js');

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
});

// Returns the stocks currently added
router.get('/fetchStocks', function(req, res, next) {
    Stocklist.findOne({}, function(err, stocklist) {
        if (err) {
            console.error(err);
        }
        if (stocklist.stocks) {
            var jsonStr = {}; //Empty object for AJAX
            for (var i=0; i<stocklist.stocks.length; i++) {
                jsonStr[i] = stocklist.stocks[i];
            }
            res.json(jsonStr);
        }
    })
});

io.on('connection', function(socket) {
    console.log("Client connected.");
    socket.on('stockadd', function(stockSymbol) {
        console.log(`Someone added a stock: ${stockSymbol}`);
        Stocklist.findOne({}, function(err, stocklist) {
            if (err) {
                console.error(err);
            }
            if (stocklist) {
                stocklist.stocks.push(stockSymbol);
                stocklist.save(function(err) {
                    if (err) {
                        console.error(err);
                    }
                    console.log(`Success adding symbol: ${stockSymbol}`);
                    //Send that broadcast to everyone...
                    io.emit('stockadd', stockSymbol);
                });
            }
            else {
                console.error("No stocklist document found...");
            }
        });        
    });
    socket.on('stockremove', function(stockSymbol) {
        console.log(`Someone removed a stock: ${stockSymbol}`);
        Stocklist.findOne({}, function(err, stocklist) {
            if (err) {
                console.error(err);
            }
            if (stocklist) {
                stocklist.stocks.pull(stockSymbol);
                stocklist.save(function(err) {
                    if (err) {
                        console.error(err);
                    }
                    console.log(`Success removing symbol: ${stockSymbol}`);
                    //Send that broadcast to everyone...
                    io.emit('stockremove', stockSymbol);
                })
            }
        })
    });
});

module.exports = router;
