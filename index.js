const SlackCommand = require('./slackCommand');


const defaults = {
  routeToListen: '/'
};


const register = async function(server, options) {
  const config = Object.assign({}, defaults, options || {});
  const slackCommand = new SlackCommand(config.token, config);
  server.decorate('server', 'registerSlackCommand', slackCommand.register.bind(slackCommand));
  server.route({
    method: 'POST',
    path: config.routeToListen,
    handler: slackCommand.handler.bind(slackCommand)
  });
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
