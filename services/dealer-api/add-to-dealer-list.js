/* eslint-disable complexity */
const { generateBadRequestResponse, validateAddToDealertRequest: validateRequest } = require('requests-adaptor');
const { getDealerById, updateDealerRank, addToDealerList } = require('./controllers/dealer-list');

const handler = async ({ body: bodyRaw }) => {
  console.info(JSON.stringify(bodyRaw, null, 4));
  const body = bodyRaw && JSON.parse(bodyRaw);

  const validatedRequest = validateRequest(body);

  console.info({ validatedRequest });

  if (!validatedRequest.valid) {
    return generateBadRequestResponse(400, validatedRequest.error);
  }

  const { username, rank, discordId, soldFor } = body;

  console.log({
    username,
    rank,
    discordId,
    soldFor,
  });

  const dealer = await getDealerById(username);
  // NOTE: If dealer exists we update the rank
  if (dealer) {
    const { rank: dealerRank } = dealer;

    if (dealerRank === rank) {
      return generateBadRequestResponse(404, 'Dealer is already in the list with this ranking, and not fired.');
    }

    const updateResult = await updateDealerRank(
      username,
      rank,
      soldFor || dealer.amount_paid || 'N/A',
      discordId || dealer.discord_id || 'N/A'
    );

    if (!updateResult) {
      // NOTE: this shouldnt ever happen because the Condition Expression shouldnt
      // ever fail since we already check to see if the dealer exists by searching
      // by id above. But just to be safe.
      return generateBadRequestResponse(404, 'Unknown error, see developer.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        new_dealer: false,
      }),
    };
  }

  const addResult = await addToDealerList(username, rank, soldFor);

  if (!addResult) {
    // NOTE: this shouldnt ever happen because the Condition Expression shouldnt
    // ever fail since we already check to see if the dealer exists by searching
    // by id above. But just to be safe.
    return generateBadRequestResponse(404, 'Unknown error, see developer.');
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      new_dealer: true,
    }),
  };
};

module.exports = {
  handler,
};
