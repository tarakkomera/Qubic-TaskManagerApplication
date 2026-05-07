export default function hrMiddleware(req, res, next) {
    if (req.user && (req.user.role === 'hr' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. HR or Admin role required.' });
    }
}
