import { QueryService } from '../../core/query';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('QueryService', () => {
  let queryService: QueryService;
  const mockEndpoint = 'https://test-graphql.endpoint';

  beforeEach(() => {
    queryService = new QueryService(mockEndpoint);
    mockFetch.mockClear();
  });

  describe('queryAttestations', () => {
    it('should query attestations with filters', async () => {
      const mockResponse = {
        data: {
          attestations: [
            {
              id: 'test-id',
              uid: '0x123',
              recipient: '0x456',
              attester: '0x789',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const options = {
        recipient: '0x456',
        limit: 10,
      };

      const result = await queryService.queryAttestations(options);

      expect(mockFetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('recipient: \\\"0x456\\\"'),
      });

      expect(result).toEqual(mockResponse.data.attestations);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'GraphQL error' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(queryService.queryAttestations()).rejects.toThrow(
        'GraphQL errors'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Network Error',
      } as Response);

      await expect(queryService.queryAttestations()).rejects.toThrow(
        'GraphQL request failed: Network Error'
      );
    });
  });

  describe('querySchemas', () => {
    it('should query schemas with creator filter', async () => {
      const mockResponse = {
        data: {
          schemas: [
            {
              id: 'schema-id',
              schema: 'string field1, uint256 field2',
              creator: '0x123',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await queryService.querySchemas({
        creator: '0x123',
        limit: 25,
      });

      expect(mockFetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('creator: \\\"0x123\\\"'),
      });

      expect(result).toEqual(mockResponse.data.schemas);
    });
  });

  describe('getAttestationsByUID', () => {
    it('should get attestations by UID list', async () => {
      const mockResponse = {
        data: {
          attestations: [
            {
              uid: '0x123',
              recipient: '0x456',
            },
            {
              uid: '0x789',
              recipient: '0xabc',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const uids = ['0x123', '0x789'];
      const result = await queryService.getAttestationsByUID(uids);

      expect(mockFetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('\\\"0x123\\\", \\\"0x789\\\"'),
      });

      expect(result).toEqual(mockResponse.data.attestations);
    });
  });
});
