import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

function getDbInstance() {
  const db = new DynamoDB({});
  const tableName = process.env.TABLE_NAME || "TABLE_NAME";

  return { db, tableName };
}

async function createShortUrl(event: any): Promise<unknown> {
  const { db, tableName } = getDbInstance();

  const id = randomUUID();
  const { targetUrl } = event.queryStringParameters;

  await db.putItem({
    TableName: tableName,
    Item: {
      id: { S: id },
      targetUrl: { S: targetUrl },
    },
  });

  const { domainName, path } = event.requestContext;
  const url = `https://${domainName}${path}${id}`;

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `URL created: ${url}`,
    }),
  };
}

async function readShortUrl(event: any): Promise<unknown> {
  const { db, tableName } = getDbInstance();

  const { id } = event.pathParameters?.proxy;

  const item = await db.getItem({
    TableName: tableName,
    Key: {
      id: { S: id },
    },
    AttributesToGet: ["targetUrl"],
  });

  const targetUrl = item.Item?.targetUrl;

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `No target URL found for ${id}`,
      }),
    };
  }

  return {
    statusCode: 301, // Redirect
    headers: {
      Location: targetUrl,
    },
  };
}

export async function urlShortenerHandler(event: any): Promise<unknown> {
  const { queryParams } = event?.queryStringParameters ?? {};

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Usage: ?targetUrl=<URL>",
    }),
  };

  if (queryParams?.targetUrl) {
    return createShortUrl(event);
  }

  const { pathParams } = event.pathParameters;

  if (pathParams?.proxy) {
    return readShortUrl(event);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Usage: ?targetUrl=<URL>",
    }),
  };
}
