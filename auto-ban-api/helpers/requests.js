const { discordIdLookup } = require('../controllers/legacyApi');

/**
 * Helper function to validate a add to ban list request.
 * @param {Object} body Body from REST Api event.
 * @param {Array} requiredParams Required params.
 * @returns Object containing valid boolean and any missing required params.
 */
const validateAddToBanListRequest = (body) => {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      missing_required_params: 'Invalid request body',
    };
  }

  const requiredOneOfParams = ['habboName', 'discordId'];
  const foundParam = requiredOneOfParams.find((param) => param in body);

  if (!foundParam) {
    return {
      valid: false,
      missing_one_of_required_params: ['habboName', 'discordId'],
    };
  }

  return {
    valid: true,
    found_param: foundParam,
  };
};
/**
 * Helper function to generate bad request response object.
 * @param {Number} statusCode Valid HTTP status code.
 * @param {String} message Optional, message to be sent with request.
 * @returns Formatted bad request resposse object.
 */
const generateBadRequestResponse = (statusCode, message = 'unknown error.') => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errors: {
      status: statusCode,
      message,
      code: 1009,
    },
  }),
});
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
  generateBadRequestResponse,
  getFinalUsernames,
  validateAddToBanListRequest,
};
