// backend/src/middlewares/error.middleware.js
exports.errorMiddleware = (err, req, res, next) => {
  console.error('❌ Erreur:', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};