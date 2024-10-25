const handler = async (event) => {
  console.log(JSON.stringify(event, null, 4));
  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: 'world',
      test: 3,
    }),
  };
};

module.exports = {
  handler,
};
