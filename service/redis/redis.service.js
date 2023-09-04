const redisClient = require('../../config/redis/redis.config');


const redisService = {
    addToConversation:  (role, content, guildId) => {
        const message = { role, content };
        const conversationKey = `${guildId}:conversation:${Date.now()}`;
        const expirationInSeconds = 180; // 3 minutes
        
        redisClient.lPush(conversationKey, JSON.stringify(message), (error, result) => {
            if (error) {
                console.error('Redis - addToConversation - lPush - Error adding message to conversation:', error);
            } else {
                console.log('Redis - Message added to conversation:', result);
            }

            redisClient.expire(conversationKey, expirationInSeconds, (expireError, expireResult) => {
                if (expireError) {
                    console.error('Redis - addToConversation - expired Error setting expiration for conversation key:', expireError);
                } else {
                    console.log('Redis - Expiration set for conversation key:', expireResult);
                }
            });
        })
    },
    followUpWithOlderResponse: async (guildId) => {

        const conversationKeys = await redisClient.keys(`${guildId}:conversation:*`);

        const conversationList = []

        for(let i = 0; i < conversationKeys.length; i++) {
            const conversation = await redisClient.lRange(conversationKeys[i], 0, -1);
            conversationList.push(conversation)
        }

        return conversationList
      }
    
}

module.exports = redisService;