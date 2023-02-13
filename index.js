const { Client, Events, GatewayIntentBits, ActivityType} = require("discord.js")
require("dotenv/config")
const fs = require("fs")
const { OpenAIApi, Configuration } = require("openai")

const config = new Configuration({
  apiKey: process.env.OPENAI_KEY
})
const openai = new OpenAIApi(config)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, (clientUser) => {
  console.log(`Logged in as ${clientUser.user.tag}`)
 /*
  const activities = [
    "*woof*",
    "*sniff*",
    "*bark*",
    "*wags tail*"
  ]
  setInterval(() => {
    const status = activities[Math.floor(Math.random() * activities.length)];
    client.user.setPresence({ activities: [{name:`${status}`}]})
  }, 3600*1000);
  */
});

//Registering slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  //treat command
  if (interaction.commandName === 'treat') {
    prompt = treat_prompt + `${client.user.username}:`
    try {
      await interaction.reply(await generateResponse(prompt))
    } catch (error) {
      console.log(`error: ${error}`)
      await interaction.reply(":face_with_spiral_eyes: !")
      sleeping = true
    }
    //revert to default mode
    prompt = default_prompt
  }

  //pet command
  if (interaction.commandName === 'pet') {
    prompt = pet_prompt + `${JS0N}: *licks* ${interaction.member.displayName}\n${JS0N}:`
    pets++;
    try {
      await interaction.deferReply()
      await interaction.editReply("I have been pet " + pets + " times\n" + await generateResponse(prompt))
    } catch (error) {
      console.log(`error: ${error}`)
      await interaction.editReply(":face_with_spiral_eyes: !")
      sleeping = true
    }
    //revert to default mode
    prompt = default_prompt
  }
  //woof mode command
  if (interaction.commandName === 'woof') {
    
    if (woof_mode) {
      woof_mode = false
      await interaction.reply("*woof* back to normal")
      client.user.setPresence({ activities: [{name:`*woof*`}]})
    } else {
      woof_mode = true
      await interaction.reply("*WOOF*")
      client.user.setPresence({ activities: [{name:`*WOOF*`}]})
    }
    console.log(`woof_mode: ${woof_mode}`)
  }
  //mention mode command
  if (interaction.commandName === 'mention-mode') {
    timerMode = false;
    clearTimeout(timerID);
    const input = interaction.options.get(`on-off`)?.value;
    if (input == null) {mentionMode = !mentionMode}else {mentionMode = input}
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
    console.log(`starting timer: ${timerStopSecs} sec`);
    timerMode= true;
    clearTimeout(timerID);
    timerID = setTimeout(function(){timerEnded()}, timerStop);
    }
    console.log(`mention mode: ${mentionMode} called by ${interaction.member.displayName}`);
  }
  //imagine command
  if (interaction.commandName === 'imagine') {
    await interaction.deferReply();
    let image_prompt = interaction.options.get(`prompt`).value;
    console.log(`image prompt by @${interaction.member.displayName}: ${image_prompt}`)
    try {
      let image_url = await generateImage(image_prompt)
      console.log(image_url)
      await interaction.editReply("*woof*\n" + image_prompt)
      //await interaction.followUp(image_url)
      await interaction.channel.send(image_url)
    } catch (error) {
      console.log(`error: ${error}`)
      await interaction.editReply(`"${image_prompt}" Really? *woof* No, I don't think so`)
    }
  }
  //reimagine avatar command
  if (interaction.commandName === 'reimagine') {
    await interaction.deferReply();
    let image_prompt = interaction.options.get(`prompt`)?.value;
    let avatar_url = `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
    console.log(`avatar variation by @${interaction.member.displayName}, \navatar url: ${avatar_url}`)
    await downloadImage(avatar_url, "./temp.png")
    try {
      if (image_prompt == null) {
        let image_url = await generateImageVariation("temp.png")//avatar_url)
        console.log(`avatar url: ${image_url}\n`)
        await interaction.editReply(`*woof*\n${interaction.user.username}`)
        await interaction.channel.send(image_url)
      } else {
        console.log(`image prompt by @${interaction.member.displayName}: ${image_prompt}\n`)
        let image_url = await editImage("temp.png", image_prompt)
        console.log(`avatar url: ${image_url}\n`)
        await interaction.editReply(`*woof*\n${interaction.user.username} (${image_prompt})`)
        await interaction.channel.send(image_url)
      }
    } catch (error) {
      console.log(`error: ${error}`)
      await interaction.editReply(`"${image_prompt}" Really? *woof* No, I don't think so`)
    }
  }
});

