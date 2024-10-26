const { config } = require('config-adaptor');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument, DeleteCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const { BAN_LIST_TABLE, DYNAMO_DB_ENDPOINT, REGION } = process.env;
const dynamoDbClient = new DynamoDBClient({
  endpoint: DYNAMO_DB_ENDPOINT,
  region: REGION,
  sslEnabled: true,
  apiVersion: '2012-08-10',
  convertEmptyValues: true,
});

const CLIENT = DynamoDBDocument.from(dynamoDbClient);
/**
 * Helper function to add a user to ban list.
 * @param {String} habboName Name of user that is being banned.
 * @param {String} description Description of the incident.
 * @param {String} scammedHabbo Name of user that was scammed (Optional).
 * @param {String} scammedAmount Amount that was scammed (Optional).
 * @returns Ban list object that was created in DB.
 */
const addToBanList = async (habboName, description, scammedHabbo, scammedAmount) => {
  const baseBanListObj = {
    id: habboName, // NOTE: Could make this a UUID, but I think habboName is fine.
    habbo_name: habboName,
    description: description || 'N/A',
    ...(scammedHabbo && { scammed_habbo: scammedHabbo }),
    ...(scammedAmount && { scammed_amount: scammedAmount }),
    arcade_id: config.ARCADE_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const params = {
    TableName: BAN_LIST_TABLE,
    ConditionExpression: `attribute_not_exists(id)`,
    Item: baseBanListObj,
  };

  try {
    await CLIENT.send(new PutCommand(params));
    return baseBanListObj;
  } catch (e) {
    console.error(e);
    return null;
  }
};
/**
 * Helper function to remove a user from th ban list.
 * @param {String} id ID that was created when we created the ban list object in DDB.
 * @returns True if successful, false if not.
 */
const removeFromBanList = async (id) => {
  try {
    const params = {
      TableName: BAN_LIST_TABLE,
      Key: {
        id,
      },
    };
    await CLIENT.send(new DeleteCommand(params));
    return true;
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
};
/**
 * Helper function to get the ban list.
 * @returns Results from DDB if exists.
 */
const scanBanList = async () => {
  const params = {
    TableName: BAN_LIST_TABLE,
  };

  try {
    const result = await CLIENT.send(new ScanCommand(params));
    return result.Items;
  } catch (error) {
    console.error('Error getting all QR codes:', error);
    return [];
  }
};

module.exports = {
  addToBanList,
  removeFromBanList,
  scanBanList,
};
