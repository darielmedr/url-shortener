import { AttributeMap, Converter } from "aws-sdk/clients/dynamodb";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { randomUUID } from "crypto";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

function getDbInstance() {
  const db = new DynamoDB({});
  const tableName = process.env.TABLE_NAME || "TABLE_NAME";

  return { db, tableName };
}

function getRequestPath(requestContext: Record<string, string>): string {
  const path = requestContext.path || "/";
  const endsWithPathSeparator = path.endsWith("/");

  return endsWithPathSeparator ? path : `${path}/`;
}

async function createShortUrl(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const { targetUrl } = event.queryStringParameters ?? {};

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Usage: ?targetUrl=<URL>",
      }),
    };
  }

  const { db, tableName } = getDbInstance();
  const id = randomUUID();

  await db.putItem({
    TableName: tableName,
    Item: {
      id: { S: id },
      targetUrl: { S: targetUrl },
    },
  });

  const { domainName } = event.requestContext;
  const path = getRequestPath(
    event.requestContext as unknown as Record<string, string>
  );
  const url = `https://${domainName}${path}${id}`;

  return {
    statusCode: 200,
    body: JSON.stringify({
      url,
      message: `URL created: ${url}`,
    }),
  };
}

async function readShortUrl(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const { db, tableName } = getDbInstance();

  const id = event.pathParameters?.proxy;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid request",
      }),
    };
  }

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

  const attributeMap: AttributeMap = {
    targetUrl,
  };

  return {
    statusCode: 301, // Redirect
    headers: {
      Location: Converter.unmarshall(attributeMap).targetUrl,
    },
  };
}

export const urlShortenerHandler: ProxyHandler = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  const { targetUrl } = event.queryStringParameters ?? {};

  if (targetUrl) {
    return createShortUrl(event);
  }

  const { proxy } = event.pathParameters ?? {};

  if (proxy) {
    return readShortUrl(event);
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Usage: ?targetUrl=<URL>",
    }),
  };
};
