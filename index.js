const SlackCommand = require('./slackCommand');

const defaults = {
  routeToListen: '/api/command',
  callbackRoute: '/api/callbacks'
};

const register = function(server, options) {
  const config = Object.assign({}, defaults, options || {});
  const slackCommand = new SlackCommand(config.token, config, server);
  server.decorate('server', 'registerSlackCommand', slackCommand.register.bind(slackCommand));
  server.decorate('server', 'registerSlackCallback', slackCommand.registerCallback.bind(slackCommand));
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
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
