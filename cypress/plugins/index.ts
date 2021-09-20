// / <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
import graphql = require("graphql-request");

module.exports = async (on, config) => {
  // make env variables visible for cypress
  config.env.API_URI = process.env.API_URI;
  config.env.APP_MOUNT_URI = process.env.APP_MOUNT_URI;
  config.env.mailHogUrl = process.env.CYPRESS_MAILHOG;
  config.env.SHOP = await getShopInfo(process.env);

  on("before:browser:launch", (browser = {}, launchOptions) => {
    launchOptions.args.push("--proxy-bypass-list=<-loopback>");
    return launchOptions;
  });
  return config;
};

function getShopInfo(envVariables) {
  // envVariables.CYPRESS_USER_NAME
  const variables = {
    email: envVariables.CYPRESS_USER_NAME,
    password: envVariables.CYPRESS_USER_PASSWORD
  };

  const createTokenMutation = graphql.gql`mutation tokenCreate($email: String!, $password: String!){
    tokenCreate(email:$email, password:$password){
      token
    }
  }`;

  const getShopInfoQuery = graphql.gql`query{
    shop{
      version
    }
  }`;

  const client = new graphql.GraphQLClient(envVariables.API_URI, {
    headers: {}
  });
  return client.request(createTokenMutation, variables).then(data => {
    const token = data.tokenCreate.token;
    client.setHeader("Authorization", `JWT ${token}`);
    return client
      .request(getShopInfoQuery)
      .then(shopInfo => shopInfo.shop.version);
  });
}