const boom = require('boom');


class SlackCommand {
  constructor(token, options) {
    this.options = options;
    this.token = token;
    this.subCommands = {};
    this.commandDescriptions = {};
  }

  register(subCommand, subCommandHandler, subCommandDescription) {
    this.subCommands[subCommand] = subCommandHandler;
    if (subCommandDescription) {
      this.commandDescriptions[subCommand] = subCommandDescription;
    }
  }

  printHelp() {
    return Object.keys(this.commandDescriptions).reduce((string, subCommand) => {
      string += `${subCommand}: ${this.commandDescriptions[subCommand]}\n`;
      return string;
    }, '');
  }

  async handler(request, h) {
    // make sure the token matches:
    if (request.payload.token !== this.token) {
      throw boom.unauthorized(request);
    }
    // try to find a subCommand-handler that matches the text:
    const requestedSubcommand = request.payload.text;
    const subCommands = Object.keys(this.subCommands);
    for (let i = 0; i < subCommands.length; i++) {
      const commandToMatch = subCommands[i];
      // don't try to match '*', it's the fallback:
      if (commandToMatch === '*') {
        continue;
      }
      const isMatched = requestedSubcommand.match(new RegExp(commandToMatch, ['i']));
      if (isMatched !== null) {
        return await this.subCommands[commandToMatch](request.payload);
      }
    }
    // if nothing was found to match, try '*', the fallback method:
    if (this.subCommands['*']) {
      return await this.subCommands['*'](request.payload);
    }
    // if nothing was still found return the subCommand descriptions
    return this.printHelp();
  }
}

module.exports = SlackCommand;
