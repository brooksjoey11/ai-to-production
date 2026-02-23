// Custom Error Classes

class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends CustomError {
    constructor(message = 'Resource not found') {
        super(message);
    }
}

class ValidationError extends CustomError {
    constructor(message = 'Validation failed') {
        super(message);
    }
}

class AuthenticationError extends CustomError {
    constructor(message = 'Authentication required') {
        super(message);
    }
}

// Error Handling Utility
function handleErrors(err) {
    if (err instanceof CustomError) {
        console.error(`[${err.name}]: ${err.message}`);
    } else {
        console.error(`[Unknown Error]: ${err.message}`);
    }
}

export { CustomError, NotFoundError, ValidationError, AuthenticationError, handleErrors };