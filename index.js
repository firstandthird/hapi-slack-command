const SlackCommand = require('slack-command').SlackCommand;

const register = async function(server, options) {
  const slackCommand = new SlackCommand(options.token, options, server);
  server.decorate('server', 'registerSlackCommand', slackCommand.register.bind(slackCommand));
  await slackCommand.listen();
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
