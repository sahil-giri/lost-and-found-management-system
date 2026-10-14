// 404 for unknown API routes
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: anything passed to next(err) or thrown in async code lands here.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Image must be 2 MB or smaller.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err); // full detail only in the server log, never sent to the client
  res.status(500).json({ message: 'Something went wrong on the server.' });
}

module.exports = { notFound, errorHandler };
