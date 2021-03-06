'use strict';

/**
 * Module for Express middleware
 * @module services/middleware
 */

const vcapConstants = require('../vcap-constants.es6');
const util = require('./util.es6');

const middleware = {};

/**
 * @function setCorsHeaders - Set the http CORS headers.
 * @param {Object} req - http request
 * @param {Object} res - http response
 */
middleware.setCorsHeaders = (req, res, next) => {
  // Don't cache the API calls.
  res.set('Cache-Control', 'no-cache');
  if (process.env.PLATFORM === 'local' || process.env.PLATFORM === 'CI') {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Credentials', true);
  } else {
    res.set('Access-Control-Allow-Origin', vcapConstants.INTAKE_CLIENT_BASE_URL);
    res.set('Access-Control-Allow-Credentials', true);

    // Include a P3P policy for IE11
    // https://github.com/18F/fs-open-forest-platform/issues/405
    res.set('P3P', 'CP="NOI ADM DEV PSAi OUR OTRo STP IND COM NAV DEM"');
  }
  next();
};

/**
 * @function checkPermissions - Check for a valid user.
 * @param {Object} req - http request
 * @param {Object} res - http response
 */
middleware.checkPermissions = (req, res, next) => {
  if (!req.user) {
    res.status(401).send();
  } else {
    next();
  }
};

/**
 * @function checkAdminPermissions - Check for admin permsissions.
 * @param {Object} req - http request
 * @param {Object} res - http response
 */
middleware.checkAdminPermissions = (req, res, next) => {
  if (req.user && util.getUserRole(req.user.adminUsername) === util.ADMIN_ROLE) {
    next();
  } else {
    res.status(403).send();
  }
};

module.exports = middleware;
