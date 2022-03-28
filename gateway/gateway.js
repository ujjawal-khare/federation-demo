// Open Telemetry (optional)
const { ApolloOpenTelemetry } = require('supergraph-demo-opentelemetry');
const {serializeQueryPlan} = require('@apollo/query-planner');

if (process.env.APOLLO_OTEL_EXPORTER_TYPE) {
  new ApolloOpenTelemetry({
    type: 'router',
    name: 'router',
    exporter: {
      type: process.env.APOLLO_OTEL_EXPORTER_TYPE, // console, zipkin, collector
      host: process.env.APOLLO_OTEL_EXPORTER_HOST,
      port: process.env.APOLLO_OTEL_EXPORTER_PORT,
    }
  }).setupInstrumentation();
}

// Main
const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { readFileSync } = require('fs');

const port = process.env.APOLLO_PORT || 4000;
const embeddedSchema = process.env.APOLLO_SCHEMA_CONFIG_EMBEDDED == "true" ? true : false;

const config = {};

if (embeddedSchema || true){
  const supergraph = "../supergraph.graphql"
  config['supergraphSdl'] = readFileSync(supergraph).toString();
  console.log('Starting Apollo Gateway in local mode ...');
  console.log(`Using local: ${supergraph}`)
} else {
  console.log('Starting Apollo Gateway in managed mode ...');
}

const gateway = new ApolloGateway({...config, experimental_didResolveQueryPlan: function(options) {
  if (options.requestContext.operationName !== 'IntrospectionQuery') {
    console.log(serializeQueryPlan(options.queryPlan));
  }
}});

const server = new ApolloServer({
  gateway,
  debug: true,
  // Subscriptions are unsupported but planned for a future Gateway version.
  subscriptions: false
});

server.listen( {port: 4001} ).then(({ url }) => {
  console.log(`🚀 Graph Router ready at ${url}`);
}).catch(err => {console.error(err)});