//----------------------- Log in -----------------------// 
client.login(process.env.BOT_TOKEN);

// initial settings
const DEFAULT_MEMORY = 5; // How many messages can be read for conversation context
let BOT_CHANNEL = process.env['DEFAULT_GUILD_ID']; // Default channel
let woof_mode = false; // Dog mode
let pets = 0;  // pet counter
let mentionMode = false; // respond to messages with mention
let sleeping = false; // tag (@) to wake / tag (@) + sleep to sleep
let timerStopSecs = 100;// seconds to timeout 
let timerStop = timerStopSecs * 1000; 
let timerMode = false;

// Prompts for OpenAI
let JS0N = "Json";
let OTHERS = "friends";
let standard_behaviour_prompt = `The following is a conversation on discord between ${JS0N} and ${OTHERS}. ${JS0N} types *woof* or *sniff* frequently. `;
let standard_prompt = standard_behaviour_prompt + `${JS0N} is a small greek dog of the kokoni breed. His name, Jason, is the english translation of his original name, 'Ιάσονας'. Online, he goes by ${JS0N}. He very much loves when you pet him, demands to be fed, barks when mad, etc. He will beg you for a treat. He is friendly and excited. He just sniffs and licks others as a way of greeting them by typing *sniff* and then their name. He is confident. He is not very self-aware. He has secretly learned to type on this owner's phone on discord. He also speaks a little greek. His older brother ,named 'Nikitas', is also a kokoni.\n\n`;
let standard_prompt1 = `The following is an online chat conversation on discord between ${OTHERS} and ${JS0N}. ${JS0N} is... .\n\n`; // Template prompt
let woof_prompt = `${JS0N} is a dog \n\n`;
let treat_prompt = standard_behaviour_prompt + ` Right now, ${JS0N} has just been given a treat and is about to *eat* it. He is very happy about it.\n\n`;
let pet_prompt = standard_behaviour_prompt + `Right now, ${JS0N} is being pet and visibly enjoys.\n\n`;
let treat_obssesive_prompt = standard_prompt + `Although the others may want to give ${JS0N} a treat, thehe never actually get it in the end. Even when someone says that they are giving him a treat they never actually do it. Dispite this, ${JS0N} never gives up and keeps beging for treats anyways, not knowing that he can't get one. Though he only talk about treats if you tease him and bring it up\n\n`;
const jsonVar = ['Json', 'json', 'JSON', 'jason', 'Jason', 'JASON', 'ιάσον', 'Ιάσον', 'ιασον', 'Ιασον']; // mention mode triger words
let default_prompt = standard_prompt;
let prompt = default_prompt;

let timerID// = setTimeout(function(){} ,1);

