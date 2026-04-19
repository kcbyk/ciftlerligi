function requireAdminAuth(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({
      success: false,
      message: 'Admin oturumu bulunamadi.',
    });
  }

  return next();
}

module.exports = requireAdminAuth;
