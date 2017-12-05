'use strict';
const tap = require('tap');
const plugin = require('../index.js');
const Hapi = require('hapi');

let server;
tap.beforeEach(async() => {
  server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      token: 'a token',
    }
  });
  await server.start();
});

tap.afterEach(async() => {
  await server.stop();
});

tap.test('rejects if token does not match', async (t) => {
  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'is wrong'
    }
  });
  t.equal(response.statusCode, 401, '401 unauthorized status code when token rejected');
  await server.stop();
  t.end();
});

tap.test('prints help if there is no matching subcommand', async(t) => {
  server.registerSlackCommand('ls', (slackPayload) => {
    return 'hello';
  }, 'prints a list of your stuff');
  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'blah'
    }
  });
  t.equal(response.payload.startsWith('ls: prints a list of your stuff'), true, 'gets help text back ');
  await server.stop();
  t.end();
});

tap.test('accepts and processes command registered as a function', async(t) => {
  server.registerSlackCommand('ls', (slackPayload) => {
    return 'hello';
  });
  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'ls'
    }
  });
  t.equal(response.statusCode, 200, '200 when token accepted ');
  t.equal(response.result, 'hello', 'gets info back');
  await server.stop();
  t.end();
});

tap.test('accepts and matches text for sub-commands', async(t) => {
  server.registerSlackCommand('groups', (slackPayload, match) => 'hello');
  server.registerSlackCommand('group (.*)', (slackPayload, match) => 'goodbye');
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
  await server.stop();
  t.end();
});

tap.test('calls fallback if nothing matched the text', async(t) => {
  server.registerSlackCommand('*', (slackPayload) => 'hello');
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
  await server.stop();
  t.end();
});
