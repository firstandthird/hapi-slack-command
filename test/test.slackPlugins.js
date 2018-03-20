'use strict';
const tap = require('tap');
const plugin = require('../index.js')
const Hapi = require('hapi');
const async = require('async');
const path = require('path');
tap.test('plugin registers and processes commands', (t) => {
  async.autoInject({
    server: async() => {
      const server = new Hapi.Server({ port: 8080 });
      await server.register({
        plugin,
        options: {
          routeToListen: '/',
          token: 'a token',
        }
      });
      await server.start();
      return server;
    },
    command: async(server) => {
      server.slackCommand.register('groups', (slackPayload, match) => 'hello');
      server.slackCommand.register('group (.*)', (slackPayload, match) => 'goodbye');
    },
    query1: async(command, server) => {
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
    query2: async(command, server) => {
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
  }, async (err, result) => {
    await result.server.stop();
    t.end();
  });
});

tap.test('plugin can load commands from a specified directory', async(t) => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      commandDir: path.join(__dirname, 'commands'),
      routeToListen: '/',
      token: 'a token',
    }
  });
  await server.start();
  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'check'
    }
  });
  t.equal(response.statusCode, 200, '200 when token accepted ');
  t.match(response.result, 'hello', 'gets info back');
  await server.stop();
  t.end();
});

tap.test('plugin can load callbacks from a specified directory', async(t) => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      callbackDir: path.join(__dirname, 'callbacks'),
      callbackRoute: '/callbacks',
      token: 'a token',
    }
  });
  await server.start();
  const callback = require('./sampleCallback.js');
  const response = await server.inject({
    method: 'POST',
    url: '/callbacks',
    payload: callback
  });
  t.equal(response.statusCode, 200, '200 when token accepted ');
  t.equal(response.result, 'hello from the callback', 'gets info back');
  await server.stop();
  t.end();
});
