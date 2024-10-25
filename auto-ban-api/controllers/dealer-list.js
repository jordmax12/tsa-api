const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument, DeleteCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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
 * @param {String} amountPaid Amount user paid for DE (optional).
 * @returns Dealer list object that was created in DB.
 */
const addToDealerList = async (name, amountPaid) => {
  const dealerListObj = {
    id: name, // NOTE: Could make this a UUID, but I think name is fine.
    name,
    ...(amountPaid && { amount_paid: amountPaid }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const params = {
    TableName: DEALER_LIST_TABLE,
    ConditionExpression: `attribute_not_exists(session_id)`,
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

module.exports = {
  addToDealerList,
  removeFromDealerList,
  scanDealerList,
};
