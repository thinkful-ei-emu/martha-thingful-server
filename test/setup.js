process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';

require('dotenv').config();

process.env.TEST_DB_URL = process.env.TEST_DB_URL
  || "postgresql://dunder_mifflin@localhost/thingful-test";

const { expect } = require('chai');
const supertest = require('supertest');

global.expect = expect;
global.supertest = supertest;
