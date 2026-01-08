var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
var router = require('./routes/router');

var app = express();

// 1. Configuración del motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));

// 2. CONFIGURACIÓN DE MIDDLEWARES (Debe ir ANTES de las rutas)
// AQUÍ CORREGIMOS EL ERROR DE TAMAÑO (Limit: 10mb)
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 3. DEFINICIÓN DE RUTAS (Ahora el body ya estará parseado con la imagen)
app.use('/cloud', router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;