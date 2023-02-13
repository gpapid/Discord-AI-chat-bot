

const { Client, Events, GatewayIntentBits, ActivityType} = require("discord.js");
const { OpenAIApi, Configuration } = require("openai");
const fs = require("fs");
require("dotenv/config");

const config = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(config);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once(Events.ClientReady, (clientUser) => {
  console.log(`Logged in as ${clientUser.user.tag}`);
});

// Slash commands (write commands in 'register-commands.js' and run to register them)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  // ping command
  if (interaction.commandName === 'ping') {
    console.log(`ping command. triggered by @${interaction.member.displayName}`);
    try {
      await interaction.reply('pong'); // reply to command
    } catch (error) {  
      console.log(`error: ${error}`);
    };
  };
  // mention mode command
  if (interaction.commandName === 'mention-mode') {
    const input = interaction.options.get(`on-off`)?.value;
    if (input == null) {mentionMode = !mentionMode} else {mentionMode = input};
    if (mentionMode) {
      await interaction.reply({
        content: "Mention mode: ON",
        ephemeral: true
      })
    } else {
      await interaction.reply({
        content: "Mention mode: OFF",
        ephemeral: true
      });
    };
    console.log(`mention mode: ${mentionMode} called by ${interaction.user.displayName}`);
  };
  // generate image command (dall-e)
  if (interaction.commandName === 'generate-image') {
    let image_prompt = interaction.options.get(`prompt`).value;
    console.log(`image prompt by @${interaction.user.username}: ${image_prompt}`);
    try {
      await interaction.deferReply();// reply with 'thinking...' message
      let image_url = await generateImage(image_prompt); // get url to generated image
      console.log(image_url);
      await interaction.editReply(image_prompt); // edit reply with image prompt
      await interaction.channel.send(image_url); // send image url
    } catch (error) {
      console.log(`error: ${error}`);
      await interaction.editReply(`"${image_prompt}". Sorry, I couldn't do that`);
    }
  }
  // modify avatar command
  if (interaction.commandName === 'modify-avatar') {
    await interaction.deferReply();
    let image_prompt = interaction.options.get(`prompt`)?.value;
    let avatar_url = `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`;
    console.log(`avatar variation by @${interaction.user.username}, \navatar url: ${avatar_url}`);
    await downloadImage(avatar_url, "./avatar.png"); // download the avatar of the user
    try {
      if (image_prompt == null) {
        let image_url = await generateImageVariation("avatar.png") // generate image variation
        console.log(`avatar url: ${image_url}\n`);
        await interaction.editReply(`${interaction.user.username}`);
        await interaction.channel.send(image_url);
      } else {
        console.log(`image prompt by @${interaction.user.username}: ${image_prompt}\n`);
        let image_url = await editImage("avatar.png", image_prompt); // edit image with prompt
        console.log(`avatar url: ${image_url}\n`);
        await interaction.editReply(`${interaction.user.username} (${image_prompt})`);
        await interaction.channel.send(image_url);
      };
    } catch (error) {
      console.log(`error: ${error}`);
      await interaction.editReply(`Sorry, I can't do that`);
    };
  };
});

//----------------------- Log in -----------------------// 
client.login(process.env.BOT_TOKEN);

// initial settings
const MESSAGE_MEMORY = 5; // How many messages can be read for conversation context
let BOT_CHANNEL = process.env['DEFAULT_GUILD_ID']; // Default channel (doesn't need to be set / will be set automaticaly )
let mentionMode = false; // respond to messages with mention (can be changed with '/mention-mode' command)
let sleeping = false; // tag (@botname) to wake / tag (@botname) + 'sleep' to sleep


// On Message
client.on(Events.MessageCreate, async (message) => {

  // Return if message unwanted
  if (message.author.bot) return; // Don't respond to messages sent from the bot it self

  if (sleeping || message.channel.id !== BOT_CHANNEL) {
    if (message.mentions.users.has(client.user.id)) {
      console.log("Mention by", message.member.displayName, " on ", message.guild.name, `\nwaking up\n`)
      client.user.setPresence({ activities: [{name:`Hello!`}]})
      await message.reply("Hello!");
      sleeping = false;
      mentionMode = false;
      BOT_CHANNEL = message.channel.id;
    };
    return;
  }
  if (message.mentions.users.has(client.user.id) && message.content.includes(`sleep`)) {
    console.log("Mention by", message.member.displayName, " on ", message.guild.name, `\nback to sleep\n`);
    client.user.setPresence({ activities: [{name:`@ me to talk`}]});
    message.reply("going into sleep mode");
    sleeping = true;
    return;
  }

  if (message.channel.id !== BOT_CHANNEL) return; // only responds to the channel it has been awaken in

  if (mentionMode && !message.mentions.users.has(client.user.id)) return;

  // Response Generation
  message.channel.sendTyping() ;
    
  
  try {
  // message history
  let messages = Array.from(await message.channel.messages.fetch({
    limit: MESSAGE_MEMORY,
    before: message.id
  }))
  messages = messages.map(m => m[1]);
  messages.unshift(message);
  let users = [...new Set([...messages.map(m => m.member.displayName), client.user.username])];
  bot_name = users.pop();
  others = users.join(", ");
  // Prompt for OpenAI (add conversational context)
  let default_prompt = `The following is a conversation on discord between ${others} and ${bot_name} `;
  let prompt = default_prompt;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    prompt += `${m.member.displayName}: ${m.content}\n`;
  }
  prompt += `${client.user.username}:`;
  console.log(`prompt: ${prompt}`);
  await message.channel.send(await generateResponse(prompt));
  prompt = default_prompt; // reset prompt (shortens memory to MESSAGE_MEMORY for every response)
  } catch (error) {
    console.log(`error: ${error}`);
    await message.channel.send("Sorry, I can't answer right now");
    return;
  };
});

// ------------- OpenAI functions -------------

// Completion
async function generateResponse(prompt) {
  console.log("---starting generation---------------------------------------");
  console.log("Prompt: ", prompt);

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    temperature: 0.85,
    max_tokens: 500,
    top_p: 1,
    frequency_penalty: 1.6,
    presence_penalty: 0.6,
    stop: ["\n"]
  });

  console.log("\nResponse: ", response.data.choices[0].text);
  console.log("---ending generation-----------------------------------------");
  return response.data.choices[0].text;
}

// Edit text
async function iterate(i) {
  console.log("iteration: \ninput: ", i);

  const response = await openai.createEdit({
    model: "text-davinci-edit-001",
    input: i,
    instruction: "use different words",
    temperature: 0.90,
    top_p: 0.95,
  });

  console.log("response", response.data.choices[0].text);
  return response.data.choices[0].text;
}

// Generate image
async function generateImage(p) {
  const response = await openai.createImage({
    prompt: p,
    n: 1,
    size: "1024x1024",
  });
  console.log("img url", response.data.data[0].url);
  return response.data.data[0].url;
};

// Generate image variation
async function generateImageVariation(avatar) {
  const response = await openai.createImageVariation(
    fs.createReadStream(avatar),
    1,
    "1024x1024"
  );
  image_url = response.data.data[0].url;
  return response.data.data[0].url;
}

// Edit image
async function editImage(avatar, prompt) {
  const response = await openai.createImageEdit(
    fs.createReadStream(avatar),
    fs.createReadStream("mask.png"),
    prompt,
    1,
    "1024x1024"
  );
  return response.data.data[0].url;
}


// download image from url
async function downloadImage(url, path) {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFile(path, buffer, (error) => error && console.error(error));
}