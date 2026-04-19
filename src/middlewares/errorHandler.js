const { logError } = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Istenen kaynak bulunamadi.',
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const responseMessage = error.publicMessage || error.message || 'Beklenmeyen bir hata olustu.';

  logError(`${req.method} ${req.originalUrl}`, error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
