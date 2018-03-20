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
  server.decorate('server', 'slackCommand', {
    registerSlackCommand: slackCommand.register.bind(slackCommand),
    registerSlackCallback: slackCommand.registerCallback.bind(slackCommand)
  });
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
        server.slackCommand.registerSlackCommand(command.expression, command.handler, command.description);
      });
    }
  }
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
