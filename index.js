const request = require('request-promise');

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.handler = async (event, context) => {
  const dest = getEndpoint(event.path);
  const token = await getToken();
  const results = await osuResults(token, event.queryStringParameters, dest);
  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(results)
  };

  return response;
};

const getEndpoint = path => {
  switch (path) {
    case '/locations':
      return 'locations';
    case '/people':
      return 'directory';
    default:
      return null;
  }
};

const requestedData = (items, dest) => {
  return items.map(item => {
    if (dest === 'locations') {
      let image = null;
      if (item.attributes.thumbnails.length > 0) {
        image = item.attributes.thumbnails[0];
      }
      return {
        id: item.id,
        name: item.attributes.name,
        image,
        link: item.attributes.website
      };
    } else if (dest === 'directory') {
      return {
        id: item.id,
        firstName: item.attributes.firstName,
        lastName: item.attributes.lastName,
        department: item.attributes.department
      };
    } else {
      return item;
    }
  });
};

const osuResults = async (auth, query, dest) => {
  const apiResponse = await request({
    method: 'GET',
    url: `https://api.oregonstate.edu/v1/${dest}?q=${query.q}`,
    auth: { bearer: auth },
    json: true
  });
  return requestedData(apiResponse.data, dest);
};

const getToken = async () => {
  // Use this code snippet in your app.
  // If you need more information about configurations or implementing the sample code, visit the AWS docs:
  // https://aws.amazon.com/developers/getting-started/nodejs/
  // Load the AWS SDK
  const AWS = require('aws-sdk');
  const region = 'us-west-2';
  const secretName = 'osusearch/apigeeToken';

  // Create a Secrets Manager client
  const client = new AWS.SecretsManager({
    region: region
  });

  // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
  // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
  // We rethrow the exception by default.
  const data = await client
    .getSecretValue({ SecretId: secretName })
    .promise()
    .catch(err => {
      logError(err);
      throw err;
    });
  if (data.SecretString) {
    return JSON.parse(data.SecretString).Token;
  }
  const buff = new Buffer(data.SecretBinary, 'base64');
  return JSON.parse(buff.toString('ascii')).Token;
};

const logError = err => {
  if (err.code === 'DecryptionFailureException') {
    console.error('Failed with DecryptionFailureException');
    console.error(
      "Secrets Manager can't decrypt the protected secret text using the provided KMS key."
    );
    // Deal with the exception here, and/or rethrow at your discretion.
  } else if (err.code === 'InternalServiceErrorException') {
    console.error('Failed with InternalServiceErrorException');
    console.error('An error occurred on the server side.');
    // Deal with the exception here, and/or rethrow at your discretion.
  } else if (err.code === 'InvalidParameterException') {
    console.error('Failed with InvalidParameterException');
    console.error('You provided an invalid value for a parameter.');
    // Deal with the exception here, and/or rethrow at your discretion.
  } else if (err.code === 'InvalidRequestException') {
    console.error('Failed with InvalidRequestException');
    console.error(
      'You provided a parameter value that is not valid for the current state of the resource.'
    );
    // Deal with the exception here, and/or rethrow at your discretion.
  } else if (err.code === 'ResourceNotFoundException') {
    console.error('Failed with ResourceNotFoundException');
    console.error("We can't find the resource that you asked for.");
    // Deal with the exception here, and/or rethrow at your discretion.
  } else {
    console.error(`Unrecognized error: ${err.code}`);
  }
};
