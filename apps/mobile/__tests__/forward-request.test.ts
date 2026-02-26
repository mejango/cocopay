import {
  buildForwarderDomain,
  buildForwardRequestTypedData,
  encodeForwarderExecuteCalldata,
  FORWARD_REQUEST_TYPES,
  ForwardRequestMessage,
} from '../src/services/forwardRequest';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('buildForwarderDomain', () => {
  it('returns correct EIP-712 domain for Base', () => {
    const domain = buildForwarderDomain(8453);

    expect(domain.name).toBe('ERC2771Forwarder');
    expect(domain.version).toBe('1');
    expect(domain.chainId).toBe(8453);
    expect(domain.verifyingContract).toBe(
      '0xc29d6995ab3b0df4650ad643adeac55e7acbb566'
    );
  });

  it('uses different chainId for different chains', () => {
    const base = buildForwarderDomain(8453);
    const eth = buildForwarderDomain(1);

    expect(base.chainId).toBe(8453);
    expect(eth.chainId).toBe(1);
    expect(base.verifyingContract).toBe(eth.verifyingContract);
  });
});

describe('FORWARD_REQUEST_TYPES', () => {
  it('has correct type structure matching ERC-2771 ForwardRequest', () => {
    const fields = FORWARD_REQUEST_TYPES.ForwardRequest;
    expect(fields).toHaveLength(7);

    const names = fields.map((f) => f.name);
    expect(names).toEqual([
      'from',
      'to',
      'value',
      'gas',
      'nonce',
      'deadline',
      'data',
    ]);
  });

  it('uses uint48 for deadline (matching OpenZeppelin ForwarderV2)', () => {
    const deadline = FORWARD_REQUEST_TYPES.ForwardRequest.find(
      (f) => f.name === 'deadline'
    );
    expect(deadline?.type).toBe('uint48');
  });
});

describe('buildForwardRequestTypedData', () => {
  const baseParams = {
    chainId: 8453,
    from: '0x' + 'aa'.repeat(20),
    to: '0x' + 'bb'.repeat(20),
    data: '0xb61d27f6' + '00'.repeat(96),
    nonce: 0n,
  };

  it('returns domain, types, primaryType, and message', () => {
    const result = buildForwardRequestTypedData(baseParams);

    expect(result.domain).toBeDefined();
    expect(result.types).toBeDefined();
    expect(result.primaryType).toBe('ForwardRequest');
    expect(result.message).toBeDefined();
  });

  it('sets value to 0 by default', () => {
    const result = buildForwardRequestTypedData(baseParams);
    expect(result.message.value).toBe(0n);
  });

  it('uses default gas of 500_000', () => {
    const result = buildForwardRequestTypedData(baseParams);
    expect(result.message.gas).toBe(500_000n);
  });

  it('allows custom gas', () => {
    const result = buildForwardRequestTypedData({
      ...baseParams,
      gas: 1_000_000n,
    });
    expect(result.message.gas).toBe(1_000_000n);
  });

  it('sets a future deadline by default', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = buildForwardRequestTypedData(baseParams);
    const after = Math.floor(Date.now() / 1000);

    // Default deadline = now + 3600s
    expect(result.message.deadline).toBeGreaterThanOrEqual(before + 3600);
    expect(result.message.deadline).toBeLessThanOrEqual(after + 3600);
  });

  it('allows custom deadline', () => {
    const result = buildForwardRequestTypedData({
      ...baseParams,
      deadline: 9999999999,
    });
    expect(result.message.deadline).toBe(9999999999);
  });

  it('preserves from, to, data, and nonce', () => {
    const result = buildForwardRequestTypedData(baseParams);
    expect(result.message.from).toBe(baseParams.from);
    expect(result.message.to).toBe(baseParams.to);
    expect(result.message.data).toBe(baseParams.data);
    expect(result.message.nonce).toBe(0n);
  });
});

describe('encodeForwarderExecuteCalldata', () => {
  const request: ForwardRequestMessage = {
    from: '0x' + 'aa'.repeat(20),
    to: '0x' + 'bb'.repeat(20),
    value: 0n,
    gas: 500_000n,
    nonce: 0n,
    deadline: 1700000000,
    data: '0xb61d27f6' + '00'.repeat(96),
  };
  const signature = '0x' + 'cc'.repeat(65);

  it('starts with correct execute selector (0xd5aeaba5)', () => {
    const result = encodeForwarderExecuteCalldata(request, signature);
    expect(result).toMatch(/^0x/);
    expect(result.slice(2, 10)).toBe('d5aeaba5');
  });

  it('begins with tuple offset 0x20', () => {
    const result = encodeForwarderExecuteCalldata(request, signature);
    const tupleOffset = result.slice(10, 74);
    expect(tupleOffset).toBe('20'.padStart(64, '0'));
  });

  it('encodes from address in the first tuple slot', () => {
    const result = encodeForwarderExecuteCalldata(request, signature);
    // After selector (8) + tuple offset (64) = 72, from address is next 64
    const fromSlot = result.slice(74, 138);
    expect(fromSlot).toBe('aa'.repeat(20).padStart(64, '0'));
  });

  it('produces word-aligned calldata', () => {
    const result = encodeForwarderExecuteCalldata(request, signature);
    // ABI body after the 4-byte selector should be word-aligned (multiple of 32 bytes = 64 hex chars)
    const bodyAfterSelector = result.slice(10); // strip 0x (2) + selector (8)
    expect(bodyAfterSelector.length % 64).toBe(0);
  });

  it('encodes data and signature with correct lengths', () => {
    const result = encodeForwarderExecuteCalldata(request, signature);

    // The full calldata should contain the data length and sig length
    const dataBytes = request.data.replace('0x', '');
    const expectedDataLen = (dataBytes.length / 2)
      .toString(16)
      .padStart(64, '0');

    const sigBytes = signature.replace('0x', '');
    const expectedSigLen = (sigBytes.length / 2)
      .toString(16)
      .padStart(64, '0');

    expect(result).toContain(expectedDataLen);
    expect(result).toContain(expectedSigLen);
  });

  it('matches backend selector for forwarder.execute', () => {
    // Backend Eip712Service uses the same selector
    // keccak256("execute((address,address,uint256,uint256,uint48,bytes,bytes))")
    const result = encodeForwarderExecuteCalldata(request, signature);
    expect(result.slice(2, 10)).toBe('d5aeaba5');
  });
});