// On Message
client.on(Events.MessageCreate, async (message) => {

  // random chance to respond
  const rng = Math.floor(Math.random() * 420)
  nice = false
  if(rng == 69){ 
    nice = true  // rng bypass
    BOT_CHANNEL = message.channel.id  
    sleeping = false
    mentionMode = true
    woof_mode = false
    console.log("-_-_-_-_-_-_-_-_-_-_ GOD SEED _-_-_-_-_-_-_-_-_-_-")
  }
// Return if message unwanted
  if (message.author.bot) return 
  if (sleeping || message.channel.id !== BOT_CHANNEL) {
    if (message.mentions.users.has(client.user.id)) {
      console.log("Mention by", message.member.displayName, " on ", message.guild.name, `\nwaking up\n`)
      client.user.setPresence({ activities: [{name:`*woof*`}]})
      
      let temp_message;
      if(!woof_mode){
        temp_message = "Did I hear my name? *sniff*";
      }else{
        temp_message = "*WOOF*";
      }
      await message.reply(temp_message);
      sleeping = false;
      mentionMode = false;
      BOT_CHANNEL = message.channel.id;

      console.log(`starting timer: ${timerStopSecs} sec`)
      timerMode= true;
      clearTimeout(timerID);
      timerID = setTimeout(function(){timerEnded()}, timerStop);
    };
    return;
  }
  if (message.mentions.users.has(client.user.id) && message.content.includes(`sleep`)) {
    console.log("Mention by", message.member.displayName, " on ", message.guild.name, `\nback to sleep\n`)
    client.user.setPresence({ activities: [{name:`*Zzzz*`}]})
     if(!woof_mode){
        temp_message = "Feeling tired *sigh* going back to sleep"
      }else{
        temp_message = "*woof*"
      }
    message.reply(temp_message)
    sleeping = true
    clearTimeout(timerID);
    return
  }

  if (message.channel.id !== BOT_CHANNEL) return
  const isMention = message.mentions.users.has(client.user.id) || jsonVar.some(word => message.content.includes(word));

  if (mentionMode && !isMention && !nice) return;
 
  if(timerMode){
    clearTimeout(timerID);
    timerID = setTimeout(function(){timerEnded()}, timerStop); // new message, reset timer for mention mode
    console.log(`reset timer: ${timerStopSecs} sec`)
  }else if( isMention && !mentionMode) {
    console.log(`starting timer: ${timerStopSecs} sec`)
    timerMode = true;
    timerID = setTimeout(function(){timerEnded()}, timerStop)
  }
  if(!mentionMode && !timerMode){
    return
  }



  // Response Generation
  message.channel.sendTyping() 

  if (!woof_mode) {
    try {
      // message history
      let messages = Array.from(await message.channel.messages.fetch({
        limit: DEFAULT_MEMORY,
        before: message.id
      }))
      messages = messages.map(m => m[1])
      messages.unshift(message)
      let users = [...new Set([...messages.map(m => m.member.displayName), client.user.username])]
      users.pop()
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]
        prompt += `${m.member.displayName}: ${m.content}\n`
        //console.log(`${m.member.displayName}: ${m.content}\n`)
      }
      prompt += `${client.user.username}:`
      await message.channel.send(await generateResponse(prompt))
    } catch (error) {
      console.log(`------- error in message history: ${error} -------`)
      await message.channel.send(":face_with_spiral_eyes: !")
      return
    }
  } else {
    // Woof mode
    prompt = woof_prompt + `${JS0N}: *sniffs* ${message.member.displayName}\n${JS0N}: *licks* ${message.member.displayName}\n${JS0N}: *woof*\n`
    prompt += `${client.user.username}:`
     try {
      await message.channel.send(await generateResponseWM(prompt))
    } catch (error) {
      console.log(`error: ${error}`)
      await message.channel.send(":face_with_spiral_eyes: !")
      sleeping = true
    }
  }
  // reset prompt
  prompt = default_prompt;
  // When timer runs out
  function timerEnded(){
    console.log("timer ran out");
    timerMode = false;    
  }
})

//OpenAI functions

// Completion
async function generateResponse(p) {
  console.log("---starting generation---------------------------------------")
  console.log("Prompt: ", p)

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    p,
    temperature: 0.85,
    max_tokens: 500,
    top_p: 1,
    frequency_penalty: 1.6,
    presence_penalty: 0.6,
    stop: ["\n"]
  })

  console.log("\nResponse: ", response.data.choices[0].text)
  console.log("---ending generation-----------------------------------------")
  return response.data.choices[0].text
}
// Completion Woof Mode
async function generateResponseWM(prompt) {
  console.log("---starting generation---------------------------------------")
  console.log("Prompt: ", prompt)

  const response = await openai.createCompletion({
    model: "text-babbage-001",
    prompt,
    temperature: 0.8,
    max_tokens: 300,
    top_p: 1,
    frequency_penalty: 2,
    presence_penalty: 2,
    stop: ["\n"]
  })

  console.log("\nResponse: ", response.data.choices[0].text)
  console.log("---ending generation-----------------------------------------")
  return response.data.choices[0].text
}

// Edit text
async function iterate(i) {
  console.log("iteration: \ninput: ", i)

  const response = await openai.createEdit({
    model: "text-davinci-edit-001",
    input: i,
    instruction: "use different words",
    temperature: 0.90,
    top_p: 0.95,
  });

  console.log("response", response.data.choices[0].text)
  return response.data.choices[0].text
}

// Generate image
async function generateImage(p) {
  const response = await openai.createImage({
    prompt: p,
    n: 1,
    size: "1024x1024",
  });
  console.log("img url", response.data.data[0].url)
  return response.data.data[0].url
}
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

