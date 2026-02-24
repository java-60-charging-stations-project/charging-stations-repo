"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    const status = 500;
    res.status(status).json({
        code: status,
        error: {
            message
        }
    });
}
