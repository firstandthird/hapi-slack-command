'use strict';
const tap = require('tap');
const plugin = require('../index.js')
const Hapi = require('hapi');
const async = require('async');

tap.test('plugin registers and processes commands', (t) => {
  async.autoInject({
    server: async() => {
      const server = new Hapi.Server({ port: 8080 });
      await server.register({
        plugin,
        options: {
          token: 'a token'
        }
      });
      await server.start();
    },
    command(server, done) {
      server.registerSlackCommand('/test', {
        groups(slackPayload, match, groupsDone) {
          groupsDone(null, 'hello');
        },
        'group (.*)'(slackPayload, match, groupDone) {
          //triggered if I do /pt group test.
          groupDone(null, 'goodbye');
        },
      });
    },
    query1: async(server) => {
      const response = await server.inject({
        method: 'POST',
        url: '/',
        payload: {
          token: 'a token',
          command: '/test',
          text: 'groups'
        }
      });
      t.equal(response.statusCode, 200, '200 when token accepted ');
      t.equal(response.result, 'hello', 'gets info back');
    },
    query2: async(server) => {
      const response2 = await server.inject({
        method: 'POST',
        url: '/',
        payload: {
          token: 'a token',
          command: '/test',
          text: 'group test'
        }
      });
      t.equal(response2.statusCode, 200, '200 when token accepted ');
      t.equal(response2.result, 'goodbye', 'gets info back');
    },
    cleanup: async(query1, query2, server) => {
      await server.stop();
    }
  }, (err, result) => {
    t.equal(err, null);
    t.end();
  });
});
