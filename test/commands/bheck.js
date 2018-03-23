// "check" will match everything first, so this will never get used:
module.exports = {
  expression: 'check (.*)',
  handler: slackPayload => 'bello',
  priority: 1
};
