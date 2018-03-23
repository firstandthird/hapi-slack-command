const SlackCommand = require('./slackCommand');
const fs = require('fs');
const path = require('path');

const defaults = {
  routeToListen: '/api/command',
  callbackRoute: '/api/callbacks'
};

const register = function(server, options) {
  const config = Object.assign({}, defaults, options || {});
  const slackCommand = new SlackCommand(config.token, config, server);
  server.decorate('server', 'slackCommand', slackCommand);
  server.route({
    method: 'POST',
    path: config.routeToListen,
    handler: slackCommand.handler.bind(slackCommand)
  });
  server.route({
    method: 'POST',
    path: config.callbackRoute,
    handler: slackCommand.callbackHandler.bind(slackCommand)
  });
  // load any commands if a command directory was specified:
  const commandDir = config.commandDir;
  const commands = [];
  if (commandDir) {
    if (fs.existsSync(commandDir)) {
      fs.readdirSync(commandDir).forEach(file => {
        commands.push(require(path.join(commandDir, file)));
      });
    }
  }
  // sort commands by priority then register them:
  commands
    .sort((a, b) => a.priority > b.priority)
    .forEach(command => server.slackCommand.register(command.expression, command.handler, command.description));

  // load any callbacks if a callback directory was specified:
  const callbackDir = config.callbackDir;
  if (callbackDir) {
    if (fs.existsSync(callbackDir)) {
      fs.readdirSync(callbackDir).forEach(file => {
        const callback = require(path.join(callbackDir, file));
        server.slackCommand.registerCallback(callback.name, callback.handler);
      });
    }
  }
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
