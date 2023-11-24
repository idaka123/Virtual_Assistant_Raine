require("dotenv").config();
const axios = require("axios")
const { log } = require("../../../../config/log/log.config")
const { client, Collection, Events } = require("../../../../config/discord/bot.config") 
const chalk = require("chalk")
const schedule = require('node-schedule');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
client.login(TOKEN);
class reminderService {
  constructor() {
    this.list_job = {}
    this.createReminderFuncSpec = {
      "name": "create_reminder",
      "description": "Remind user to do something after a period of time or at a specific time, if user do not provide what to do, it will ask user to provide",
      "parameters": {
          "type": "object",
          "properties": {
              "what_to_do": {
                  "type": "string",
                  "description": "The task that user want to be reminded",
              },
              "time": {
                  "type": "string",
                  "description": "The time that user want to remind, can be a period of time or a specific time, example if user want to be reminded after 1 hour, please take 1 hour, do not take the word 'after'",
              },
              "repeat": {
                  "type": "boolean",
                  "description": "repeating the reminder or not",
              }
          },
          "required": ["task", "time"],
      }
    }
    this.deleteReminderFuncSpec = {

    }
  }

  convertTime(time) {
    const minutesPattern = /\b(\d+)\s*(m|minutes|minute)\b/i;
    const hoursPattern = /\b(\d+)\s*(h|hours|hour)\b/i;
    const secondsPattern = /\b(\d+)\s*(s|seconds|second)\b/i;
    const daysPattern = /\b(\d+)\s*(d|days|day)\b/i;
    const monthsPattern = /\b(\d+)\s*(months|month|mo)\b/i;
   
    if(secondsPattern.test(time)) {
        const seconds = `*/${time.match(secondsPattern)[1]} * * * * *`;
        return {
            time: seconds,
        };
    } else if(minutesPattern.test(time)) {
        const minutes = `*/${time.match(minutesPattern)[1]} * * * *`;
        return {
            time: minutes,
        };
    } else if(hoursPattern.test(time)) {
        const hours = `0 */${time.match(hoursPattern)[1]} * * *`;
        return {
            time: hours,
        };
    }
    else if(daysPattern.test(time)) {
        const days = `0 0 */${time.match(daysPattern)[1]} * *`;
        return {
            time: days,
        };
    }
    else if(monthsPattern.test(time)) {
      const months = `0 0 0 */${time.match(daysPattern)[1]} *`;
        return {
            time: months,
        };
    }
    else {
        return {
            time: undefined,
            msg: 'This is not a measure of time'
        };
    }
  }

  async deleteJob(task) {
    if (this.list_job[task]) {
      this.list_job[task].cancel();
      delete this.list_job[task];
      console.log(`Job ${task} cancelled`);
    } else {
        console.log(`Job ${task} not found`);
    }
  }

  async createJob(task, time, repeat = false) {
    const self = this;
      try {
        console.log("Cron is ready");
        time = self.convertTime(time)
        if(time.time === undefined) throw new Error("Time is not valid")
        console.log(time.time)
        this.list_job[task] = schedule.scheduleJob(task, time.time, async () => {
          const channelID = process.env.CHANNEL_CRON_ID
          const channel = client.channels.cache.get(channelID);

          if (channel) {
            channel.send(task);
            if(!repeat){
              schedule.cancelJob(task);
              await self.deleteJob(task)
            }
          }
        });


      } catch (error) {
        log(chalk.red.bold("[ERROR API]: ____REMINDER-SET-TIME___ "), error)
      
      }
  }
  

}

const Service = new reminderService()
// console.log(Service.convertTime("1 hour"))
// Service.createJob("have dinner", "2 seconds", true)
// Service.createJob("clean body", "*/4 * * * * *", true)



// setTimeout(() => {
//   console.log(Service.list_job)
// }, 5000)


module.exports = reminderService