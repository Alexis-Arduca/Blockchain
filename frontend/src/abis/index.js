export const COUNTER_ABI = [
  "function increment() external",
  "function reset() external",
  "function getCount(address account) external view returns (uint256)",
];

export const FACTORY_ABI = [
  "function createAccount(address owner, uint256 salt) external returns (address)",
  "function getAddress(address owner, uint256 salt) public view returns (address)",
  "function isDeployed(address owner, uint256 salt) external view returns (bool)",
];

export const SMART_ACCOUNT_ABI = [
  "function owner() external view returns (address)",
  "function addSessionKey(address key, uint256 expiry, bytes4[] calldata selectors) external",
  "function revokeSessionKey(address key) external",
  "function isSessionKeyValid(address key) external view returns (bool)",
  "function isSessionKeyAllowed(address key, bytes4 selector) external view returns (bool)",
  "function execute(address target, uint256 value, bytes calldata data) external",
  "event SessionKeyAdded(address indexed key, uint256 expiry)",
  "event SessionKeyRevoked(address indexed key)",
];

export const ENTRY_POINT_ABI = [
  "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] calldata ops, address payable beneficiary) external",
  "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) calldata userOp) external view returns (bytes32)",
  "function getNonce(address sender, uint192 key) external view returns (uint256)",
  "function depositTo(address account) external payable",
  "function balanceOf(address account) external view returns (uint256)",
];

export const ADDRESSES = {
  entryPoint:   "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  counter:      "0x047a4E69D72A7f7a2456E4D1AC496A17853433c5",
  factory:      "0x26C85BEf1CC11eDa697d45abeD338BA7a13e92a6",
  smartAccount: "0x2468eC39505A4F624C109e994ac7eb9a24184313",
  owner:        "0x4dF61d872F428623A82602547c3E756888822e42",
};

export const INCREMENT_SELECTOR = "0xd09de08a";