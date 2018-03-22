const boom = require('boom');
const wreck = require('wreck');

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
      try {
        commandResult = await this.subCommands[matchedSubCommand](payload, matchedData);
      } catch (error) {
        return error;
      }
      this.server.log(['hapi-slack-command', 'command'], {
        command: matchedSubCommand,
        text: command
      });
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
    const result = this.runCommand(requestedSubcommand, payload);
    if (result instanceof Error) {
      console.log('+');
      console.log('+');
      console.log('+');
      return result.toString();
    }
    return result;
  }

  // callbacks:
  registerCallback(callbackId, handler) {
    this.callbacks[callbackId] = handler.bind(this);
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
    if (result instanceof Error) {
      console.log('---');
    }
    this.server.log(['hapi-slack-command', 'callback'], {
      callback: payload.callback_id,
      action: actionName,
      actionValue: actionValue,
    });
    return result;
  }

  sendMessage(returnUrl, payload) {
    return wreck.post(returnUrl, { payload });
  }
}

module.exports = SlackCommand;
