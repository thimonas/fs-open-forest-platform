'use strict';

/**
 * Module for chrismtmas tree admin API
 * @module controllers/chrismtmas-tree-admin
 */

const moment = require('moment-timezone');
const Sequelize = require('sequelize');
const zpad = require('zpad');
const logger = require('../services/logger.es6');

const treesDb = require('../models/trees-db.es6');
const util = require('../services/util.es6');

const christmasTreeAdmin = {};
const operator = Sequelize.Op;

/**
 * @function getPermitResult - Private function to get the updated permit object with formatted dates
 * and permit number padded with zeros
 * @param {Object} permit - input permit object
 * @return {Object} updated permit object
 */
const getPermitResult = permit => {
  let eachPermit = {};
  eachPermit.permitNumber = zpad(permit.permitNumber, 8); // Adds padding to each permit number for readiblity
  
  if (permit.christmasTreesForest && permit.christmasTreesForest.timezone) {
    eachPermit.issueDate = moment.tz(permit.updatedAt, permit.christmasTreesForest.timezone).format('MM/DD/YYYY');
console.log('........eachPermit.issueDate'+eachPermit.issueDate);
    eachPermit.expireDate = moment
      .tz(permit.permitExpireDate, permit.christmasTreesForest.timezone)
      .format('MM/DD/YYYY');
  } else {
    eachPermit.issueDate = moment(permit.updatedAt).format('MM/DD/YYYY');
    eachPermit.expireDate = moment(permit.permitExpireDate).format('MM/DD/YYYY');
  }
  eachPermit.quantity = permit.quantity;
  eachPermit.totalCost = permit.totalCost;
  return eachPermit;
};

/**
 * @function returnPermitsReport - Private function to return permits with number of trees and cost
 * @param {Object} results - permits results from database
 * @param {Object} res - http response
 */
const returnPermitsReport = (results, res) => {
  if (results) {
    let permits = [];
    let sumOfTrees = 0;
    let sumOfCost = 0;

    results.forEach(permit => {
      sumOfTrees += permit.quantity;
      sumOfCost += parseFloat(permit.totalCost);
      permits.push(getPermitResult(permit));
 
    });

    res.status(200).json({
      sumOfTrees: sumOfTrees,
      sumOfCost: sumOfCost.toFixed(2),
      numberOfPermits: results.length,
      permits: permits
    });
  } else {
    res.status(404).send();
  }
};

/**
 * @function getPermitSummaryReport - permit summary report for the selected forest and given data range
 * @param {Object} req - http request
 * @param {Object} res - http response
 */
christmasTreeAdmin.getPermitSummaryReport = (req, res) => {
  logger.info(`${req.user} generated a report`);
  treesDb.christmasTreesForests
    .findOne({
      where: {
        id: req.params.forestId
      }
    })
    .then(forest => {
      console.log('forest.timezone:::'+forest.timezone);
   const nextDay = moment.tz(req.params.endDate, forest.timezone).add(1, 'days');
   const startDate = moment.tz(req.params.startDate, forest.timezone).format(util.datetimeFormat);
   console.log('startDate:::'+moment.tz(req.params.startDate, forest.timezone).format(util.datetimeFormat));
      console.log('nextDay:::'+ moment.tz(req.params.endDate, forest.timezone).add(1, 'days').format(util.datetimeFormat));

      treesDb.christmasTreesPermits
        .findAll({
          attributes: [
            'forestId',
            'permitNumber',
            'updatedAt',
            'quantity',
            'totalCost',
            'permitExpireDate',
            'christmasTreesForest.timezone'
          ],
          include: [
            {
              model: treesDb.christmasTreesForests
            }
          ],
          where: {
            forestId: req.params.forestId,
            status: 'Completed',
            updatedAt: {
              [operator.gte]: startDate,
              [operator.lt]: nextDay
            }
          },
          order: [['updatedAt', 'ASC']]
        })
        .then(results => {
          return returnPermitsReport(results, res);
        })
        .catch(error => {
          util.handleErrorResponse(error, res);
        });
    });
};

/**
 * @function getPermitReport - permit report for the given permit number
 * @param {Object} req - http request
 * @param {Object} res - http response
 */

christmasTreeAdmin.getPermitReport = (req, res) => {
  treesDb.christmasTreesPermits
    .findOne({
      attributes: ['permitId', 'forestId', 'permitNumber', 'updatedAt', 'quantity', 'totalCost', 'permitExpireDate'],
      where: {
        permitNumber: req.params.permitNumber,
        status: 'Completed'
      }
    })
    .then(requestedPermit => {
      if (requestedPermit === null) {
        return res.status(400).json({
          errors: [
            {
              errorCode: 'notFound',
              message: `Permit number ${req.params.permitNumber} was not found.`
            }
          ]
        });
      } else {
        return returnPermitsReport([requestedPermit], res);
      }
    })
    .catch(error => {
      return util.handleErrorResponse(error, res);
    });
};

/**
 * @function updateForest - Private function to update the forest in database
 * @param {Object} forest - forest database object
 * @param {string} startDate - new start date
 * @param {string} endDate - new end date
 * @param {string} cuttingAreas - new cutting areas
 * @param {Object} res - http response
 * @return {Object} http response
 */
const updateForest = (forest, startDate, endDate, cuttingAreas, res) => {
  forest
    .update({
      startDate: startDate,
      endDate: endDate,
      cuttingAreas: cuttingAreas
    })
    .then(savedForest => {
      return res.status(200).json(savedForest);
    });
};

/**
 * @function updateForestDetails - Updage forest
 * @param {Object} req - http request
 * @param {Object} res - http response
 */
christmasTreeAdmin.updateForestDetails = (req, res) => {
  treesDb.christmasTreesForests
    .findOne({
      where: {
        id: req.params.forestId
      }
    })
    .then(forest => {
      if (forest) {
        if (req.user.forests.includes(forest.forestAbbr) || req.user.forests.includes('all')) {
          let startDate = forest.startDate;
          let endDate = forest.endDate;
          let cuttingAreas = forest.cuttingAreas;

          if (req.body.cuttingAreas) {
            cuttingAreas = req.body.cuttingAreas;
          }
          if (req.body.startDate && req.body.endDate) {
            startDate = moment.tz(req.body.startDate, forest.timezone).format(util.datetimeFormat);
            endDate = moment
              .tz(req.body.endDate, forest.timezone)
              .add(1, 'days')
              .subtract(1, 'ms')
              .format(util.datetimeFormat);
          }
          return updateForest(forest, startDate, endDate, cuttingAreas, res);
        } else {
          const errorMessage = { errors: [{ message: 'Permission denied to Forest ' + req.params.forestId }] };
          logger.warn(errorMessage);
          return res.status(403).json(errorMessage);
        }
      } else {
        const errorMessage = { errors: [{ message: 'Forest ' + req.params.forestId + ' was not found.' }] };
        logger.warn(errorMessage);
        return res.status(400).json(errorMessage);
      }
    })
    .catch(error => {
      logger.error(error);
      res.status(500).json(error);
    });
};

module.exports = christmasTreeAdmin;
