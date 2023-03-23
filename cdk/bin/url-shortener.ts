#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { UrlShortenerStack } from "../lib/url-shortener-stack";

const app = new App();
new UrlShortenerStack(app, "UrlShortenerStack");
app.synth();
