'use strict';
const tap = require('tap');
const plugin = require('../index.js');
const Hapi = require('hapi');

let server;
tap.beforeEach(async() => {
  server = new Hapi.Server({
    debug: {
      log: '*'
    },
    port: 8080
  });
  await server.register({
    plugin,
    options: {
      routeToListen: '/',
      callbackRoute: '/callback',
      token: 'a token'
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
  server.slackCommand.register('ls', (slackPayload) => 'hello', 'prints a list of your stuff');
  server.slackCommand.register('rm', (slackPayload) => 'hello');

  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'blah'
    }
  });
  t.notEqual(response.payload.indexOf('help: print this help menu'), -1, '"help" is a command that prints this help menu ');
  t.notEqual(response.payload.indexOf('ls: prints a list of your stuff'), -1, 'gets help text back ');
  t.notEqual(response.payload.indexOf('rm:'), -1, 'prints commands even if they do not have a description ');
  await server.stop();
  t.end();
});

tap.test('accepts and processes command registered as a function', async(t) => {
  server.slackCommand.register('ls', (slackPayload) => {
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

tap.test('commands are bound to SlackCommand object', async(t) => {
  const SlackCommand = require('../slackCommand');
  server.slackCommand.register('ls', function(slackPayload) {
    t.isA(this, SlackCommand);
    return 'hi';
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
  t.equal(response.result, 'hi', 'gets info back');
  await server.stop();
  t.end();
});

tap.test('accepts and processes async handlers that return a promise', async(t) => {
  server.slackCommand.register('ls', async(slackPayload) => new Promise(async(resolve, reject) => resolve('hello')));
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
  server.slackCommand.register('groups', (slackPayload, match) => 'hello');
  server.slackCommand.register('group (.*)', (slackPayload, match) => 'goodbye');
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
  server.slackCommand.register('*', (slackPayload) => 'hello');
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

tap.test('handler has access to both payload and matched text', async(t) => {
  server.slackCommand.register('group (.*)', (slackPayload, match) => match);
  const response = await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'group hello'
    }
  });
  t.equal(response.statusCode, 200, '200 when token accepted ');
  t.equal(response.result[0], 'group hello', 'passed matched text to handler');
  await server.stop();
  t.end();
});

tap.test('can process a command manually with runCommand', async(t) => {
  server.slackCommand.register('group (.*)', (slackPayload, match) => ({ slackPayload, match }));
  server.slackCommand.register('bad', (slackPayload) => {
    throw new Error('this is an error');
  });
  const command = await server.slackCommand.runCommand('group hello');
  const commandWithPayload = await server.slackCommand.runCommand('group hello', { something: 'value1' });
  t.equal(command.match[1], 'hello', 'passes matched text to handler');
  t.equal(commandWithPayload.match[1], 'hello', 'passes matched text to handler');
  t.equal(commandWithPayload.slackPayload.something, 'value1', 'passes matched text to handler');
  try {
    await server.slackCommand.runCommand('bad');
  } catch (e) {
    t.isA(e, Error);
  }
  await server.stop();
  t.end();
});

tap.test('logs when a subcommand is being processed', async(t) => {
  server.slackCommand.register('ls', (slackPayload) => {
    return 'hello';
  });
  server.slackCommand.register('*', (slackPayload) => {
    return 'hello';
  });
  let called = false;
  server.events.on('log', async(msg, tags) => {
    if (!called) {
      called = true;
      t.match(msg.data, {
        command: 'ls',
        text: 'ls'
      });
    }
  });
  await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'ls'
    }
  });
  server.events.on('log', async(msg, tags) => {
    t.match(msg.data, {
      command: '*',
      text: 'not specified'
    });
  });
  await server.inject({
    method: 'POST',
    url: '/',
    payload: {
      token: 'a token',
      command: '/test',
      text: 'not specified'
    }
  });
  await server.stop();
  t.end();
});

tap.test('logs when a subcommand throws an error', async(t) => {
  server.slackCommand.register('ls', (slackPayload) => {
    throw new Error('this is an error');
  });
  server.events.on('log', async(msg, tags) => {
    t.equal(msg.data.message, 'the sub-command ls had an error');
    t.equal(msg.data.error.toString(), 'Error: this is an error');
  });
  try {
    await server.inject({
      method: 'POST',
      url: '/',
      payload: {
        token: 'a token',
        command: '/test',
        text: 'ls'
      }
    });
  } catch (e) {
    await server.stop();
    t.end();
  }
});

tap.test('accepts and processes command callbacks', async(t) => {
  server.slackCommand.register('menu', (slackPayload) => 'hello');
  server.slackCommand.registerCallback('callback_1', (slackPayload) => 'hello from the callback');
  let called = false;
  server.events.on('log', async(msg, tags) => {
    if (!called) {
      called = true;
      t.match(msg.data, {
        callback: 'callback_1',
        action: 'channel_list',
        actionValue: 'C24BTKDQW'
      });
    }
  });

  const callback = require('./sampleCallback.js');
  const response = await server.inject({
    method: 'POST',
    url: '/callback',
    payload: callback
  });
  t.equal(response.statusCode, 200, '200 when token accepted ');
  t.equal(response.result, 'hello from the callback', 'gets info back');
  t.equal(called, true, 'logged callback');
  await server.stop();
  t.end();
});

tap.test('sendMessage will post a payload to a return URL', async(t) => {
  server.route({
    method: 'post',
    path: '/sendMessage',
    handler(request, h) {
      return request.payload.value1;
    }
  })
  const result = await server.slackCommand.sendMessage('http://localhost:8080/sendMessage', {
    value1: 'a value'
  });
  t.equal(result.res.statusCode, 200, 'can post to the return URL');
  t.equal(result.payload.toString(), 'a value', 'can get info back from return URL');
  await server.stop();
  t.end();
});
