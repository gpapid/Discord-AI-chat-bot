const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

require('dotenv').config();
//Slash commands
const commands = [
  //ping command
  {
    name: 'ping',
    description: 'Responds with pong',
  },
  //mention mode command
  {
    name: 'mention-mode',
    description: 'When this is on, Json only replies to messages with his name in them',
    ephemeral: true,
    options: [
      {
        name: 'on-off',
        description: 'On when set to True. Off when set to False',
        type: ApplicationCommandOptionType.Boolean,
        choices: [
          {
            name: 'ON',
            value: true,
          },
          {
            name: 'OFF',
            value: false,
          }
        ]
        
      }
    ],
  },
  //dall-e image generation command
  {
    name: 'generate-image',
    description: 'Provide a prompt to generate a picture',
    options: [
      {
        name: 'prompt',
        description: 'Write your prompt here',
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
  //dall-e image edit/variation
  {
    name: 'modify-avatar',
    description: 'Change up your avatar picture',
    options: [
      {
        name: 'prompt',
        description: 'Write a prompt of how you want your avater to be edited',
        type: ApplicationCommandOptionType.String,
        require: false,
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();