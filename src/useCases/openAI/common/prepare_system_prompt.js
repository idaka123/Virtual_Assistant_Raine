
const RainePrompt = require("../../../assets/Raine_prompt_system.json")

module.exports = () => {
  const execute = async ({
    conversation,
    oldConversation,
    userPrompt,
    curUser,
    loyal,
    lang,
    isTalk = false,
  }) => {
    let countSystem = 0
    let loyalSystem = { role: 'system', content: RainePrompt["en"].loyal }
    let systemTTS = { role: 'system', content: RainePrompt["en"].system_tts }
    let taskRemind = { role: 'system', content: RainePrompt["en"].task }
    let dalle = { role: 'system', content: RainePrompt["en"].dalle }

    const date = new Date()
    const currentDate =
      date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()

    if (RainePrompt["en"]) {
      conversation[0] = {
        role: 'system',
        content: `
          Current date: ${currentDate}
          Response to user by this language: ${lang}
          ${RainePrompt["en"].system}`,
      }
      conversation.push(dalle)

      countSystem +=2
    }

    conversation.push(taskRemind)
    countSystem++

    // check user boss on Discord
    if (curUser) {
      const userResponse = {
        role: 'system',
        content: `You know who you are talking to, and this is the person's name talking to you: ${curUser}`,
      }
      conversation.push(userResponse)
      countSystem++
    }

    if (loyal) {
      conversation.push(loyalSystem)
      ++countSystem
    }

    if (isTalk) {
      conversation.push(systemTTS)
      ++countSystem
    }

    // prepare data for conversation
    const newMsg = { role: 'user', content: userPrompt }
    if (oldConversation && oldConversation.length > 0) {
      conversation = [...conversation, ...oldConversation]
    }
    conversation.push(newMsg)

    return {
      countSystem,
      conversation,
    }
  }

  return { execute }
}
