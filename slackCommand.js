const boom = require('boom');


class SlackCommand {
  constructor(token, options, server) {
    this.server = server;
    this.options = options;
    this.token = token;
    this.subCommands = {
      help: this.printHelp.bind(this)
    };
    this.commandDescriptions = {
      help: 'print this help menu'
    };
    this.callbacks = {};
  }

  register(subCommand, subCommandHandler, subCommandDescription) {
    this.subCommands[subCommand] = subCommandHandler.bind(this);
    this.commandDescriptions[subCommand] = subCommandDescription || '';
  }

  // call this inside try/catch as it does not handle errors:
  async runCommand(command, payload) {
    const subCommands = Object.keys(this.subCommands);
    let matchedSubCommand = false;
    let matchedData = false;
    // look through all subCommands for a match:
    for (let i = 0; i < subCommands.length; i++) {
      const curSubCommand = subCommands[i];
      // don't try to match '*', it's the fallback:
      if (curSubCommand === '*') {
        continue;
      }
      matchedData = command.match(new RegExp(curSubCommand, ['i']));
      if (matchedData !== null) {
        matchedSubCommand = curSubCommand;
        break;
      }
    }
    // if no subCommand matches, use the backup method if available:
    if (!matchedSubCommand) {
      if (this.subCommands['*']) {
        matchedSubCommand = '*';
        matchedData = '';
      }
    }
    let commandResult = '';
    // now actually execute the subcommand and return the result:
    if (matchedSubCommand) {
      commandResult = await this.subCommands[matchedSubCommand](payload, matchedData);
      this.server.log(['hapi-slack-command'], `Executing sub-command ${matchedSubCommand}`);
      return commandResult;
    }
    return this.printHelp();
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
    const requestedSubcommand = request.payload.text;
    const payload = request.payload;
    try {
      return this.runCommand(requestedSubcommand, payload);
    } catch (error) {
      return error.toString();
    }
  }

  // callbacks:
  registerCallback(callbackId, handler) {
    this.callbacks[callbackId] = handler;
  }

  async callbackHandler(request, h) {
    const payloadStr = request.payload.payload;
    const payload = JSON.parse(payloadStr);
    // make sure the token matches:
    if (payload.token !== this.token) {
      throw boom.unauthorized();
    }
    const handler = this.callbacks[payload.callback_id];
    if (!handler) {
      return boom.notFound();
    }
    const action = payload.actions[0] || {};
    const actionName = action.name;
    const actionValue = action.selected_options[0].value;

    const result = await handler(payload, actionName, actionValue);
    return result;
  }
}

module.exports = SlackCommand;
