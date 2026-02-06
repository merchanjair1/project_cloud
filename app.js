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

// CONFIGURACIÓN DE CORS
var cors = require('cors');
app.use(cors());

// MIDDLEWARE DE DEBUG - Ver si las peticiones llegan (ANTES de body parser)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. CONFIGURACIÓN DE MIDDLEWARES (Debe ir ANTES de las rutas)
// 2. CONFIGURACIÓN DE MIDDLEWARES (Debe ir ANTES de las rutas)
// AQUÍ CORREGIMOS EL ERROR DE TAMAÑO (Limit: 50mb para soportar doble imagen)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// MIDDLEWARE DE DEBUG - Ver si las peticiones llegan
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // console.log('Headers:', req.headers); // Descomentar si es necesario, muy ruidoso
  next();
});

// 3. DEFINICIÓN DE RUTAS (Ahora el body ya estará parseado con la imagen)
app.use('/cloud', router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Forzar respuesta JSON para rutas de API si hay error
  if (req.url.startsWith('/cloud') || req.headers['content-type'] === 'application/json') {
    res.status(err.status || 500);
    return res.json({
      success: false,
      error: err.message || 'Error interno del servidor',
      details: req.app.get('env') === 'development' ? err : null
    });
  }

  // render the error page for normal views
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;