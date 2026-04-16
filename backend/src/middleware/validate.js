const { AppError } = require('../utils/errorHandler');

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi schema object with optional body, params, query keys
 */
const validate = (schema) => {
  return (req, _res, next) => {
    const validationErrors = [];

    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        validationErrors.push(...error.details.map((d) => d.message));
      } else {
        req.body = value;
      }
    }

    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map((d) => d.message));
      } else {
        req.params = value;
      }
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        validationErrors.push(...error.details.map((d) => d.message));
      } else {
        req.query = value;
      }
    }

    if (validationErrors.length > 0) {
      return next(new AppError(`Validation failed: ${validationErrors.join(', ')}`, 400));
    }

    next();
  };
};

module.exports = validate;
