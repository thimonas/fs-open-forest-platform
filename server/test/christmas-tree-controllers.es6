'use strict';

const jwt = require('jsonwebtoken');
const vcapConstants = require('../src/vcap-constants.es6');

const request = require('supertest');

const christmasTreePermitApplicationFactory = require('./data/christmas-trees-permit-application-factory.es6');
const server = require('./mock-aws-app.es6');

const chai = require('chai');
const expect = chai.expect;
let permitId;
let invalidPermitId = 'xxxxx';
let paygovToken;

describe('christmas tree controller tests', () => {
  describe('get forests', () => {
    it('should return a 200 response', done => {
      request(server)
        .get('/forests')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('should return more than 0 forests', done => {
      request(server)
        .get('/forests')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body.length).to.not.equal(0);
        })
        .expect(200, done);
    });
    it('should include name and ID for a forest', done => {
      request(server)
        .get('/forests')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body[0]).to.include.all.keys('id', 'forestName', 'description', 'forestAbbr');
        })
        .expect(200, done);
    });
  });
  describe('get forest guidelines info', () => {
    it('should return a 200 response', done => {
      request(server)
        .get('/forests/arp')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done);
    });

    it('should include fields for species and locations', done => {
      request(server)
        .get('/forests/arp')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body).to.include.all.keys('species', 'locations');
        })
        .expect(200, done);
    });

    it('should contain data in the species field', done => {
      request(server)
        .get('/forests/arp')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body.species.locations).to.not.equal(0);
        })
        .expect(200, done);
    });

    it('should include name, status and notes fields in the species', done => {
      request(server)
        .get('/forests/arp')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body.species[0]).to.include.all.keys('name', 'status', 'notes');
        })
        .expect(200, done);
    });

    it('should contain data in the field for notes about the species', done => {
      request(server)
        .get('/forests/arp')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body.species[0].notes.length).to.not.equal(0);
        })
        .expect(200, done);
    });

    it('should contain data in the field for locations', done => {
      request(server)
        .get('/forests/mthood')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          expect(res.body.locations.length).to.not.equal(0);
        })
        .expect(200, done);
    });

    it('should return a 404 response when providing forest ID that does not exist.', done => {
      request(server)
        .get('/forests/-1205')
        .set('Accept', 'application/json')
        .expect(404, done);
    });
  });
  describe('submit permit application flathead national forest', () => {
    it('POST should return a 200 response when submitted to get pay.gov token', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(res => {
          permitId = res.body.permitId;
        })
        .expect(200, done);
    });
    it('GET should return a 200 response when completing permit transaction with pay.gov', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}`)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('GET should return a 200 response when requesting for already completed permit', done => {
      const token = jwt.sign(
        {
          data: permitId
        },
        vcapConstants.permitSecret
      );
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}?t=${token}`)
        .set('Accept', 'application/json')
        .expect(200, done);
    });
    it('GET should return a 500 response when requesting an invalid permit', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${invalidPermitId}`)
        .set('Accept', 'application/json')
        .expect(500, done);
    });
    it('POST should return a 400 response when submitted with invalid data', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      permitApplication.forestId = undefined;
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });
    it('POST should return 400 response when submitted to get pay.gov token (mock returns error when firstName = "1" and lastName = "1")', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      permitApplication.firstName = '1';
      permitApplication.lastName = '1';
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });
    it('POST should return 500 response when submitted to get pay.gov token (mock returns error when firstName = "1" and lastName = "2")', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      permitApplication.firstName = '1';
      permitApplication.lastName = '2';
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect(500, done);
    });
    it('POST should return a 200 response when submitted to get pay.gov token', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(res => {
          permitId = res.body.permitId;
          paygovToken = res.body.token;
        })
        .expect(200, done);
    });
    it('POST should return a 200 response when submitted to mock pay.gov with invalid credit card', done => {
      const processTransaction = {
        token: paygovToken,
        cc: '0000000000000000'
      };
      request(server)
        .post('/mock-pay-gov-process')
        .send(processTransaction)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('GET should return a 400 response when completing permit that has transaction errors within pay.gov', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}`)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });
  });
  describe('submit permit application for mt.hood national forest', () => {
    it('POST should return a 200 response when submitted to get pay.gov token', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      permitApplication.forestId = 3;
      permitApplication.forestAbbr = 'mthood';
      permitApplication.orgStructureCode = '11-06-06';
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(res => {
          permitId = res.body.permitId;
        })
        .expect(200, done);
    });
    it('GET should return a 200 response when getting details of "initiated" permit', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}/details`)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('GET should return a 200 response when completing permit transaction with pay.gov', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}`)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('GET should return a 404 response when getting details of "completed" permit', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}/details`)
        .expect(404, done);
    });
    it('GET should return a 404 response when getting details of an invalid permit', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${invalidPermitId}/details`)
        .expect(404, done);
    });
  });
  describe('submit permit application for shoshone national forest', () => {
    it('POST should return a 200 response when submitted to get pay.gov token', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      permitApplication.forestId = 4;
      permitApplication.forestAbbr = 'shoshone';
      permitApplication.orgStructureCode = '11-02-14';
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(res => {
          permitId = res.body.permitId;
        })
        .expect(200, done);
    });
    it('GET should return a 200 response when completing permit transaction with pay.gov', done => {
      request(server)
        .get(`/forests/christmas-trees/permits/${permitId}`)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('POST should return a 404 response when submitted to cancel already completed permit application', done => {
      const cancelApplication = {
        permitId: permitId
      };
      request(server)
        .post('/forests/christmas-trees/permits/cancel')
        .send(cancelApplication)
        .expect(404, done);
    });
  });
  describe('cancelling permit application', () => {
    it('POST should return a 200 response when submitted to get pay.gov token', done => {
      const permitApplication = christmasTreePermitApplicationFactory.create();
      request(server)
        .post('/forests/christmas-trees/permits')
        .send(permitApplication)
        .expect('Content-Type', /json/)
        .expect(res => {
          permitId = res.body.permitId;
        })
        .expect(200, done);
    });
    it('POST should return a 200 response when submitted to cancel existing permit application', done => {
      const cancelApplication = {
        permitId: permitId
      };
      request(server)
        .post('/forests/christmas-trees/permits/cancel')
        .send(cancelApplication)
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('POST should return a 404 response when submitted to cancel an invalid permit application', done => {
      const cancelApplication = {
        permitId: invalidPermitId
      };
      request(server)
        .post('/forests/christmas-trees/permits/cancel')
        .send(cancelApplication)
        .expect(404, done);
    });
  });
});
