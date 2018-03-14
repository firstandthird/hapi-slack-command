/* eslint-disable */
// used for testing interactive messages (https://api.slack.com/interactive-messages):
module.exports = {
  "type": "interactive_message",
  "actions": [
    {
      "name": "channel_list",
      "type": "select",
      "selected_options":[
        {
          "value": "C24BTKDQW"
        }
      ]
    }
  ],
  "callback_id": "callback_1",
  "team": {
    "id": "T1ABCD2E12",
    "domain": "hooli-hq"
  },
  "channel": {
    "id": "C9C2VHR7D",
    "name": "triage-random"
  },
  "user": {
    "id": "U900MV5U7",
    "name": "gbelson"
  },
  "action_ts": "1520966872.245369",
  "message_ts": "1520965348.000538",
  "attachment_id": "1",
  "token": "a token",
  "is_app_unfurl": false,
  "original_message": {
    "text": "",
    "username": "Belson Bot",
    "bot_id": "B9DKHFZ1E",
    "attachments":[
      {
        "callback_id": "callback_1",
        "text": "Choose a channel",
        "id": 1,
        "color": "2b72cb",
        "actions": [
          {
            "id": "1",
            "name": "channel_list",
            "text": "Public channels",
            "type": "select",
            "data_source": "channels"
          }
        ],
        "fallback":"Choose a channel"
      }
    ],
    "type": "message",
    "subtype": "bot_message",
    "ts": "1520965348.000538"
  },
  "response_url": "https://hooks.slack.com/actions/T1ABCD2E12/330361579271/0dAEyLY19ofpLwxqozy3firz",
  "trigger_id": "328654886736.72393107734.9a0f78bccc3c64093f4b12fe82ccd51e"
};
