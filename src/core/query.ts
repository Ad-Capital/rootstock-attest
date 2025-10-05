import { QueryOptions } from '../types';
import { devLog } from '../utils/logger';

export class QueryService {
  private graphqlEndpoint: string;

  constructor(graphqlEndpoint: string) {
    this.graphqlEndpoint = graphqlEndpoint;
  }

  async queryAttestations(options: QueryOptions = {}): Promise<any[]> {
    try {
      const query = this.buildGraphQLQuery(options);
      devLog.debug(`GraphQL Query: ${query}`);

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
      }

      const result = (await response.json()) as {
        data?: { attestations: any[] };
        errors?: any[];
      };

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      devLog.info(
        `Found ${result.data?.attestations.length || 0} attestations`
      );
      return result.data?.attestations || [];
    } catch (error) {
      devLog.error('Failed to query attestations', error as Error);
      throw error;
    }
  }

  async querySchemas(
    options: { creator?: string; limit?: number } = {}
  ): Promise<any[]> {
    try {
      const query = this.buildSchemaQuery(options);
      devLog.debug(`Schema Query: ${query}`);

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
      }

      const result = (await response.json()) as {
        data?: { schemas: any[] };
        errors?: any[];
      };

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      devLog.info(`Found ${result.data?.schemas.length || 0} schemas`);
      return result.data?.schemas || [];
    } catch (error) {
      devLog.error('Failed to query schemas', error as Error);
      throw error;
    }
  }

  private buildGraphQLQuery(options: QueryOptions): string {
    const conditions = [];

    if (options.schema) {
      conditions.push(`schemaId: "${options.schema}"`);
    }

    if (options.recipient) {
      conditions.push(`recipient: "${options.recipient}"`);
    }

    if (options.attester) {
      conditions.push(`attester: "${options.attester}"`);
    }

    const whereClause =
      conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : '';
    const limitClause = options.limit
      ? `first: ${options.limit}`
      : 'first: 100';
    const offsetClause = options.offset ? `skip: ${options.offset}` : '';

    return `
      query {
        attestations(${[whereClause, limitClause, offsetClause].filter(Boolean).join(', ')}) {
          id
          uid
          schema {
            id
            schema
          }
          recipient
          attester
          time
          timeCreated
          revocationTime
          expirationTime
          revocable
          data
          decodedDataJson
        }
      }
    `;
  }

  private buildSchemaQuery(options: {
    creator?: string;
    limit?: number;
  }): string {
    const conditions = [];

    if (options.creator) {
      conditions.push(`creator: "${options.creator}"`);
    }

    const whereClause =
      conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : '';
    const limitClause = options.limit ? `first: ${options.limit}` : 'first: 50';

    return `
      query {
        schemas(${[whereClause, limitClause].filter(Boolean).join(', ')}) {
          id
          schema
          creator
          resolver
          revocable
          time
        }
      }
    `;
  }

  async getAttestationsByUID(uids: string[]): Promise<any[]> {
    try {
      const query = `
        query {
          attestations(where: { uid_in: [${uids.map((uid) => `"${uid}"`).join(', ')}] }) {
            id
            uid
            schema {
              id
              schema
            }
            recipient
            attester
            time
            timeCreated
            revocationTime
            expirationTime
            revocable
            data
            decodedDataJson
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
      }

      const result = (await response.json()) as {
        data?: { attestations: any[] };
        errors?: any[];
      };

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data?.attestations || [];
    } catch (error) {
      devLog.error('Failed to get attestations by UID', error as Error);
      throw error;
    }
  }
}
