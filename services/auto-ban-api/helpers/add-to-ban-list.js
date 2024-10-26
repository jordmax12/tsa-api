const { discordIdLookup } = require('legacy-api-adaptor');
const { generateBadRequestResponse } = require('./requests');

/**
 * Helper function to getFinalUsernames from request.
 * @param {String} foundParam The found (one of) required params for this request.
 * @param {String} discordId If exists, the discordId supplied in the request.
 * @param {String} userName If exists, the habboName supplied in the request.
 * @returns Array of final user names ready to be added.
 */
// eslint-disable-next-line complexity
const getFinalUsernames = async (foundParam, discordId, userName) => {
  const finalUserNames = [];
  if (foundParam === 'discordId') {
    const discordData = await discordIdLookup(discordId);

    console.info({
      discordData,
    });

    if (!discordData?.accounts || !Array.isArray(discordData.accounts) || discordData.accounts.length === 0) {
      return { success: false, error: generateBadRequestResponse(404, 'Discord account not found.') };
    }

    finalUserNames.push(discordData.accounts[0].habboName);
  } else {
    const userNames = userName.includes('/') ? userName.split('/').map((name) => name.trim()) : [userName.trim()];
    finalUserNames.push(...userNames);
  }

  return { success: true, data: finalUserNames };
};

module.exports = {
  getFinalUsernames,
};
