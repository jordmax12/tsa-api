const { config } = require('config-adaptor');
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
      error: 'Missing one of required params: `habboName` or `discordId`',
    };
  }

  return {
    valid: true,
    found_param: foundParam,
  };
};
/**
 * Helper function to validate a add to dealer list request.
 * @param {Object} body Body from REST Api event.
 * @param {Array} requiredParams Required params.
 * @returns Object containing valid boolean and any missing required params.
 */
const validateAddToDealertRequest = (body) => {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Invalid request body',
    };
  }

  const requiredParams = ['username', 'rank'];
  const foundParam = requiredParams.filter((param) => param in body);

  if (foundParam.length !== requiredParams.length) {
    return {
      valid: false,
      error: 'Missing required params: `username` and `rank`',
    };
  }

  const { rank } = body;

  const validRanks = config.dealer_ranks;
  if (!(rank in validRanks)) {
    return {
      valid: false,
      error: `Invalid rank. Must be one of: ${validRanks.map((_rank) => `"${_rank}"`).join(' or ')}`,
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

module.exports = {
  generateBadRequestResponse,
  validateAddToBanListRequest,
  validateAddToDealertRequest,
};
