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
  if (commandDir) {
    if (fs.existsSync(commandDir)) {
      fs.readdirSync(commandDir).forEach(file => {
        const command = require(path.join(commandDir, file));
        server.slackCommand.register(command.expression, command.handler, command.description);
      });
    }
  }
  // load any commands if a command directory was specified:
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
