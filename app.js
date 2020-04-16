var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ipfilter = require('express-ipfilter').IpFilter;

// Routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var publishTxRouter = require('./routes/publish-tx');
var tourRouter = require('./routes/tour');

// var decodeRawRouter = require('./routes/decode-raw-tx');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// public endpoints
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/publish-tx', publishTxRouter);
app.use('/tour', tourRouter);

// private endpoints
// var ipsLoopback = ['127.0.0.1','::1'];
// app.use(ipfilter(ipsLoopback,{mode:'allow'}));
// app.use('/decode-raw-tx', decodeRawRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
