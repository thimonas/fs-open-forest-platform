#!/bin/sh
# Used by Docker

sleep 10

npm run migrate
npm run seed
nodemon --harmony_default_parameters app.es6
