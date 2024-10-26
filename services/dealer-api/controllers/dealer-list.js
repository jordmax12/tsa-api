const { config } = require('config-adaptor');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocument,
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const { DEALER_LIST_TABLE, DYNAMO_DB_ENDPOINT, REGION } = process.env;

const dynamoDbClient = new DynamoDBClient({
  endpoint: DYNAMO_DB_ENDPOINT,
  region: REGION,
  sslEnabled: true,
  apiVersion: '2012-08-10',
  convertEmptyValues: true,
});

const CLIENT = DynamoDBDocument.from(dynamoDbClient);
/**
 * Helper function to add a user to dealer list.
 * @param {String} name Name of user that is being added.
 * @param {String} rank Dealer rank enum, see config.ranks.
 * @param {String} soldFor Amount user paid for DE (optional).
 * @returns Dealer list object that was created in DB.
 */
const addToDealerList = async (name, rank, soldFor) => {
  const dealerListObj = {
    id: name, // NOTE: Could make this a UUID, but I think name is fine.
    name,
    rank,
    fired: false,
    arcade_id: config.ARCADE_ID,
    // added_by_id: addedById, NOTE: I notice we arent ever filling this, so when we do leaving this here.
    ...(soldFor && { sold_for: soldFor }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const params = {
    TableName: DEALER_LIST_TABLE,
    ConditionExpression: `attribute_not_exists(id)`,
    Item: dealerListObj,
  };

  try {
    await CLIENT.send(new PutCommand(params));
    return dealerListObj;
  } catch (e) {
    console.error(e);
    return null;
  }
};
/**
 * Helper function to get dealer from db by id.
 * @param {String} id ID of dealer.
 * @returns If dealer exists returns dealer item from DB, otherwise null.
 */
const getDealerById = async (id) => {
  const params = {
    TableName: DEALER_LIST_TABLE,
    Key: {
      id,
    },
  };

  const result = await CLIENT.send(new GetCommand(params));
  return result?.Item || null;
};
/**
 * Helper function to remove a user from the dealer list.
 * @param {String} id ID that was created when we created the dealer list object in DDB.
 * @returns True if successful, false if not.
 */
const removeFromDealerList = async (id) => {
  try {
    const params = {
      TableName: DEALER_LIST_TABLE,
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
 * Helper function to get the dealer list.
 * @returns Results from DDB if exists.
 */
const scanDealerList = async () => {
  const params = {
    TableName: DEALER_LIST_TABLE,
  };

  try {
    const result = await CLIENT.send(new ScanCommand(params));
    return result.Items;
  } catch (error) {
    console.error('Error getting all QR codes:', error);
    return [];
  }
};
/**
 * Helper function to update dealer rank by id.
 * @param {String} id ID of dealer in DB.
 * @param {String} rank Rank we are updating.
 * @param {String} soldFor how much upgrade was sold for.
 * @param {String} discordId dealers discordId.
 * @returns Results of DDB.update, if error null.
 */
const updateDealerRank = async (id, rank, soldFor, discordId) => {
  const params = {
    TableName: DEALER_LIST_TABLE,
    Key: {
      id,
    },
    ConditionExpression: `attribute_exists(id)`,
    UpdateExpression:
      'SET #rank = :rank, #amount_paid = :amount_paid, #discord_id = :discord_id, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#rank': 'rank',
      '#amount_paid': 'amount_paid',
      '#discord_id': 'discord_id',
      '#updated_at': 'updated_at',
    },
    ExpressionAttributeValues: {
      ':rank': rank,
      ':amount_paid': soldFor,
      ':discord_id': discordId,
      ':updated_at': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const results = await CLIENT.send(new UpdateCommand(params));
    return results;
  } catch (e) {
    return null;
  }
};
/**
 * Helper function to update a dealers last join time.
 * @param {String} id Dealers ID in the DB.
 * @param {String} lastJoin Last join date (ISO 8601 format), Optional: defaults to now.
 * @returns Result of DDB.Update if successful, null if not.
 */
const updateLastJoin = async (id, lastJoin = new Date().toISOString()) => {
  const params = {
    TableName: DEALER_LIST_TABLE,
    Key: {
      id,
    },
    ConditionExpression: `attribute_exists(id)`,
    UpdateExpression: 'SET #last_join = :last_join, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#last_join': 'last_join',
      '#updated_at': 'updated_at',
    },
    ExpressionAttributeValues: {
      ':last_join': lastJoin,
      ':updated_at': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const results = await CLIENT.send(new UpdateCommand(params));
    return results;
  } catch (e) {
    return null;
  }
};

module.exports = {
  addToDealerList,
  getDealerById,
  removeFromDealerList,
  scanDealerList,
  updateDealerRank,
  updateLastJoin,
};
