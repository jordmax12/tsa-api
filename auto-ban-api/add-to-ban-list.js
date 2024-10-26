const { addToBanList } = require('./controllers/ban-list');
const {
  generateBadRequestResponse,
  getFinalUsernames,
  validateAddToBanListRequest: validateRequest,
} = require('./helpers/requests');

const handler = async ({ body: bodyRaw }) => {
  console.info(JSON.stringify(bodyRaw, null, 4));
  const body = bodyRaw && JSON.parse(bodyRaw);

  const validatedRequest = validateRequest(body);

  console.info({ validatedRequest });

  if (!validatedRequest.valid) {
    return generateBadRequestResponse(400, 'Missing one of required params: `habboName` or `discordId`');
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
