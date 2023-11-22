const chalk = require("chalk");
const openai = require("../../config/openAI")
const redisService = require("../redis/redis.service");
const { log } = require("../../config/log/log.config");
const fs = require('node:fs');
const path = require("node:path");
const RainePrompt = require("../../Raine_prompt_system.json")
const { numTokensFromString } = require("../../utils/index");
const weatherService = require("./functionList/weather.func");
const gpt = require("./gptFeature")
const listFunc = require("./functionList/index")
class GptService {
  constructor() {
    this.promptMessage = []
    this.promptMessageFunc = []
    this.promptMessageTTS = []
    this.loyalSystem = { role: "system", content: process.env.RAINE_PROMPT_LOYAL }
    // this.llm_model = "gpt-3.5-turbo"
    this.llm_model = "gpt-4"
    this.llm_max_tokens = 4097
  }
  async ask (promptContent, data, maxTokenEachScript, curUser, ConversationPrompt, lan) {
    try {
      log(chalk.blue.bold(`prompt:(${lan})`), promptContent);
      let guildID = data.guildID
      let loyal = false
      if(curUser.id === process.env.OWNER_ID) loyal = true

      // prepare data system for conversation prompt
      const { countSystem, conversation:preparedConversation } = await gpt.prepare_system_prompt(this.promptMessage, ConversationPrompt, promptContent, curUser, loyal, "en")
      this.promptMessageFunc = preparedConversation

      const { conversation, completion } = await gpt.callGPT("gpt-3.5-turbo", 0, this.promptMessageFunc, maxTokenEachScript, countSystem, guildID, lan)
      this.promptMessage = conversation

      const content = completion.choices[0].message.content

      return ({ status: 200, data: content })
    } catch(error) {
      log(error)
      return ({status: 500, error: error})
    }

  }

  async askTTS (promptContent, data, maxTokenEachScript, curUser, ConversationPrompt, lan, guildID) {
    try {
      log(chalk.blue.bold(`prompt:(${lan})`), promptContent);
      let guildID = data.guildID
      let loyal = false
      if(curUser.id === process.env.OWNER_ID) loyal = true

      // prepare data system for conversation prompt
      const { countSystem, conversation:preparedConversation } = await gpt.prepare_system_prompt(this.promptMessageTTS, ConversationPrompt, promptContent, curUser, loyal, lan)
      this.promptMessageTTS = preparedConversation
      
      // Ask OpenAI
      const { conversation, completion } = await gpt.callGPT("gpt-4", 0.7, this.promptMessageFunc, maxTokenEachScript, countSystem, guildID, lan)
      this.promptMessage = conversation

      const content = completion.choices[0].message.content
  
      return ({ status: 200, data: content })
    } catch(error) {
      return ({status: 500, error: error})
    }

  }

  async askImage (promptContent, qty = 1) {

    log(chalk.blue.bold("prompt:"), promptContent);
    try {
      const response = await openai.images.generate({
        prompt: promptContent,
        n: qty,
        size: "1024x1024",
      });
  
      return ({status: 200, data: response.data})
    } catch (error) {
      return ({status: 500, error: error})
    }
    
  }

  // async editImage() {
  //   try {
  //     const commandsPath = path.join(__dirname, '../../assert/image/image_edit_original.png');
  //     const mask = path.join(__dirname, '../../assert/image/image_edit_mask.png');
  
  //     console.log("commandsPath", commandsPath)
  //     const image = await openai.images.edit({
  //       image: fs.createReadStream(commandsPath),
  //       mask: fs.createReadStream(mask),
  //       prompt: "A cute baby sea otter wearing a beret",
  //     });
    
  //     console.log(image.data);
  //     return image
      
  //   } catch (error) {
  //     console.log(error)
  //     return ({status: 500, error: error})
  //   }
  // }

  async translate(promptContent, maxTokenEachScript) { 

    let promptList = [
      {role: "system", content: process.env.TRANSLATE_PROMPT},
      { role: "user", content: promptContent}
    ]

    log(chalk.blue.bold("prompt:"), promptContent);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: promptList,
        temperature: 0,
        max_tokens: maxTokenEachScript,
      });

      const content = completion.choices[0].message.content
      return ({ status: 200, data: content })
      
    } catch (error) {
      log(error)
      return ({status: 500, data: error})
    }
  }

  async functionCalling (promptContent, data, maxTokenEachScript, curUser, ConversationPrompt, lan, guildID, isTalk = false) {
    try {
      log(chalk.blue.bold(`prompt:(${lan})`), promptContent);
      // const getCurrentWeather = async (location) => {
      //   return weatherService.getByLocation(location)
      //   .then(res => {
      //     const newData = res.data
      //     const raineWeatherPrompt = RainePrompt[lan].weather

      //     if(newData) {
      //       const data = {
      //         content: `
      //         ${raineWeatherPrompt}: 
      //         ${JSON.stringify(newData)}
      //         `,
      //         role: "user"
      //       }

      //       log("Weather prompt:", data)

      //       return {
      //         have_content: true,
      //         data: data
      //       }
      //     } else {
      //       return {
      //         have_content: false,
      //         data: null
      //       }
      //     }
      //   })
      // }

      let loyal = true

      // prepare data system for conversation prompt
      const { countSystem, conversation:preparedConversation } = await gpt.prepare_system_prompt(this.promptMessageFunc, ConversationPrompt, promptContent, curUser, loyal, lan, isTalk)
      this.promptMessageFunc = preparedConversation

      let retry = 0

      while(true) {
        
        log(chalk.green.bold("------------------ REQUEST ------------------"));
  
        const { conversation, completion } = await gpt.callGPT("gpt-4", 1, this.promptMessageFunc, maxTokenEachScript, countSystem, guildID, lan, true, listFunc)
  
        this.promptMessageFunc = conversation
  
        // process function calling from tools
        const responseMessage = completion.choices[0].message

        log(chalk.green.bold("Finish_reason"), completion.choices[0].finish_reason )

        if(responseMessage.function_call?.name === "get_current_weather") {
          const args = JSON.parse(responseMessage.function_call.arguments)
          const location = args.location

          log(chalk.green.bold("---> GPT ask to call Weather API with location: "), location);
          
          const weatherData = await weatherService.getByLocation(location, lan)

          if(!weatherData.have_content) {
            retry ++
            if(retry < 3) {
              continue
            } else {
              return ({ status: 200, data: "Sorry, I can't find the weather for this location"})
            }
          } else {
            this.promptMessageFunc.push(weatherData.data)
          }


        } else if(completion.choices[0].finish_reason === "stop") {
          return ({ status: 200, data: completion.choices[0].message.content })
        }

      }  
    } catch(error) {
      log(error)
      return ({status: 500, error: error})
    }

  }
}


module.exports = GptService
