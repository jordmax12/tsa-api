/* eslint-disable complexity */
const { generateBadRequestResponse, validateAddToBanListRequest: validateRequest } = require('requests-adaptor');
const { addToBanList } = require('./controllers/ban-list');
const { getFinalUsernames } = require('./helpers/add-to-ban-list');

const handler = async ({ body: bodyRaw }) => {
  console.info(JSON.stringify(bodyRaw, null, 4));
  const body = bodyRaw && JSON.parse(bodyRaw);

  const validatedRequest = validateRequest(body);

  console.info({ validatedRequest });

  if (!validatedRequest.valid) {
    return generateBadRequestResponse(400, validatedRequest.error);
  }

  const { found_param: foundParam } = validatedRequest;

  const { habboName, discordId } = body;

  console.info({
    habboName,
    discordId,
  });

  const finalUserNamesLogic = await getFinalUsernames(foundParam, discordId, habboName);

  console.info({
    finalUserNamesLogic,
  });

  if (!finalUserNamesLogic.success) {
    return finalUserNamesLogic?.error || generateBadRequestResponse(404);
  }

  const { data: finalUserNames } = finalUserNamesLogic;

  console.info({ finalUserNames });

  const { description, scammedAmount, scammedHabbo } = body;

  const promises = finalUserNames.map(async (userName) => {
    const result = await addToBanList(userName, description, scammedHabbo, scammedAmount);
    return result;
  });

  await Promise.all(promises);

  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: 'world',
    }),
  };
};

module.exports = {
  handler,
};
