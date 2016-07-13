console.log("Starting app...");
var chalk = require("chalk");

console.log(chalk.bgBlue.white("Loading config..."));
var config = require('./config/config.js');

var port = process.env.PORT;

console.log(chalk.bgYellow.black("Loading packages..."));
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var yahooFinance = require('yahoo-finance');
var mongoose = require('mongoose');
var stocklistSchema = require('./models/stocklist.js')

console.log(chalk.bgYellow.black("Loading routes..."));
var routes = require('./routes/index');
var users = require('./routes/users');

console.log(chalk.bgBlue.white("Initializing Express..."));
var app = express();
if (process.env.APP_ENV === "development") {
    console.log(chalk.bgBlue.white("App environment is DEVELOPMENT"));
    app.set('env', 'development');
}
var http = require('http').Server(app);

// view engine setup


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

console.log(chalk.bgYellow.black("Connecting to MongoDB..."));
mongoose.connect(process.env.MONGO_URI);
global.db = mongoose.connection;

global.db.on('error', function(error) {
    console.error("Mongoose connection error: ");
    console.dir(error);
    console.log("Exiting...");
});

global.db.once('open', function () {
    console.log(chalk.bgGreen.black("Connected to MongoDB."));
    app.listen(port, function() {
        console.log(chalk.bgGreen.black(`Listening on port ${port}.`));
    });
});

module.exports = app;
