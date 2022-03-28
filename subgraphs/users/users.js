// Open Telemetry (optional)
const { ApolloOpenTelemetry } = require('supergraph-demo-opentelemetry');
const {getDirectives, mapSchema, MapperKind} = require('@graphql-tools/utils')

if (process.env.APOLLO_OTEL_EXPORTER_TYPE) {
  new ApolloOpenTelemetry({
    type: 'subgraph',
    name: 'users',
    exporter: {
      type: process.env.APOLLO_OTEL_EXPORTER_TYPE, // console, zipkin, collector
      host: process.env.APOLLO_OTEL_EXPORTER_HOST,
      port: process.env.APOLLO_OTEL_EXPORTER_PORT,
    }
  }).setupInstrumentation();
}

const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');

const port = process.env.APOLLO_PORT || 4000;
function authDirective(directiveName) {
  const typeDirectiveArgumentMaps = {}

  return {
    upperDirectiveTransformer: (schema) => {
      return mapSchema(schema, {
        [MapperKind.TYPE]: (type) => {
          const authDirective = getDirectives(schema, type, directiveName)?.[0]
          if (authDirective) {
            typeDirectiveArgumentMaps[type.name] = authDirective
          }
          return undefined
        },

        [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
      

            const upperDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

            if (upperDirective) {
      
              // Get this field's original resolver
              const { resolve = defaultFieldResolver } = fieldConfig;
      
              // Replace the original resolver with a function that *first* calls
              // the original resolver, then converts its result to upper case
              fieldConfig.resolve = async function (source, args, context, info) {
                const result = await resolve(source, args, context, info);
                if (typeof result === 'string') {
                  return result.toUpperCase();
                }
                return result;
              }
              return fieldConfig;
            }
          }
        })
      }}
}

const upperDirectiveTransformer = authDirective(['upper'])
  .upperDirectiveTransformer

const users = [
    { email: 'support@apollographql.com', name: "Apollo Studio Support", totalProductsCreated: 4 }
]

const typeDefs = gql(readFileSync('./users.graphql', { encoding: 'utf-8' }));

const resolvers = {
    User: {
        __resolveReference: (reference) => {
          console.log('vgvg', reference )
            return { email: 'support@apollographql.com', name: "Apollo Studio Support", totalProductsCreated: 4 }
            return users.find(u => u.email == reference.email);
        }
    }
}
const schema = buildSubgraphSchema({ typeDefs, resolvers })
const server = new ApolloServer({ schema:  schema});
server.listen( {port: port} ).then(({ url }) => {
  console.log(`🚀 Users subgraph ready at ${url}`);
}).catch(err => {console.error(err)});
