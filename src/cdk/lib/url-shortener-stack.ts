import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class UrlShortenerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dbTable = new Table(this, "UrlShortenerTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      tableName: process.env.TABLE_NAME || "url_shortener",
      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const handlerFn = new NodejsFunction(this, "UrlShortenerFn", {
      functionName: "UrlShortenerFn",
      runtime: Runtime.NODEJS_18_X,
      handler: "urlShortenerHandler",
      entry: join(__dirname, "/../../lambdas/url-shortener-handler.ts"),
      bundling: {
        minify: true,
      },
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    const getFnIntegration = new LambdaIntegration(handlerFn);

    const api = new RestApi(this, "UrlShortenerApi", {
      restApiName: "Url Shortener",
      description: "Url shortener",
    });

    api.root.addMethod("GET", getFnIntegration);

    dbTable.grantReadWriteData(handlerFn);
  }
}
