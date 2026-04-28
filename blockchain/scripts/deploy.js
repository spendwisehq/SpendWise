// blockchain/scripts/deploy.js
// Deploys all 5 SpendWise contracts and writes addresses to
// deployed-addresses.json so the backend can read them at startup.

const { ethers } = require('hardhat');
const path  = require('path');
const fs    = require('fs');

// Charity wallet — replace with a real charity address on mainnet
// For testnet, we use the deployer address itself
const CHARITY_WALLET = process.env.CHARITY_WALLET_ADDRESS || null;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SpendWise Contract Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${ethers.formatEther(balance)} MATIC\n`);

  if (balance === 0n) {
    console.error('❌ Deployer has no MATIC. Fund the wallet first.');
    process.exit(1);
  }

  const charityAddress = CHARITY_WALLET || deployer.address;
  console.log(`  Charity wallet: ${charityAddress}\n`);

  const addresses = {};

  // ── 1. AuditTrail ───────────────────────────────────────────────────────
  console.log('📦 Deploying AuditTrail...');
  const AuditTrail       = await ethers.getContractFactory('AuditTrail');
  const auditTrail       = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  addresses.auditTrail   = await auditTrail.getAddress();
  console.log(`   ✅ AuditTrail deployed at: ${addresses.auditTrail}`);

  // ── 2. FinancialScoreCert ───────────────────────────────────────────────
  console.log('📦 Deploying FinancialScoreCert...');
  const FinancialScoreCert     = await ethers.getContractFactory('FinancialScoreCert');
  const financialScoreCert     = await FinancialScoreCert.deploy();
  await financialScoreCert.waitForDeployment();
  addresses.financialScoreCert = await financialScoreCert.getAddress();
  console.log(`   ✅ FinancialScoreCert deployed at: ${addresses.financialScoreCert}`);

  // ── 3. GroupSettlement ──────────────────────────────────────────────────
  console.log('📦 Deploying GroupSettlement...');
  const GroupSettlement       = await ethers.getContractFactory('GroupSettlement');
  const groupSettlement       = await GroupSettlement.deploy();
  await groupSettlement.waitForDeployment();
  addresses.groupSettlement   = await groupSettlement.getAddress();
  console.log(`   ✅ GroupSettlement deployed at: ${addresses.groupSettlement}`);

  // ── 4. SpendWiseBudgetCommitment ────────────────────────────────────────
  console.log('📦 Deploying SpendWiseBudgetCommitment...');
  const BudgetCommitment     = await ethers.getContractFactory('SpendWiseBudgetCommitment');
  const budgetCommitment     = await BudgetCommitment.deploy(charityAddress);
  await budgetCommitment.waitForDeployment();
  addresses.budgetCommitment = await budgetCommitment.getAddress();
  console.log(`   ✅ BudgetCommitment deployed at: ${addresses.budgetCommitment}`);

  // ── 5. FinancialPassport ────────────────────────────────────────────────
  console.log('📦 Deploying FinancialPassport...');
  const FinancialPassport     = await ethers.getContractFactory('FinancialPassport');
  const financialPassport     = await FinancialPassport.deploy();
  await financialPassport.waitForDeployment();
  addresses.financialPassport = await financialPassport.getAddress();
  console.log(`   ✅ FinancialPassport deployed at: ${addresses.financialPassport}`);

  // ── Save addresses ──────────────────────────────────────────────────────
  const output = {
    network:     network.name,
    chainId:     network.chainId.toString(),
    deployer:    deployer.address,
    deployedAt:  new Date().toISOString(),
    contracts:   addresses,
  };

  // Write to blockchain/deployed-addresses.json
  const outPath = path.join(__dirname, '..', 'deployed-addresses.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n📄 Addresses saved to: ${outPath}`);

  // Also write a .env snippet for easy copy-paste
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Add these to backend/.env:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`BLOCKCHAIN_ENABLED=true`);
  console.log(`SPENDWISE_AUDIT_TRAIL_CONTRACT=${addresses.auditTrail}`);
  console.log(`SPENDWISE_FINANCIAL_SCORE_CONTRACT=${addresses.financialScoreCert}`);
  console.log(`SPENDWISE_GROUP_SETTLEMENT_CONTRACT=${addresses.groupSettlement}`);
  console.log(`SPENDWISE_BUDGET_COMMITMENT_CONTRACT=${addresses.budgetCommitment}`);
  console.log(`SPENDWISE_FINANCIAL_PASSPORT_CONTRACT=${addresses.financialPassport}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exitCode = 1;
});