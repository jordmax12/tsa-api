const axios = require('axios');

const { LEGACY_API_ENDPOINT, LEGACY_API_KEY } = process.env;
/**
 * Helper function to call legacy API and get user data by discordId.
 * @param {String} discordId Discord ID of user.
 * @returns Data from legacy API from fetching by discordId.
 */
const discordIdLookup = async (discordId) => {
  try {
    const response = await axios.get(LEGACY_API_ENDPOINT, {
      params: {
        discordId,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: LEGACY_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error.response ? error.response.data : error.message);
    return null;
  }
};

module.exports = {
  discordIdLookup,
};
