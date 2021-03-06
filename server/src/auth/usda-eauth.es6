'use strict';

/**
 * Module for USDA eAuth integration
 * @module auth/usda-eauth
 */

const express = require('express');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const vcapConstants = require('../vcap-constants.es6');
const util = require('../services/util.es6');
const logger = require('../services/logger.es6');
const eAuth = {};

eAuth.loginPath = '/auth/usda-eauth/saml/login';
eAuth.callbackPath = '/auth/usda-eauth/saml/callback';

// Instantiate the passport SamlStrategy
passport.use(
  new SamlStrategy(
    {
      path: vcapConstants.BASE_URL + eAuth.callbackPath,
      entryPoint: `${vcapConstants.EAUTH_ENTRY_POINT}?SPID=${vcapConstants.EAUTH_ISSUER}`,
      issuer: vcapConstants.EAUTH_ISSUER,
      privateCert: vcapConstants.EAUTH_PRIVATE_KEY,
      cert: vcapConstants.EAUTH_CERT
    },
    (profile, done) => {
      return done(null, eAuth.setUserObject(profile));
    }
  )
);

// router for eAuth specific endpoints
eAuth.router = express.Router();

/**
 * @function setUserObject - set user profile in the eAuth authentication response
 * @param {Object} profile
 */
eAuth.setUserObject = profile => {
  // profile.usdaemail does not return for every users, so we create an ID from first and last names
  let adminUsername = '';
  let role = 'user';
  let email = '';
  if (profile.usdafirstname && profile.usdalastname) {
    adminUsername = `${profile.usdafirstname}_${profile.usdalastname}`.toUpperCase().replace(/\s/g, '_');
  }
  role = util.getUserRole(adminUsername);
  email = profile.usdaemail && profile.usdaemail !== 'EEMSCERT@ftc.usda.gov' ? profile.usdaemail : '';
  const adminUserObject = {
    adminUsername: role === 'admin' ? adminUsername : '',
    email: email,
    role: role,
    forests: util.getAdminForests(adminUsername)
  };
  logger.info(`AUTHENTICATION: ${adminUserObject.role.toUpperCase()}: ${adminUsername} has logged in via USDA eAuth.`);
  return adminUserObject;
};

//Initiate authentication via eAuth.
eAuth.router.get(eAuth.loginPath, (req, res) => {
  logger.info('AUTHENTICATION: Init eAuth Admin authentication request.');
  return res.redirect(`${vcapConstants.EAUTH_ENTRY_POINT}?SPID=${vcapConstants.EAUTH_ISSUER}`);
});

//Callback from eAuth.
eAuth.router.post(eAuth.callbackPath, passport.authenticate('saml'), (req, res) => {
  // Include a P3P policy for IE11
  // https://github.com/18F/fs-open-forest-platform/issues/405
  res.set('P3P', 'CP="NOI ADM DEV PSAi OUR OTRo STP IND COM NAV DEM"');

  return res.redirect(`${vcapConstants.INTAKE_CLIENT_BASE_URL}/logged-in`);
});

module.exports = eAuth;
