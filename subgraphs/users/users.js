const {getDirectives, mapSchema, MapperKind} = require('@graphql-tools/utils')
const {defaultFieldResolver} = require('graphql')

const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const { ApolloServerPluginUsageReporting } = require("apollo-server-core");


const resolvers = {
  Query:{
    getRandomUser: (product, args, context) => {
      return {email: 'support@apollographql.com', name: 'Ujjawal', totalProductsCreated: 5};
  }
  },
  User: {
      __resolveReference: (reference) => {
          // return msdUserDetailsResolver()
          return users.find(u => u.email == reference.email);
      }
  }
}
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
            const upperDirective = getDirectives(schema, fieldConfig, directiveName)?.[0];
            if (upperDirective) {
              // Get this field's original resolver
              const { resolve = defaultFieldResolver } = fieldConfig;
              // Replace the original resolver with a function that *first* calls
              // the original resolver, then converts its result to upper case
              fieldConfig.resolve = async function (source, args, context, info) {
                let result
                result = await resolve(source, args, context, info);
                // const typeName = source['__typename']
                // if(typeName !== undefined){
                //   const res = resolvers?.[typeName]?.['__resolveReference']?.(source)?.[_fieldName]
                //   console.log('xyz', res)
                //   return res
                // }

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

const APOLLO_RESOLVE_REFERENCE_FIELD_NAME = '__resolveReference';
const APOLLO_FIELD_NAME_PREFIX = '__';

function fixApolloResolvers(
  schema,
  resolvers,
  apolloFields = [APOLLO_RESOLVE_REFERENCE_FIELD_NAME],
) {
  const apolloFieldsSet = new Set(apolloFields);

  const typeMap = schema.getTypeMap();
  // console.log('typeMap', typeMap)
  for (const [name, type] of Object.entries(typeMap)) {
    const typeResolvers = resolvers[name];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeResolvers) {
      const apolloResolverFieldNames = Object.keys(typeResolvers).filter(
        (fieldName) => apolloFieldsSet.has(fieldName),
      );

      for (const apolloResolverFieldName of apolloResolverFieldNames) {
        const trimmedName = apolloResolverFieldName.substring(
          APOLLO_FIELD_NAME_PREFIX.length,
        );

        const apolloResolver = (typeResolvers)[apolloResolverFieldName];
        (type)[trimmedName] = apolloResolver;
      }
    }
  }
}


const upperDirectiveTransformer = authDirective(['upper'])
  .upperDirectiveTransformer

const users = [
    { email: 'support@apollographql.com', name: "Apollo Studio Support", totalProductsCreated: 4 }
]

const typeDefs = gql(readFileSync('./users.graphql', { encoding: 'utf-8' }));




const schema = buildSubgraphSchema({ typeDefs, resolvers })
const updatedSchema = upperDirectiveTransformer(schema)
fixApolloResolvers(updatedSchema, resolvers,  [APOLLO_RESOLVE_REFERENCE_FIELD_NAME])

const server = new ApolloServer({ schema:  updatedSchema});
server.listen( {port: port} ).then(({ url }) => {
  console.log(`🚀 Users subgraph ready at ${url}`);
}).catch(err => {console.error(err)});
