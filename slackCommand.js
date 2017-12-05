const boom = require('boom');


class SlackCommand {
  constructor(token, options) {
    this.options = options;
    this.token = token;
    this.commands = {};
    this.commandDescriptions = {};
  }

  register(command, commandHandlers, commandDescription) {
    this.commands[command] = commandHandlers;
    if (commandDescription) {
      this.commandDescriptions[command] = commandDescription;
    }
  }

  printHelp() {
    return Object.keys(this.commandDescriptions).reduce((string, command) => {
      string += `${command}: ${this.commandDescriptions[command]}\n`;
      return string;
    }, '');
  }

  async handler(request, h) {
    // make sure the token matches:
    if (request.payload.token !== this.token) {
      throw boom.unauthorized(request);
    }
    // make sure that command exists:
    const commandHandler = this.commands[request.payload.command];
    if (commandHandler === undefined) {
      return this.printHelp();
    }
    // if there's only one command-handling method then run it and return the results:
    if (typeof commandHandler === 'function') {
      return await commandHandler(request.payload);
    }
    // if that doesn't exist, try to find a command-handler that matches the text:
    const requestedSubcommand = request.payload.text;
    const subCommands = Object.keys(commandHandler);
    for (let i = 0; i < subCommands.length; i++) {
      const commandToMatch = subCommands[i];
      // don't try to match '*', it's the fallback:
      if (commandToMatch === '*') {
        continue;
      }
      const isMatched = requestedSubcommand.match(new RegExp(commandToMatch, ['i']));
      if (isMatched !== null) {
        return await commandHandler[commandToMatch](request.payload);
      }
    }
    // if nothing was found to match, try '*', the fallback method:
    if (commandHandler['*']) {
      return await commandHandler['*'](request.payload);
    }
    // if nothing was still found return the command descriptions
    return this.printHelp();
  }
}

module.exports = SlackCommand;
