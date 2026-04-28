// backend/src/services/merkle.service.js
// NEW — Stage 3
//
// Builds Merkle trees from daily transaction hashes (off-chain),
// then anchors only the root to the AuditTrail contract once per day.
// Users can verify any individual tx with a Merkle proof.
//
// Uses the same keccak256 hashing that OpenZeppelin MerkleProof.sol expects.

const crypto    = require('crypto');
const { ethers } = require('ethers');

// ── Build tree from leaves ────────────────────────────────────────────────────

/**
 * Hash a leaf the same way OpenZeppelin MerkleProof expects:
 * keccak256(keccak256(abi.encode(leaf))) — double-hash prevents second preimage attacks
 * For simplicity we use keccak256(leaf_hex_bytes) which is standard.
 */
const hashLeaf = (hexString) => {
  const bytes  = Buffer.from(hexString.replace('0x', ''), 'hex');
  return ethers.keccak256(bytes);
};

const hashPair = (a, b) => {
  // Sort so tree is deterministic regardless of insert order
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([lo, hi]));
};

/**
 * Build a Merkle tree from an array of hex leaf hashes.
 * @param {string[]} leaves  Array of hex strings (transaction chainHashes)
 * @returns {{ root: string, tree: string[][] }}
 */
const buildMerkleTree = (leaves) => {
  if (!leaves || leaves.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaves');
  }

  // Pad to even number
  let layer = leaves.map(hashLeaf);
  if (layer.length % 2 !== 0) {
    layer.push(layer[layer.length - 1]); // duplicate last leaf
  }

  const tree = [layer];

  while (layer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < layer.length; i += 2) {
      nextLayer.push(hashPair(layer[i], layer[i + 1] || layer[i]));
    }
    tree.push(nextLayer);
    layer = nextLayer;
  }

  return {
    root: layer[0],
    tree,
    leaves: leaves.map(hashLeaf), // hashed leaves (stored for proof generation)
  };
};

/**
 * Generate a Merkle proof for a specific leaf.
 * @param {string[]} leaves   Original array of leaf hex strings (same order as buildMerkleTree)
 * @param {string}   leaf     The specific leaf to prove (original hex string)
 * @returns {string[]}  Proof array (hex strings) to pass to verifyProof()
 */
const getMerkleProof = (leaves, leaf) => {
  const { tree, leaves: hashedLeaves } = buildMerkleTree(leaves);

  const leafHash = hashLeaf(leaf);
  let   index    = hashedLeaves.indexOf(leafHash);

  if (index === -1) {
    throw new Error('Leaf not found in tree');
  }

  const proof = [];
  for (const layer of tree.slice(0, -1)) {
    // Pad layer to even length (same as build step)
    const paddedLayer = [...layer];
    if (paddedLayer.length % 2 !== 0) paddedLayer.push(paddedLayer[paddedLayer.length - 1]);

    const pairIndex = index % 2 === 0 ? index + 1 : index - 1;
    if (pairIndex < paddedLayer.length) {
      proof.push(paddedLayer[pairIndex]);
    }
    index = Math.floor(index / 2);
  }

  return proof;
};

/**
 * Verify a Merkle proof locally (mirrors OpenZeppelin's MerkleProof.verify).
 * Useful for backend verification before hitting the contract.
 * @param {string}   root   Merkle root
 * @param {string[]} proof  Proof array
 * @param {string}   leaf   Original leaf hex string
 * @returns {boolean}
 */
const verifyMerkleProof = (root, proof, leaf) => {
  let computed = hashLeaf(leaf);
  for (const proofElement of proof) {
    computed = hashPair(computed, proofElement);
  }
  return computed === root;
};

/**
 * Format a date as YYYY-MM-DD string for batch date keys.
 * @param {Date} date
 */
const formatBatchDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

module.exports = {
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
  formatBatchDate,
  hashLeaf,
};