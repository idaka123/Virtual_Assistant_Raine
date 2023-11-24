const axios = require("axios")
const RainePrompt = require("../../../Raine_prompt_system.json")
const log = require("../../../config/log/log.config")
const { convertDates } = require("../../../utils/index")

const weatherService = {
    callAPI: async (url, params, lang) => {
      return await axios({
        method: 'post',
        url: url,
        params: params,
        headers: {
          'Content-Type': 'application/json'
        }
    })
    .then(res => {
      const newData = res.data
      const raineWeatherPrompt = RainePrompt[lang].weather

      if(params.hour === undefined) { 
        newData.forecast.forecastday[0].hour = []
      }

      if(newData) {
        const data = {
          content: `
          ${raineWeatherPrompt}: 
          ${JSON.stringify(newData)}
          `,
          role: "user"
        }

        console.log("Weather prompt:", data)

        return {
          have_content: true,
          data: data
        }
      } else {
        return {
          have_content: false,
          data: null
        }
      }
    })
    .catch(err => {
      console.log(err)
      return {
        have_content: false,
        data: {
          content: `Error Occur: ${err}`,
        }
      }
    })
    },
    getByLocation: async (q, lang="en", time, date="" ) => {

		// call weather api
        const weatherURL = process.env.WEATHER_ORIGIN_URL
        const weatherAPIKEY = process.env.WEATHER_API_KEY
        const url = `${weatherURL}/forecast.json`

        if(time === "current") {
          const currentDate = new Date();
          const currentHour = currentDate.getHours();
          time = currentHour

          const params = {
            q: q,
            key: weatherAPIKEY,
            lang: lang,
            hour: time
          }
          const dataWeather = await weatherService.callAPI(url, params, lang)
          return dataWeather
        }
        else {
          const today = new Date()
          const tomorrow = today.setDate(today.getDate() + 1)
          if(date === "tomorrow") {
            date = convertDates(tomorrow)
            console.log("-----> Date Convert when it prompt asking for tomorrow", date)
          }

          const params = {
            q: q,
            key: weatherAPIKEY,
            lang: lang,
            hour: time,
            date: date
          }
          
          const dataWeather = await weatherService.callAPI(url, params, lang)
          return dataWeather
        }
        
   
    },
    weatherFuncSpec: {
    name: "get_current_weather",
    description: "Get the current weather in a given location",
    parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
            location: {
                type: "string",
                description: "The city and state, e.g. Ho Chi Minh",
                pattern: "^[a-zA-Z]+(?:[\\s-][a-zA-Z]+)*$", // regex for city name
            },
            time: { 
                type: "string", 
                description: "The specific time of the day, format: 0-23, the morning zone is from 0-11, the afternoon zone is from 12-23, this a optional field",
                enum: ["current", "0", "1",  "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"]
            },
            date: {
                type: "string", 
                description: "tomorrow, today, default is today or any day of the week, the day must be in the future",
            },
        },
        required: ["location", "date"],
    },
}
}

module.exports = weatherService











