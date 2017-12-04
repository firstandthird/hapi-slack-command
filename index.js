const SlackCommand = require('./slackCommand');

const register = async function(server, options) {
  const slackCommand = new SlackCommand(options.token, options, server);
  server.decorate('server', 'registerSlackCommand', slackCommand.register.bind(slackCommand));
  server.route({
    method: 'POST',
    path: this.options.routeToListen,
    handler: slackCommand.handler
  });
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
